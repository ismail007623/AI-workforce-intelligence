from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.config import get_settings
from backend.app.models.attendance import AttendanceRecord, CheckInStatus
from backend.app.models.employee import Employee
from backend.app.models.late_reason import (
    EmployeeReliabilityScore,
    LateArrivalReason,
    LateReasonEvaluation,
)
from backend.app.utils.time_rules import today_in_tz


async def _late_count_month(session: AsyncSession, employee_db_id: int) -> int:
    today = today_in_tz()
    month_start = today.replace(day=1)
    result = await session.execute(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.employee_id == employee_db_id,
            AttendanceRecord.date >= month_start,
            AttendanceRecord.check_in_status == CheckInStatus.late,
        )
    )
    return int(result.scalar() or 0)


async def _absence_count_month(session: AsyncSession, employee_db_id: int) -> int:
    today = today_in_tz()
    month_start = today.replace(day=1)
    working_days = (today - month_start).days + 1
    result = await session.execute(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.employee_id == employee_db_id,
            AttendanceRecord.date >= month_start,
            AttendanceRecord.date <= today,
            AttendanceRecord.check_in_time.is_not(None),
        )
    )
    checked_in = int(result.scalar() or 0)
    return max(working_days - checked_in, 0)


async def _weak_invalid_counts_30d(session: AsyncSession, employee_db_id: int) -> tuple[int, int]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    result = await session.execute(
        select(LateReasonEvaluation.decision)
        .join(LateArrivalReason, LateArrivalReason.id == LateReasonEvaluation.late_reason_id)
        .where(
            LateArrivalReason.employee_id == employee_db_id,
            LateReasonEvaluation.evaluated_at >= cutoff,
        )
    )
    weak = invalid = 0
    for (decision,) in result.all():
        if decision == "Weak":
            weak += 1
        elif decision == "Invalid":
            invalid += 1
    return weak, invalid


async def _avg_risk_recent(session: AsyncSession, employee_db_id: int, limit: int = 5) -> float:
    result = await session.execute(
        select(LateReasonEvaluation.risk_score)
        .join(LateArrivalReason, LateArrivalReason.id == LateReasonEvaluation.late_reason_id)
        .where(LateArrivalReason.employee_id == employee_db_id)
        .order_by(LateReasonEvaluation.evaluated_at.desc())
        .limit(limit)
    )
    scores = [row[0] for row in result.all()]
    return sum(scores) / len(scores) if scores else 0.0


async def refresh_reliability_score(session: AsyncSession, employee_db_id: int) -> EmployeeReliabilityScore:
    settings = get_settings()
    late_count = await _late_count_month(session, employee_db_id)
    absence_count = await _absence_count_month(session, employee_db_id)
    weak_count, invalid_count = await _weak_invalid_counts_30d(session, employee_db_id)
    avg_risk = await _avg_risk_recent(session, employee_db_id)

    score = 100
    score -= late_count * settings.reliability_late_penalty
    score -= absence_count * settings.reliability_absence_penalty
    score -= weak_count * settings.reliability_weak_penalty
    score -= invalid_count * settings.reliability_invalid_penalty
    risk_penalty = min(settings.reliability_risk_cap, int(avg_risk / 5))
    score -= risk_penalty
    score = max(0, min(100, score))

    result = await session.execute(
        select(EmployeeReliabilityScore).where(EmployeeReliabilityScore.employee_id == employee_db_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        row = EmployeeReliabilityScore(employee_id=employee_db_id)
        session.add(row)

    row.reliability_score = score
    row.late_count_month = late_count
    row.absence_count_month = absence_count
    row.weak_reason_count_30d = weak_count
    row.invalid_reason_count_30d = invalid_count
    row.updated_at = datetime.now(timezone.utc)
    await session.flush()
    return row


async def get_reliability_score(session: AsyncSession, employee_db_id: int) -> int | None:
    result = await session.execute(
        select(EmployeeReliabilityScore.reliability_score).where(
            EmployeeReliabilityScore.employee_id == employee_db_id
        )
    )
    return result.scalar_one_or_none()


async def get_reliability_map(
    session: AsyncSession, me=None
) -> dict[int, int]:
    """Return employee_id -> reliability score, scoped to the caller.

    Args:
        session: The database session.
        me: The authenticated user, or None for an unscoped map
            (only used by internal callers that already filtered
            their employee list). Routers and services pass the
            caller so another org's scores never leak in.

    Returns:
        A mapping of Employee id to reliability score.
    """
    if me is None:
        result = await session.execute(select(EmployeeReliabilityScore))
        return {row.employee_id: row.reliability_score for row in result.scalars().all()}
    from backend.app.core.scoping import visible_user_ids

    result = await session.execute(
        select(EmployeeReliabilityScore).where(
            EmployeeReliabilityScore.employee_id.in_(visible_user_ids(session, me))
        )
    )
    return {row.employee_id: row.reliability_score for row in result.scalars().all()}
