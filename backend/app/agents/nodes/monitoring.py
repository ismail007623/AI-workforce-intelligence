import logging
from sqlalchemy import select

from backend.app.agents.state import CheckInState
from backend.app.core.database import async_session_factory
from backend.app.core.logger import get_logger
from backend.app.models.attendance import AttendanceRecord, CheckInStatus
from backend.app.utils.time_rules import calculate_late_minutes, is_late, is_on_time

logger = get_logger(__name__)


async def monitoring_node(state: CheckInState) -> CheckInState:
    check_in_time = state["check_in_time"]
    logger.info(
        "monitoring node started for employee_id=%s attendance_record_id=%s check_in_time=%s",
        state["employee_id"],
        state["attendance_record_id"],
        check_in_time,
    )
    if is_on_time(check_in_time):
        check_in_status = CheckInStatus.present.value
        late_minutes = 0
    elif is_late(check_in_time):
        check_in_status = CheckInStatus.late.value
        late_minutes = calculate_late_minutes(check_in_time)
    else:
        check_in_status = CheckInStatus.present.value
        late_minutes = 0

    async with async_session_factory() as session:
        result = await session.execute(
            select(AttendanceRecord).where(AttendanceRecord.id == state["attendance_record_id"])
        )
        record = result.scalar_one()
        record.check_in_status = CheckInStatus(check_in_status)
        record.late_minutes = late_minutes
        await session.commit()

    logger.info(
        "monitoring node completed for attendance_record_id=%s status=%s late_minutes=%s",
        state["attendance_record_id"],
        check_in_status,
        late_minutes,
    )
    return {
        **state,
        "check_in_status": check_in_status,
        "late_minutes": late_minutes,
    }
