from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.attendance import AttendanceRecord, CheckInStatus, CheckOutStatus
from backend.app.models.employee import Employee
from backend.app.utils.time_rules import (
    calculate_early_leave_minutes,
    calculate_late_minutes,
    is_early_leave,
    is_late,
    is_on_time,
    now_in_tz,
    today_in_tz,
)


async def get_employee_by_code(session: AsyncSession, employee_code: str) -> Employee:
    result = await session.execute(
        select(Employee)
        .options(selectinload(Employee.department))
        .where(Employee.employee_id == employee_code)
    )
    employee = result.scalar_one_or_none()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    return employee


async def get_today_record(session: AsyncSession, employee_db_id: int, record_date: date | None = None) -> AttendanceRecord | None:
    record_date = record_date or today_in_tz()
    result = await session.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee_db_id,
            AttendanceRecord.date == record_date,
        )
    )
    return result.scalar_one_or_none()


async def check_in(session: AsyncSession, employee_code: str) -> tuple[Employee, AttendanceRecord]:
    employee = await get_employee_by_code(session, employee_code)
    record_date = today_in_tz()
    existing = await get_today_record(session, employee.id, record_date)
    if existing and existing.check_in_time is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already checked in today")

    check_in_time = now_in_tz()
    if is_on_time(check_in_time):
        check_in_status = CheckInStatus.present
        late_minutes = 0
    elif is_late(check_in_time):
        check_in_status = CheckInStatus.late
        late_minutes = calculate_late_minutes(check_in_time)
    else:
        check_in_status = CheckInStatus.present
        late_minutes = 0

    if existing:
        existing.check_in_time = check_in_time
        existing.check_in_status = check_in_status
        existing.late_minutes = late_minutes
        record = existing
    else:
        record = AttendanceRecord(
            employee_id=employee.id,
            date=record_date,
            check_in_time=check_in_time,
            check_in_status=check_in_status,
            late_minutes=late_minutes,
        )
        session.add(record)

    await session.flush()
    await session.refresh(record)
    return employee, record


async def check_out(session: AsyncSession, employee_code: str) -> tuple[Employee, AttendanceRecord]:
    employee = await get_employee_by_code(session, employee_code)
    record = await get_today_record(session, employee.id)
    if record is None or record.check_in_time is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Must check in before checking out")
    if record.check_out_time is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Already checked out today")

    check_out_time = now_in_tz()
    if is_early_leave(check_out_time):
        record.check_out_status = CheckOutStatus.early_left
        record.early_leave_minutes = calculate_early_leave_minutes(check_out_time)
    else:
        record.check_out_status = CheckOutStatus.on_time
        record.early_leave_minutes = 0

    record.check_out_time = check_out_time
    await session.flush()
    await session.refresh(record)
    return employee, record


async def list_today_records(
    session: AsyncSession,
    status_filter: CheckInStatus | None = None,
    early_left: bool | None = None,
) -> list[tuple[Employee, AttendanceRecord]]:
    record_date = today_in_tz()
    query = (
        select(Employee, AttendanceRecord)
        .join(AttendanceRecord, AttendanceRecord.employee_id == Employee.id)
        .options(selectinload(Employee.department))
        .where(AttendanceRecord.date == record_date)
    )
    if status_filter:
        query = query.where(AttendanceRecord.check_in_status == status_filter)
    if early_left is True:
        query = query.where(AttendanceRecord.check_out_status == CheckOutStatus.early_left)

    result = await session.execute(query)
    return list(result.all())


async def get_employee_history(session: AsyncSession, employee_code: str, limit: int = 30) -> list[tuple[Employee, AttendanceRecord]]:
    employee = await get_employee_by_code(session, employee_code)
    result = await session.execute(
        select(AttendanceRecord)
        .where(AttendanceRecord.employee_id == employee.id)
        .order_by(AttendanceRecord.date.desc())
        .limit(limit)
    )
    records = result.scalars().all()
    return [(employee, record) for record in records]
