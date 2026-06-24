import logging
from sqlalchemy import select
from backend.app.agents.state import CheckInState
from backend.app.core.database import async_session_factory
from backend.app.core.logger import get_logger
from backend.app.models.attendance import AttendanceRecord, CheckInStatus
from backend.app.models.employee import Employee
from backend.app.utils.time_rules import compute_risk_level, today_in_tz

logger = get_logger(__name__)


async def late_detection_node(state: CheckInState) -> CheckInState:
    logger.info("late_detection node started for employee_id=%s", state["employee_id"])
    today = today_in_tz()
    month_start = today.replace(day=1)

    async with async_session_factory() as session:
        emp_result = await session.execute(select(Employee).where(Employee.employee_id == state["employee_id"]))
        employee = emp_result.scalar_one()

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
    risk_level = compute_risk_level(late_count)
    logger.info(
        "late_detection node completed for employee_id=%s late_count=%d average_delay=%s risk_level=%s",
        state["employee_id"],
        late_count,
        avg_delay,
        risk_level,
    )

    return {
        **state,
        "late_arrivals_count": late_count,
        "average_delay_minutes": avg_delay,
        "risk_level": risk_level,
    }
