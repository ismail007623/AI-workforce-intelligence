from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.models.attendance import AttendanceRecord, CheckInStatus, CheckOutStatus
from backend.app.models.employee import Department, Employee
from backend.app.models.late_reason import EmployeeReliabilityScore, LateArrivalReason, LateReasonEvaluation
from backend.app.schemas.dashboard import DashboardSummary, DepartmentStats
from backend.app.services import reliability_service
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


async def get_department_stats(session: AsyncSession, sort_by: str | None = None) -> list[DepartmentStats]:
    record_date = today_in_tz()
    dept_result = await session.execute(select(Department))
    departments = list(dept_result.scalars().all())

    emp_result = await session.execute(select(Employee).options(selectinload(Employee.department)))
    employees = list(emp_result.scalars().all())

    att_result = await session.execute(select(AttendanceRecord).where(AttendanceRecord.date == record_date))
    records = {record.employee_id: record for record in att_result.scalars().all()}

    reliability_map = await reliability_service.get_reliability_map(session)

    eval_result = await session.execute(
        select(LateArrivalReason, LateReasonEvaluation)
        .join(LateReasonEvaluation, LateReasonEvaluation.late_reason_id == LateArrivalReason.id)
        .join(AttendanceRecord, AttendanceRecord.id == LateArrivalReason.attendance_id)
        .where(AttendanceRecord.date == record_date)
    )
    eval_by_employee: dict[int, LateReasonEvaluation] = {}
    for reason, evaluation in eval_result.all():
        eval_by_employee[reason.employee_id] = evaluation

    stats: list[DepartmentStats] = []
    for department in departments:
        dept_employees = [e for e in employees if e.department_id == department.id]
        total = len(dept_employees)
        present = late = absent = early_left = 0
        valid_reasons = weak_reasons = invalid_reasons = 0
        reliability_scores: list[int] = []

        for employee in dept_employees:
            record = records.get(employee.id)
            if record is None or record.check_in_time is None:
                absent += 1
                continue
            present += 1
            if record.check_in_status == CheckInStatus.late:
                late += 1
                evaluation = eval_by_employee.get(employee.id)
                if evaluation:
                    if evaluation.decision in ("Valid", "Acceptable"):
                        valid_reasons += 1
                    elif evaluation.decision == "Weak":
                        weak_reasons += 1
                    elif evaluation.decision == "Invalid":
                        invalid_reasons += 1
            if record.check_out_status == CheckOutStatus.early_left:
                early_left += 1
            if employee.id in reliability_map:
                reliability_scores.append(reliability_map[employee.id])

        checked_in = present
        lateness_rate = round((late / checked_in) * 100, 1) if checked_in else 0.0
        attendance_rate = round((checked_in / total) * 100, 1) if total else 0.0
        avg_reliability = round(sum(reliability_scores) / len(reliability_scores), 1) if reliability_scores else 0.0
        department_risk_level = _department_risk_level(lateness_rate, invalid_reasons, avg_reliability)

        stats.append(
            DepartmentStats(
                department=department.name,
                total_employees=total,
                present=present,
                late=late,
                absent=absent,
                early_left=early_left,
                lateness_rate=lateness_rate,
                attendance_rate=attendance_rate,
                valid_reasons=valid_reasons,
                weak_reasons=weak_reasons,
                invalid_reasons=invalid_reasons,
                avg_reliability=avg_reliability,
                department_risk_level=department_risk_level,
            )
        )

    if sort_by:
        stats = _sort_department_stats(stats, sort_by)
    return stats


def _department_risk_level(lateness_rate: float, invalid_reasons: int, avg_reliability: float) -> str:
    if lateness_rate >= 25 or invalid_reasons >= 3 or avg_reliability < 60:
        return "High"
    if lateness_rate >= 15 or invalid_reasons >= 1 or avg_reliability < 75:
        return "Medium"
    return "Low"


def _sort_department_stats(stats: list[DepartmentStats], sort_by: str) -> list[DepartmentStats]:
    key_map = {
        "late_count": lambda s: -s.late,
        "risk": lambda s: {"High": 0, "Medium": 1, "Low": 2}[s.department_risk_level],
        "attendance": lambda s: s.attendance_rate,
        "reliability": lambda s: s.avg_reliability,
        "invalid_reasons": lambda s: -s.invalid_reasons,
    }
    key_fn = key_map.get(sort_by, lambda s: -s.late)
    return sorted(stats, key=key_fn)


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


async def get_absent_employees_by_date(
    session: AsyncSession,
    record_date=None,
) -> list[dict]:
    from datetime import date as date_type  # noqa: PLC0415

    if record_date is None:
        record_date = today_in_tz()
    employees = await _all_employees(session)
    result = await session.execute(
        select(AttendanceRecord).where(AttendanceRecord.date == record_date)
    )
    records = {r.employee_id: r for r in result.scalars().all()}
    absent = []
    for employee in employees:
        rec = records.get(employee.id)
        if rec is None or rec.check_in_time is None:
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

    late_reason_pending = False
    if today_record and today_record.check_in_status == CheckInStatus.late:
        from backend.app.services import late_reason_service

        late_reason_pending = await late_reason_service.requires_late_reason(session, employee.id)

    rel_score = await reliability_service.get_reliability_score(session, employee.id)

    return {
        "employee_id": employee.employee_id,
        "employee_name": employee.name,
        "department": employee.department.name,
        "today_status": today_status,
        "late_arrivals_this_month": late_count,
        "average_delay_minutes": avg_delay,
        "risk_level": compute_risk_level(late_count),
        "attendance_rate_this_month": attendance_rate,
        "late_reason_pending": late_reason_pending,
        "reliability_score": rel_score,
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
            # present = anyone who checked in (on-time or late), matching the stat card definition
            present += 1
            if record.check_in_status == CheckInStatus.late:
                late += 1

        absent = total - present
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


async def get_late_reason_analytics(session: AsyncSession) -> dict:
    today = today_in_tz()
    month_start = today.replace(day=1)
    result = await session.execute(
        select(LateReasonEvaluation.category, LateReasonEvaluation.decision, Employee.department_id)
        .join(LateArrivalReason, LateArrivalReason.id == LateReasonEvaluation.late_reason_id)
        .join(Employee, Employee.id == LateArrivalReason.employee_id)
        .join(AttendanceRecord, AttendanceRecord.id == LateArrivalReason.attendance_id)
        .where(AttendanceRecord.date >= month_start)
    )
    categories: dict[str, int] = {}
    by_dept: dict[str, dict[str, int]] = {}
    for category, decision, dept_id in result.all():
        categories[category] = categories.get(category, 0) + 1
        dept_key = str(dept_id)
        if dept_key not in by_dept:
            by_dept[dept_key] = {"weak": 0, "invalid": 0}
        if decision == "Weak":
            by_dept[dept_key]["weak"] += 1
        elif decision == "Invalid":
            by_dept[dept_key]["invalid"] += 1
    top_categories = sorted(categories.items(), key=lambda x: -x[1])[:5]
    return {"top_categories": top_categories, "department_weak_invalid": by_dept}


async def get_high_risk_employees(session: AsyncSession) -> list[dict]:
    result = await session.execute(
        select(Employee, EmployeeReliabilityScore)
        .join(EmployeeReliabilityScore, EmployeeReliabilityScore.employee_id == Employee.id)
        .options(selectinload(Employee.department))
        .where(EmployeeReliabilityScore.reliability_score < 70)
        .order_by(EmployeeReliabilityScore.reliability_score)
        .limit(20)
    )
    rows = []
    for employee, rel in result.all():
        pattern_result = await session.execute(
            select(LateReasonEvaluation.pattern_detected)
            .join(LateArrivalReason, LateArrivalReason.id == LateReasonEvaluation.late_reason_id)
            .where(LateArrivalReason.employee_id == employee.id, LateReasonEvaluation.pattern_detected.is_(True))
            .limit(1)
        )
        rows.append(
            {
                "employee_id": employee.employee_id,
                "name": employee.name,
                "department": employee.department.name,
                "reliability_score": rel.reliability_score,
                "weak_reason_count_30d": rel.weak_reason_count_30d,
                "invalid_reason_count_30d": rel.invalid_reason_count_30d,
                "pattern_detected": pattern_result.scalar_one_or_none() is True,
            }
        )
    return rows


async def get_department_discipline_ranking(session: AsyncSession) -> list[dict]:
    stats = await get_department_stats(session)
    return [
        {
            "department": s.department,
            "attendance_rate": s.attendance_rate,
            "late_employees": s.late,
            "invalid_reasons": s.invalid_reasons,
            "avg_reliability": s.avg_reliability,
            "department_risk_level": s.department_risk_level,
        }
        for s in sorted(stats, key=lambda x: x.avg_reliability)
    ]


async def get_reason_pattern_alerts(session: AsyncSession) -> list[dict]:
    result = await session.execute(
        select(Employee, LateReasonEvaluation)
        .join(LateArrivalReason, LateArrivalReason.employee_id == Employee.id)
        .join(LateReasonEvaluation, LateReasonEvaluation.late_reason_id == LateArrivalReason.id)
        .options(selectinload(Employee.department))
        .where(LateReasonEvaluation.pattern_detected.is_(True))
        .order_by(LateReasonEvaluation.evaluated_at.desc())
        .limit(20)
    )
    return [
        {
            "employee_id": employee.employee_id,
            "name": employee.name,
            "department": employee.department.name,
            "pattern_summary": evaluation.pattern_summary,
            "category": evaluation.category,
            "evaluated_at": evaluation.evaluated_at.isoformat(),
        }
        for employee, evaluation in result.all()
    ]
