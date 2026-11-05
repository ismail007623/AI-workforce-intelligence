from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.agents.late_reason_graph import run_late_reason_pipeline
from backend.app.core.config import get_settings
from backend.app.models.attendance import AttendanceRecord, CheckInStatus
from backend.app.core.scoping import visible_user_ids
from backend.app.models.employee import Department, Employee
from backend.app.models.user import User
from backend.app.models.late_reason import (
    LateArrivalReason,
    LateReasonEvaluation,
    LateReasonStatus,
)
from backend.app.services import reliability_service
from backend.app.utils.time_rules import today_in_tz


async def _month_bounds():
    today = today_in_tz()
    month_start = today.replace(day=1)
    return month_start, today


async def _late_count_month(session: AsyncSession, employee_db_id: int) -> int:
    month_start, today = await _month_bounds()
    result = await session.execute(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.employee_id == employee_db_id,
            AttendanceRecord.date >= month_start,
            AttendanceRecord.date <= today,
            AttendanceRecord.check_in_status == CheckInStatus.late,
        )
    )
    return int(result.scalar() or 0)


async def _on_time_count_month(session: AsyncSession, employee_db_id: int) -> int:
    month_start, today = await _month_bounds()
    result = await session.execute(
        select(func.count(AttendanceRecord.id)).where(
            AttendanceRecord.employee_id == employee_db_id,
            AttendanceRecord.date >= month_start,
            AttendanceRecord.date <= today,
            AttendanceRecord.check_in_time.is_not(None),
            AttendanceRecord.check_in_status == CheckInStatus.present,
        )
    )
    return int(result.scalar() or 0)


async def _absence_count_month(session: AsyncSession, employee_db_id: int) -> int:
    month_start, today = await _month_bounds()
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


async def _month_evaluations(
    session: AsyncSession, employee_db_id: int
) -> tuple[list[LateReasonEvaluation], int, int]:
    month_start, today = await _month_bounds()
    result = await session.execute(
        select(LateReasonEvaluation)
        .join(LateArrivalReason, LateArrivalReason.id == LateReasonEvaluation.late_reason_id)
        .join(AttendanceRecord, AttendanceRecord.id == LateArrivalReason.attendance_id)
        .where(
            LateArrivalReason.employee_id == employee_db_id,
            AttendanceRecord.date >= month_start,
            AttendanceRecord.date <= today,
        )
    )
    evaluations = list(result.scalars().all())
    weak = sum(1 for e in evaluations if e.decision == "Weak")
    invalid = sum(1 for e in evaluations if e.decision == "Invalid")
    return evaluations, weak, invalid


def _compute_concern_score(
    late_count: int,
    evaluations: list[LateReasonEvaluation],
    weak_n: int,
    invalid_n: int,
) -> tuple[float, float | None]:
    if late_count == 0:
        return 0.0, None

    settings = get_settings()
    if evaluations:
        avg_validity = sum(e.validity_score for e in evaluations) / len(evaluations)
    else:
        avg_validity = 100.0

    quality_penalty = (
        1.0
        + weak_n * settings.concern_weak_weight
        + invalid_n * settings.concern_invalid_weight
        + (100 - avg_validity) / 100
    )
    concern_score = round(late_count * quality_penalty, 2)
    return concern_score, round(avg_validity, 1)


async def _evaluate_pending_reasons(
    session: AsyncSession,
    employees: list[Employee],
) -> None:
    employee_ids = [e.id for e in employees]
    if not employee_ids:
        return

    month_start, today = await _month_bounds()
    pending_result = await session.execute(
        select(LateArrivalReason, Employee, AttendanceRecord)
        .join(Employee, Employee.id == LateArrivalReason.employee_id)
        .join(AttendanceRecord, AttendanceRecord.id == LateArrivalReason.attendance_id)
        .where(
            LateArrivalReason.employee_id.in_(employee_ids),
            LateArrivalReason.status == LateReasonStatus.pending_ai_evaluation,
            AttendanceRecord.date >= month_start,
            AttendanceRecord.date <= today,
        )
    )

    for reason, employee, record in pending_result.all():
        await run_late_reason_pipeline(
            {
                "employee_id": employee.employee_id,
                "employee_name": employee.name,
                "employee_db_id": employee.id,
                "attendance_id": record.id,
                "late_reason_id": reason.id,
                "reason_text": reason.reason,
                "db_session": session,
                "skip_hr_notification": True,
            }
        )


async def _evaluation_status(session: AsyncSession, employee_db_id: int) -> str:
    month_start, today = await _month_bounds()
    pending = await session.execute(
        select(func.count(LateArrivalReason.id))
        .join(AttendanceRecord, AttendanceRecord.id == LateArrivalReason.attendance_id)
        .where(
            LateArrivalReason.employee_id == employee_db_id,
            LateArrivalReason.status == LateReasonStatus.pending_ai_evaluation,
            AttendanceRecord.date >= month_start,
            AttendanceRecord.date <= today,
        )
    )
    if int(pending.scalar() or 0) > 0:
        return "pending"

    evaluated = await session.execute(
        select(func.count(LateReasonEvaluation.id))
        .join(LateArrivalReason, LateArrivalReason.id == LateReasonEvaluation.late_reason_id)
        .join(AttendanceRecord, AttendanceRecord.id == LateArrivalReason.attendance_id)
        .where(
            LateArrivalReason.employee_id == employee_db_id,
            AttendanceRecord.date >= month_start,
            AttendanceRecord.date <= today,
        )
    )
    if int(evaluated.scalar() or 0) > 0:
        return "evaluated"
    return "none"


async def get_department_employees(
    session: AsyncSession,
    me: User,
    department_name: str,
    sort_by: str | None = None,
) -> list[dict]:
    """Return one department's employees, scoped to the caller's org.

    Args:
        session: The database session.
        me: The authenticated HR/Admin user.
        department_name: The department to list.
        sort_by: Optional sort key.

    Returns:
        One row per visible employee in the department.

    Raises:
        HTTPException: 404 when the department does not exist in
            the caller's organization (a same-named department in
            another org is not visible and not leaked).
    """
    dept_result = await session.execute(
        select(Department).where(
            Department.name == department_name,
            Department.org_id == me.org_id,
        )
    )
    department = dept_result.scalar_one_or_none()
    if department is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    emp_result = await session.execute(
        select(Employee)
        .options(selectinload(Employee.department))
        .where(
            Employee.department_id == department.id,
            Employee.id.in_(visible_user_ids(session, me)),
        )
    )
    employees = list(emp_result.scalars().all())

    if sort_by == "late":
        await _evaluate_pending_reasons(session, employees)

    reliability_map = await reliability_service.get_reliability_map(session, me)
    rows: list[dict] = []

    for employee in employees:
        late_count = await _late_count_month(session, employee.id)
        absent_count = await _absence_count_month(session, employee.id)
        on_time_count = await _on_time_count_month(session, employee.id)
        evaluations, weak_n, invalid_n = await _month_evaluations(session, employee.id)
        concern_score = None
        avg_validity = None

        if sort_by == "late":
            concern_score, avg_validity = _compute_concern_score(
                late_count, evaluations, weak_n, invalid_n
            )

        rows.append(
            {
                "employee_id": employee.employee_id,
                "employee_name": employee.name,
                "late_count_month": late_count,
                "absent_count_month": absent_count,
                "on_time_count_month": on_time_count,
                "concern_score": concern_score,
                "avg_validity": avg_validity,
                "weak_reason_count": weak_n,
                "invalid_reason_count": invalid_n,
                "reliability_score": reliability_map.get(employee.id),
                "evaluation_status": await _evaluation_status(session, employee.id),
            }
        )

    if sort_by == "late":
        rows.sort(key=lambda r: (-(r["concern_score"] or 0), -r["late_count_month"]))
    elif sort_by == "punctual":
        rows.sort(key=lambda r: (-r["on_time_count_month"], r["late_count_month"]))
    elif sort_by == "absent":
        rows.sort(key=lambda r: (-r["absent_count_month"], r["late_count_month"]))
    else:
        rows.sort(key=lambda r: r["employee_name"])

    return rows
