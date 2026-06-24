from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.agents.checkin_graph import run_checkin_pipeline
from backend.app.core.database import get_db
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
from backend.app.core.logger import get_logger
from backend.app.services import attendance_service, stats_service

logger = get_logger(__name__)
router = APIRouter(prefix="/attendance", tags=["attendance"])


@router.post("/check-in", response_model=CheckInResponse)
async def check_in(payload: EmployeeActionRequest, session: AsyncSession = Depends(get_db)):
        logger.info("check-in requested for employee_id=%s", payload.employee_id)
        employee, record = await attendance_service.check_in(session, payload.employee_id)
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
        if pipeline_state.get("check_in_status") == CheckInStatus.late.value:
            late_stats = LateStats(
                late_arrivals_this_month=pipeline_state.get("late_arrivals_count", 0),
                average_delay_minutes=pipeline_state.get("average_delay_minutes", 0.0),
                risk_level=pipeline_state.get("risk_level", "low"),
            )

        await session.refresh(record)
        logger.info(
            "check-in completed for employee_id=%s status=%s late_minutes=%s notification_sent=%s",
            employee.employee_id,
            record.check_in_status,
            record.late_minutes,
            pipeline_state.get("notification_sent", False),
        )

        return CheckInResponse(
            employee_id=employee.employee_id,
            employee_name=employee.name,
            date=record.date,
            check_in_time=record.check_in_time,
            check_in_status=record.check_in_status,
            late_minutes=record.late_minutes,
            notification_sent=pipeline_state.get("notification_sent", False),
            late_stats=late_stats,
        )
    



@router.post("/check-out", response_model=CheckOutResponse)
async def check_out(payload: EmployeeActionRequest, session: AsyncSession = Depends(get_db)):
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


@router.get("/today", response_model=list[AttendanceRecordResponse])
async def list_today(
    status: CheckInStatus | None = Query(default=None),
    early_left: bool | None = Query(default=None),
    session: AsyncSession = Depends(get_db),
):
    logger.info("list-today requested with status=%s early_left=%s", status, early_left)
    rows = await attendance_service.list_today_records(session, status_filter=status, early_left=early_left)
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
async def employee_history(employee_id: str, session: AsyncSession = Depends(get_db)):
    logger.info("employee-history requested for employee_id=%s", employee_id)
    rows = await attendance_service.get_employee_history(session, employee_id)
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


@router.get("/today/absent", response_model=list[AbsentEmployeeResponse])
async def list_today_absent(session: AsyncSession = Depends(get_db)):
    logger.info("list-today-absent requested")
    rows = await stats_service.get_absent_employees_today(session)
    logger.info("list-today-absent returned %d absent employees", len(rows))
    return [AbsentEmployeeResponse(**row) for row in rows]


@router.get("/employee/{employee_id}/summary", response_model=EmployeeSummaryResponse)
async def employee_summary(employee_id: str, session: AsyncSession = Depends(get_db)):
    logger.info("employee-summary requested for employee_id=%s", employee_id)
    data = await stats_service.get_employee_summary(session, employee_id)
    logger.info("employee-summary retrieved for employee_id=%s", employee_id)
    return EmployeeSummaryResponse(**data)
