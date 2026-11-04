import logging
import aiosmtplib
from email.message import EmailMessage
from backend.app.core.config import get_settings

logger = logging.getLogger(__name__)


def build_late_arrival_email(employee_name: str, check_in_time_str: str, office_start: str) -> str:
    return (
        f"Dear {employee_name},\n\n"
        f"We noticed that you checked in at {check_in_time_str} today.\n\n"
        f"According to company attendance policy, office hours begin at {office_start} AM "
        f"(with grace period until 10:15 AM).\n\n"
        "Please ensure timely attendance.\n\n"
        "Thank you."
    )


def build_hr_late_reason_alert(
    employee_name: str,
    reason: str,
    decision: str,
    category: str,
    validity_score: int,
    risk_score: int,
    explanation: str,
) -> str:
    return (
        f"HR Alert: Late reason requires attention\n\n"
        f"Employee: {employee_name}\n"
        f"Reason: {reason}\n\n"
        f"AI Category: {category}\n"
        f"Decision: {decision}\n"
        f"Validity Score: {validity_score}\n"
        f"Risk Score: {risk_score}\n\n"
        f"Explanation: {explanation}\n"
    )


def build_hr_high_risk_alert(employee_name: str, weak_invalid_count: int) -> str:
    return (
        f"High Risk Alert\n\n"
        f"Employee {employee_name} has submitted {weak_invalid_count} weak or invalid "
        f"late reasons in the last 30 days.\n\n"
        f"Manager review recommended."
    )

async def send_email(to_email: str, subject: str, body: str) -> None:
    settings = get_settings()
    if not settings.smtp_user or not settings.smtp_password:
        raise RuntimeError("SMTP credentials are not configured")

    message = EmailMessage()
    message["From"] = settings.smtp_from
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    smtp = aiosmtplib.SMTP(
        hostname=settings.smtp_host,
        port=587,
        username=settings.smtp_user,
        password=settings.smtp_password,
        local_hostname="localhost", 
        start_tls=True 
    )

    async with smtp:
        await smtp.send_message(message)

    logger.info("Email sent to %s", to_email)