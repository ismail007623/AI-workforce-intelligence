import logging
from datetime import datetime
from sqlalchemy import select
from backend.app.agents.state import CheckInState
from backend.app.core.config import get_settings
from backend.app.core.database import async_session_factory
from backend.app.core.logger import get_logger
from backend.app.models.attendance import NotificationLog, NotificationStatus
from backend.app.models.employee import Employee
from backend.app.services.email_service import build_late_arrival_email, send_email

logger = get_logger(__name__)


async def email_notification_node(state: CheckInState) -> CheckInState:
    try:
        if state.get("check_in_status") != "late":
            logger.info("email_notification skipped because check_in_status is not late for employee_id=%s", state["employee_id"])
            return {**state, "notification_sent": False}
    except Exception as e:
        raise Exception("")

    logger.info("email_notification started for employee_id=%s", state["employee_id"])
    settings = get_settings()
    check_in_time = state["check_in_time"]
    check_in_str = check_in_time.astimezone(settings.tz).strftime("%I:%M %p")
    body = build_late_arrival_email(state["employee_name"], check_in_str, settings.office_start_time)

    notification_sent = False
    log_status = NotificationStatus.skipped
    error_message = None

    try:
        await send_email(
            to_email=state["employee_email"],
            subject="Attendance Notice: Late Check-In",
            body=body,
        )
        notification_sent = True
        log_status = NotificationStatus.sent
        logger.info("email_notification sent to %s for employee_id=%s", state["employee_email"], state["employee_id"])
    except Exception as exc:
        log_status = NotificationStatus.failed
        error_message = str(exc)
        logger.error(
            "email_notification failed for employee_id=%s email=%s error=%s",
            state["employee_id"],
            state["employee_email"],
            error_message,
        )

    async with async_session_factory() as session:
        emp_result = await session.execute(select(Employee).where(Employee.employee_id == state["employee_id"]))
        employee = emp_result.scalar_one()
        log = NotificationLog(
            employee_id=employee.id,
            attendance_id=state["attendance_record_id"],
            type="late_arrival",
            sent_at=datetime.now(settings.tz),
            status=log_status,
            message=body if log_status == NotificationStatus.sent else (error_message or body),
        )
        session.add(log)
        await session.commit()
        logger.info(
            "notification log created for employee_id=%s attendance_id=%s status=%s",
            state["employee_id"],
            state["attendance_record_id"],
            log_status,
        )

    result_state: CheckInState = {**state, "notification_sent": notification_sent}
    if error_message:
        result_state["error"] = error_message
    return result_state
