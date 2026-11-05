from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.scoping import visible_user_ids
from backend.app.models.attendance import AttendanceRecord, CheckInStatus
from backend.app.models.employee import Employee
from backend.app.models.late_reason import LateArrivalReason, LateReasonEvaluation, LateReasonStatus
from backend.app.models.user import User
from backend.app.services import reliability_service
from backend.app.utils.time_rules import today_in_tz


async def requires_late_reason(session: AsyncSession, employee_db_id: int) -> bool:
    today = today_in_tz()
    record_result = await session.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee_db_id,
            AttendanceRecord.date == today,
            AttendanceRecord.check_in_status == CheckInStatus.late,
        )
    )
    record = record_result.scalar_one_or_none()
    if not record:
        return False

    reason_result = await session.execute(
        select(LateArrivalReason.id).where(LateArrivalReason.attendance_id == record.id)
    )
    return reason_result.scalar_one_or_none() is None


async def submit_late_reason(session: AsyncSession, employee_code: str, reason: str) -> dict:
    employee = await session.execute(
        select(Employee).where(Employee.employee_id == employee_code)
    )
    emp = employee.scalar_one_or_none()
    if emp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    today = today_in_tz()
    record_result = await session.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == emp.id,
            AttendanceRecord.date == today,
        )
    )
    record = record_result.scalar_one_or_none()
    if not record or record.check_in_status != CheckInStatus.late:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No late check-in found for today.")

    existing = await session.execute(
        select(LateArrivalReason).where(LateArrivalReason.attendance_id == record.id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Late reason already submitted.")

    late_reason = LateArrivalReason(
        attendance_id=record.id,
        employee_id=emp.id,
        reason=reason.strip(),
        late_minutes=record.late_minutes,
        status=LateReasonStatus.pending_ai_evaluation,
        submitted_at=datetime.now(timezone.utc),
    )
    session.add(late_reason)
    await session.flush()

    return {
        "employee_id": emp.employee_id,
        "attendance_id": record.id,
        "reason": late_reason.reason,
        "status": LateReasonStatus.pending_ai_evaluation.value,
    }


async def get_late_intelligence_today(session: AsyncSession, me: User, sort_by: str = "late_minutes") -> list[dict]:
    """Return today's late arrivals, scoped to the caller's org.

    Args:
        session: The database session.
        me: The authenticated HR/Admin user.
        sort_by: The sort key.

    Returns:
        One row per late employee visible to the caller.
    """
    today = today_in_tz()
    result = await session.execute(
        select(Employee, AttendanceRecord, LateArrivalReason, LateReasonEvaluation)
        .join(AttendanceRecord, AttendanceRecord.employee_id == Employee.id)
        .outerjoin(LateArrivalReason, LateArrivalReason.attendance_id == AttendanceRecord.id)
        .outerjoin(LateReasonEvaluation, LateReasonEvaluation.late_reason_id == LateArrivalReason.id)
        .options(selectinload(Employee.department))
        .where(
            AttendanceRecord.date == today,
            AttendanceRecord.check_in_status == CheckInStatus.late,
            Employee.id.in_(visible_user_ids(session, me)),
            AttendanceRecord.org_id == me.org_id,
        )
    )

    reliability_map = await reliability_service.get_reliability_map(session, me)
    rows = []
    for employee, record, reason, evaluation in result.all():
        rows.append(
            {
                "employee_id": employee.employee_id,
                "employee_name": employee.name,
                "department": employee.department.name,
                "check_in_time": record.check_in_time,
                "late_minutes": record.late_minutes,
                "reason": reason.reason if reason else None,
                "ai_category": evaluation.category if evaluation else None,
                "ai_decision": evaluation.decision if evaluation else None,
                "validity_score": evaluation.validity_score if evaluation else None,
                "risk_score": evaluation.risk_score if evaluation else None,
                "reliability_score": reliability_map.get(employee.id),
                "pattern_detected": evaluation.pattern_detected if evaluation else False,
                "pattern_summary": evaluation.pattern_summary if evaluation else None,
                "reason_status": reason.status.value if reason else "missing",
            }
        )

    sort_key = {
        "risk": lambda r: -(r["risk_score"] or 0),
        "validity": lambda r: r["validity_score"] if r["validity_score"] is not None else 101,
        "late_minutes": lambda r: -r["late_minutes"],
        "reliability": lambda r: r["reliability_score"] if r["reliability_score"] is not None else 101,
    }.get(sort_by, lambda r: -r["late_minutes"])

    rows.sort(key=sort_key)
    return rows
