"""Attendance endpoints, including the org-scoped /me endpoints.

The legacy ID routes (``/check-in``, ``/employee/{id}``, ...) are
kept for backward compatibility but are now org-checked: an
employee in another organization is a 403, never a 404, and HR/Admin
access is limited to their own organization. The ``/me`` endpoints
are the new default — they take no employee id at all and resolve
the employee from the token.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agents.checkin_graph import run_checkin_pipeline
from backend.app.core.database import get_db
from backend.app.core.auth_deps import (
    JWTBearer,
    get_current_user,
    require_hr_role,
    require_own_employee,
    require_self_not_hr,
    require_self_or_hr,
)
from backend.app.models.employee import Employee
from backend.app.models.user import User
from backend.app.models.attendance import CheckInStatus
from backend.app.schemas.attendance import (
    AbsentEmployeeResponse,
    AttendanceRecordResponse,
    CheckInResponse,
    CheckOutResponse,
    EmployeeActionRequest,
    EmployeeSummaryResponse,
    LateStats,
)
from backend.app.schemas.late_reason import (
    LateIntelligenceRecord,
    LateReasonSubmitRequest,
    LateReasonSubmitResponse,
    MeLateReasonRequest,
)
from backend.app.core.logger import get_logger
from backend.app.services import attendance_service, late_reason_service, stats_service

logger = get_logger(__name__)
router = APIRouter(prefix="/attendance", tags=["attendance"])


async def _perform_check_in(session: AsyncSession, employee: Employee):
    """Run a check-in for an already-resolved employee.

    Shared by the legacy ``/check-in`` route and ``/me/check-in``
    so both run the same pipeline and late-reason logic.

    Args:
        session: The database session.
        employee: The resolved Employee row.

    Returns:
        A tuple of (employee, record, pipeline_state, late_stats,
        requires_reason).
    """
    _, record = await attendance_service.check_in(session, employee.employee_id)
    await session.commit()

    pipeline_state = await run_checkin_pipeline(
        {
            "employee_id": employee.employee_id,
            "employee_name": employee.name,
            "employee_email": employee.email,
            "attendance_record_id": record.id,
            "check_in_time": record.check_in_time,
            "check_in_status": record.check_in_status.value if record.check_in_status else None,
            "late_minutes": record.late_minutes,
        }
    )

    late_stats = None
    requires_reason = False
    if pipeline_state.get("check_in_status") == CheckInStatus.late.value:
        late_stats = LateStats(
            late_arrivals_this_month=pipeline_state.get("late_arrivals_count", 0),
            average_delay_minutes=pipeline_state.get("average_delay_minutes", 0.0),
            risk_level=pipeline_state.get("risk_level", "low"),
        )
        requires_reason = await late_reason_service.requires_late_reason(session, employee.id)

    await session.refresh(record)
    logger.info(
        "check-in completed for employee_id=%s status=%s late_minutes=%s notification_sent=%s",
        employee.employee_id,
        record.check_in_status,
        record.late_minutes,
        pipeline_state.get("notification_sent", False),
    )
    return employee, record, pipeline_state, late_stats, requires_reason


def _check_in_response(employee: Employee, record, pipeline_state, late_stats, requires_reason) -> CheckInResponse:
    """Build the check-in response from the performed check-in."""
    return CheckInResponse(
        employee_id=employee.employee_id,
        employee_name=employee.name,
        date=record.date,
        check_in_time=record.check_in_time,
        check_in_status=record.check_in_status,
        late_minutes=record.late_minutes,
        notification_sent=pipeline_state.get("notification_sent", False),
        requires_late_reason=requires_reason,
        late_stats=late_stats,
    )


@router.post("/me/check-in", response_model=CheckInResponse)
async def me_check_in(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check in the calling employee (token-resolved, no id in body)."""
    employee = await require_own_employee(session, current_user)
    logger.info("me/check-in requested for employee_id=%s", employee.employee_id)
    employee, record, pipeline_state, late_stats, requires_reason = await _perform_check_in(session, employee)
    return _check_in_response(employee, record, pipeline_state, late_stats, requires_reason)


@router.post("/me/check-out", response_model=CheckOutResponse)
async def me_check_out(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Check out the calling employee (token-resolved, no id in body)."""
    employee = await require_own_employee(session, current_user)
    logger.info("me/check-out requested for employee_id=%s", employee.employee_id)
    employee, record = await attendance_service.check_out(session, employee.employee_id)
    logger.info(
        "me/check-out completed for employee_id=%s status=%s early_leave_minutes=%s",
        employee.employee_id,
        record.check_out_status,
        record.early_leave_minutes,
    )
    return CheckOutResponse(
        employee_id=employee.employee_id,
        employee_name=employee.name,
        date=record.date,
        check_in_time=record.check_in_time,
        check_out_time=record.check_out_time,
        check_in_status=record.check_in_status,
        check_out_status=record.check_out_status,
        early_leave_minutes=record.early_leave_minutes,
    )


@router.post("/me/late-reason", response_model=LateReasonSubmitResponse)
async def me_submit_late_reason(
    payload: MeLateReasonRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Submit a late reason for the calling employee (reason only)."""
    employee = await require_own_employee(session, current_user)
    logger.info("me/late-reason submitted for employee_id=%s", employee.employee_id)
    result = await late_reason_service.submit_late_reason(session, employee.employee_id, payload.reason)
    await session.commit()
    return LateReasonSubmitResponse(**result)


@router.get("/me/history", response_model=list[AttendanceRecordResponse])
async def me_history(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the calling employee's own attendance history."""
    employee = await require_own_employee(session, current_user)
    logger.info("me/history requested for employee_id=%s", employee.employee_id)
    rows = await attendance_service.get_employee_history(session, current_user, employee.employee_id)
    return [
        AttendanceRecordResponse(
            employee_id=employee.employee_id,
            employee_name=employee.name,
            department=employee.department.name,
            date=record.date,
            check_in_time=record.check_in_time,
            check_out_time=record.check_out_time,
            check_in_status=record.check_in_status,
            check_out_status=record.check_out_status,
            late_minutes=record.late_minutes,
            early_leave_minutes=record.early_leave_minutes,
        )
        for employee, record in rows
    ]


@router.get("/me/summary", response_model=EmployeeSummaryResponse)
async def me_summary(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return the calling employee's own attendance summary."""
    employee = await require_own_employee(session, current_user)
    logger.info("me/summary requested for employee_id=%s", employee.employee_id)
    data = await stats_service.get_employee_summary(session, current_user, employee.employee_id)
    return EmployeeSummaryResponse(**data)


@router.post("/check-in", response_model=CheckInResponse)
async def check_in(
    payload: EmployeeActionRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_self_not_hr(session, current_user, payload.employee_id)
    logger.info("check-in requested for employee_id=%s", payload.employee_id)
    employee = await attendance_service.get_employee_by_code(session, payload.employee_id)
    employee, record, pipeline_state, late_stats, requires_reason = await _perform_check_in(session, employee)
    return _check_in_response(employee, record, pipeline_state, late_stats, requires_reason)


@router.post("/late-reason", response_model=LateReasonSubmitResponse)
async def submit_late_reason(
    payload: LateReasonSubmitRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_self_not_hr(session, current_user, payload.employee_id)
    logger.info("late-reason submitted for employee_id=%s", payload.employee_id)
    result = await late_reason_service.submit_late_reason(session, payload.employee_id, payload.reason)
    await session.commit()
    return LateReasonSubmitResponse(**result)


@router.get("/today/late-intelligence", response_model=list[LateIntelligenceRecord], dependencies=[Depends(JWTBearer()), Depends(require_hr_role)])
async def late_intelligence(
    sort_by: str = Query(default="late_minutes", pattern="^(risk|validity|late_minutes|reliability)$"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.info("late-intelligence requested sort_by=%s", sort_by)
    rows = await late_reason_service.get_late_intelligence_today(session, current_user, sort_by=sort_by)
    return [LateIntelligenceRecord(**row) for row in rows]


@router.post("/check-out", response_model=CheckOutResponse)
async def check_out(
    payload: EmployeeActionRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_self_not_hr(session, current_user, payload.employee_id)
    logger.info("check-out requested for employee_id=%s", payload.employee_id)
    employee, record = await attendance_service.check_out(session, payload.employee_id)
    logger.info(
        "check-out completed for employee_id=%s status=%s early_leave_minutes=%s",
        employee.employee_id,
        record.check_out_status,
        record.early_leave_minutes,
    )
    return CheckOutResponse(
        employee_id=employee.employee_id,
        employee_name=employee.name,
        date=record.date,
        check_in_time=record.check_in_time,
        check_out_time=record.check_out_time,
        check_in_status=record.check_in_status,
        check_out_status=record.check_out_status,
        early_leave_minutes=record.early_leave_minutes,
    )


@router.get("/today", response_model=list[AttendanceRecordResponse], dependencies=[Depends(JWTBearer()), Depends(require_hr_role)])
async def list_today(
    status: CheckInStatus | None = Query(default=None),
    early_left: bool | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.info("list-today requested with status=%s early_left=%s", status, early_left)
    rows = await attendance_service.list_today_records(session, current_user, status_filter=status, early_left=early_left)
    logger.info("list-today returned %d records", len(rows))
    return [
        AttendanceRecordResponse(
            employee_id=employee.employee_id,
            employee_name=employee.name,
            department=employee.department.name,
            date=record.date,
            check_in_time=record.check_in_time,
            check_out_time=record.check_out_time,
            check_in_status=record.check_in_status,
            check_out_status=record.check_out_status,
            late_minutes=record.late_minutes,
            early_leave_minutes=record.early_leave_minutes,
        )
        for employee, record in rows
    ]


@router.get("/employee/{employee_id}", response_model=list[AttendanceRecordResponse])
async def employee_history(
    employee_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_self_or_hr(session, current_user, employee_id)
    logger.info("employee-history requested for employee_id=%s", employee_id)
    rows = await attendance_service.get_employee_history(session, current_user, employee_id)
    logger.info("employee-history returned %d records for employee_id=%s", len(rows), employee_id)
    return [
        AttendanceRecordResponse(
            employee_id=employee.employee_id,
            employee_name=employee.name,
            department=employee.department.name,
            date=record.date,
            check_in_time=record.check_in_time,
            check_out_time=record.check_out_time,
            check_in_status=record.check_in_status,
            check_out_status=record.check_out_status,
            late_minutes=record.late_minutes,
            early_leave_minutes=record.early_leave_minutes,
        )
        for employee, record in rows
    ]


@router.get("/today/absent", response_model=list[AbsentEmployeeResponse], dependencies=[Depends(JWTBearer()), Depends(require_hr_role)])
async def list_today_absent(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.info("list-today-absent requested")
    rows = await stats_service.get_absent_employees_today(session, current_user)
    logger.info("list-today-absent returned %d absent employees", len(rows))
    return [AbsentEmployeeResponse(**row) for row in rows]


@router.get("/employee/{employee_id}/summary", response_model=EmployeeSummaryResponse)
async def employee_summary(
    employee_id: str,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await require_self_or_hr(session, current_user, employee_id)
    logger.info("employee-summary requested for employee_id=%s", employee_id)
    data = await stats_service.get_employee_summary(session, current_user, employee_id)
    logger.info("employee-summary retrieved for employee_id=%s", employee_id)
    return EmployeeSummaryResponse(**data)
