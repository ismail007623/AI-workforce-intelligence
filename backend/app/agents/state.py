from datetime import datetime
from typing import TypedDict


class CheckInState(TypedDict, total=False):
    employee_id: str
    employee_name: str
    employee_email: str
    attendance_record_id: int
    check_in_time: datetime
    check_in_status: str
    late_minutes: int
    late_arrivals_count: int
    average_delay_minutes: float
    risk_level: str
    notification_sent: bool
    error: str | None
