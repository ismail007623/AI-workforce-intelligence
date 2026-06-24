from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.attendance import AttendanceRecord, CheckInStatus, CheckOutStatus
from backend.app.models.employee import Department, Employee
from backend.app.schemas.dashboard import DashboardSummary, DepartmentStats
from backend.app.utils.time_rules import today_in_tz


async def _all_employees(session: AsyncSession) -> list[Employee]:
    result = await session.execute(select(Employee).options(selectinload(Employee.department)))
    return list(result.scalars().all())


async def get_dashboard_summary(session: AsyncSession) -> DashboardSummary:
    record_date = today_in_tz()
    employees = await _all_employees(session)
    total = len(employees)

    result = await session.execute(select(AttendanceRecord).where(AttendanceRecord.date == record_date))
    records = {record.employee_id: record for record in result.scalars().all()}

    present = late = early_left = 0
    for employee in employees:
        record = records.get(employee.id)
        if record is None or record.check_in_time is None:
            continue
        # Present = anyone who checked in (on-time or late); late is a subset.
        present += 1
        if record.check_in_status == CheckInStatus.late:
            late += 1
        if record.check_out_status == CheckOutStatus.early_left:
            early_left += 1

    checked_in = present
    absent = total - checked_in
    attendance_rate = round((checked_in / total) * 100, 1) if total else 0.0

    return DashboardSummary(
        total_employees=total,
        present=present,
        late=late,
        absent=absent,
        early_left=early_left,
        attendance_rate=attendance_rate,
    )


async def get_department_stats(session: AsyncSession) -> list[DepartmentStats]:
    record_date = today_in_tz()
    dept_result = await session.execute(select(Department))
    departments = list(dept_result.scalars().all())

    emp_result = await session.execute(select(Employee).options(selectinload(Employee.department)))
    employees = list(emp_result.scalars().all())

    att_result = await session.execute(select(AttendanceRecord).where(AttendanceRecord.date == record_date))
    records = {record.employee_id: record for record in att_result.scalars().all()}

    stats: list[DepartmentStats] = []
    for department in departments:
        dept_employees = [e for e in employees if e.department_id == department.id]
        total = len(dept_employees)
        present = late = absent = early_left = 0

        for employee in dept_employees:
            record = records.get(employee.id)
            if record is None or record.check_in_time is None:
                absent += 1
                continue
            present += 1
            if record.check_in_status == CheckInStatus.late:
                late += 1
            if record.check_out_status == CheckOutStatus.early_left:
                early_left += 1

        checked_in = present
        lateness_rate = round((late / checked_in) * 100, 1) if checked_in else 0.0
        stats.append(
            DepartmentStats(
                department=department.name,
                total_employees=total,
                present=present,
                late=late,
                absent=absent,
                early_left=early_left,
                lateness_rate=lateness_rate,
            )
        )
    return stats


async def get_late_employees_today(session: AsyncSession) -> list[dict]:
    record_date = today_in_tz()
    result = await session.execute(
        select(Employee, AttendanceRecord)
        .join(AttendanceRecord, AttendanceRecord.employee_id == Employee.id)
        .options(selectinload(Employee.department))
        .where(
            AttendanceRecord.date == record_date,
            AttendanceRecord.check_in_status == CheckInStatus.late,
        )
    )
    return [
        {
            "employee_id": employee.employee_id,
            "name": employee.name,
            "department": employee.department.name,
            "check_in_time": record.check_in_time.isoformat() if record.check_in_time else None,
            "late_minutes": record.late_minutes,
        }
        for employee, record in result.all()
    ]


async def get_early_leavers_today(session: AsyncSession) -> list[dict]:
    record_date = today_in_tz()
    result = await session.execute(
        select(Employee, AttendanceRecord)
        .join(AttendanceRecord, AttendanceRecord.employee_id == Employee.id)
        .options(selectinload(Employee.department))
        .where(
            AttendanceRecord.date == record_date,
            AttendanceRecord.check_out_status == CheckOutStatus.early_left,
        )
    )
    return [
        {
            "employee_id": employee.employee_id,
            "name": employee.name,
            "department": employee.department.name,
            "check_out_time": record.check_out_time.isoformat() if record.check_out_time else None,
            "early_leave_minutes": record.early_leave_minutes,
        }
        for employee, record in result.all()
    ]


async def get_employee_late_stats(session: AsyncSession, employee_code: str) -> dict:
    emp_result = await session.execute(select(Employee).where(Employee.employee_id == employee_code))
    employee = emp_result.scalar_one_or_none()
    if employee is None:
        return {"error": f"Employee {employee_code} not found"}

    today = today_in_tz()
    month_start = today.replace(day=1)
    result = await session.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee.id,
            AttendanceRecord.date >= month_start,
            AttendanceRecord.check_in_status == CheckInStatus.late,
        )
    )
    late_records = list(result.scalars().all())
    late_count = len(late_records)
    avg_delay = round(sum(r.late_minutes for r in late_records) / late_count, 1) if late_count else 0.0

    from backend.app.utils.time_rules import compute_risk_level

    return {
        "employee_id": employee.employee_id,
        "name": employee.name,
        "late_arrivals_this_month": late_count,
        "average_delay_minutes": avg_delay,
        "risk_level": compute_risk_level(late_count),
    }


async def get_attendance_trend(session: AsyncSession, days: int = 7) -> dict:
    from datetime import timedelta

    today = today_in_tz()
    current_start = today - timedelta(days=days - 1)
    previous_start = current_start - timedelta(days=days)
    previous_end = current_start - timedelta(days=1)

    total_employees = await session.scalar(select(func.count()).select_from(Employee)) or 0

    async def _rate(start, end):
        result = await session.execute(
            select(func.count(AttendanceRecord.id)).where(
                AttendanceRecord.date >= start,
                AttendanceRecord.date <= end,
                AttendanceRecord.check_in_time.is_not(None),
            )
        )
        check_ins = result.scalar() or 0
        possible = total_employees * ((end - start).days + 1)
        return round((check_ins / possible) * 100, 1) if possible else 0.0

    current_rate = await _rate(current_start, today)
    previous_rate = await _rate(previous_start, previous_end)
    change = round(current_rate - previous_rate, 1)

    return {
        "current_period_rate": current_rate,
        "previous_period_rate": previous_rate,
        "change_percentage_points": change,
        "days": days,
    }


async def get_absent_employees_today(session: AsyncSession) -> list[dict]:
    record_date = today_in_tz()
    employees = await _all_employees(session)
    result = await session.execute(select(AttendanceRecord).where(AttendanceRecord.date == record_date))
    records = {record.employee_id: record for record in result.scalars().all()}

    absent = []
    for employee in employees:
        record = records.get(employee.id)
        if record is None or record.check_in_time is None:
            absent.append(
                {
                    "employee_id": employee.employee_id,
                    "employee_name": employee.name,
                    "department": employee.department.name,
                }
            )
    return absent


async def get_employee_summary(session: AsyncSession, employee_code: str) -> dict:
    from fastapi import HTTPException, status

    from backend.app.utils.time_rules import compute_risk_level

    emp_result = await session.execute(
        select(Employee).options(selectinload(Employee.department)).where(Employee.employee_id == employee_code)
    )
    employee = emp_result.scalar_one_or_none()
    if employee is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")

    today = today_in_tz()
    month_start = today.replace(day=1)

    today_result = await session.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee.id,
            AttendanceRecord.date == today,
        )
    )
    today_record = today_result.scalar_one_or_none()

    if today_record is None or today_record.check_in_time is None:
        today_status = "not_checked_in"
    elif today_record.check_in_status == CheckInStatus.present:
        today_status = "present"
    elif today_record.check_in_status == CheckInStatus.late:
        today_status = "late"
    else:
        today_status = "absent"

    month_records_result = await session.execute(
        select(AttendanceRecord).where(
            AttendanceRecord.employee_id == employee.id,
            AttendanceRecord.date >= month_start,
            AttendanceRecord.date <= today,
        )
    )
    month_records = list(month_records_result.scalars().all())
    late_records = [r for r in month_records if r.check_in_status == CheckInStatus.late]
    checked_in_days = sum(1 for r in month_records if r.check_in_time is not None)
    working_days = (today - month_start).days + 1
    attendance_rate = round((checked_in_days / working_days) * 100, 1) if working_days else 0.0

    late_count = len(late_records)
    avg_delay = round(sum(r.late_minutes for r in late_records) / late_count, 1) if late_count else 0.0

    return {
        "employee_id": employee.employee_id,
        "employee_name": employee.name,
        "department": employee.department.name,
        "today_status": today_status,
        "late_arrivals_this_month": late_count,
        "average_delay_minutes": avg_delay,
        "risk_level": compute_risk_level(late_count),
        "attendance_rate_this_month": attendance_rate,
    }


async def get_daily_trend(session: AsyncSession, days: int = 7) -> list[dict]:
    from datetime import timedelta

    today = today_in_tz()
    employees = await _all_employees(session)
    total = len(employees)
    points: list[dict] = []

    for offset in range(days - 1, -1, -1):
        record_date = today - timedelta(days=offset)
        result = await session.execute(
            select(AttendanceRecord).where(AttendanceRecord.date == record_date)
        )
        records = {r.employee_id: r for r in result.scalars().all()}

        present = late = 0
        for employee in employees:
            record = records.get(employee.id)
            if record is None or record.check_in_time is None:
                continue
            if record.check_in_status == CheckInStatus.present:
                present += 1
            elif record.check_in_status == CheckInStatus.late:
                late += 1

        checked_in = present + late
        absent = total - checked_in
        points.append(
            {
                "date": record_date.isoformat(),
                "day": record_date.strftime("%a"),
                "present": present,
                "late": late,
                "absent": absent,
            }
        )
    return points
