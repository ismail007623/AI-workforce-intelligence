from datetime import datetime, time
from zoneinfo import ZoneInfo
import uuid
from backend.app.core.config import Settings, get_settings


def _time_tuple(value: time) -> tuple[int, int]:
    return (value.hour, value.minute)


def now_in_tz(settings: Settings | None = None) -> datetime:
    settings = settings or get_settings()
    return datetime.now(settings.tz)


def today_in_tz(settings: Settings | None = None):
    return now_in_tz(settings).date()


def combine_date_time(record_date, clock_time: time, settings: Settings | None = None) -> datetime:
    settings = settings or get_settings()
    return datetime.combine(record_date, clock_time, tzinfo=settings.tz)


def is_on_time(check_in: datetime, settings: Settings | None = None) -> bool:
    settings = settings or get_settings()
    check_tuple = _time_tuple(check_in.astimezone(settings.tz).time())
    grace_tuple = _time_tuple(settings.grace_end)
    return check_tuple <= grace_tuple


def is_late(check_in: datetime, settings: Settings | None = None) -> bool:
    settings = settings or get_settings()
    check_tuple = _time_tuple(check_in.astimezone(settings.tz).time())
    grace_tuple = _time_tuple(settings.grace_end)
    return check_tuple > grace_tuple


def calculate_late_minutes(check_in: datetime, settings: Settings | None = None) -> int:
    settings = settings or get_settings()
    if not is_late(check_in, settings):
        return 0
    grace_end_dt = combine_date_time(check_in.astimezone(settings.tz).date(), settings.grace_end, settings)
    delta = check_in.astimezone(settings.tz) - grace_end_dt
    return max(int(delta.total_seconds() // 60), 0)


def is_early_leave(check_out: datetime, settings: Settings | None = None) -> bool:
    settings = settings or get_settings()
    check_tuple = _time_tuple(check_out.astimezone(settings.tz).time())
    end_tuple = _time_tuple(settings.office_end)
    return check_tuple < end_tuple


def calculate_early_leave_minutes(check_out: datetime, settings: Settings | None = None) -> int:
    settings = settings or get_settings()
    if not is_early_leave(check_out, settings):
        return 0
    office_end_dt = combine_date_time(check_out.astimezone(settings.tz).date(), settings.office_end, settings)
    delta = office_end_dt - check_out.astimezone(settings.tz)
    return max(int(delta.total_seconds() // 60), 0)


def compute_risk_level(late_count: int) -> str:
    if late_count < 3:
        return "low"
    if late_count <= 5:
        return "medium"
    return "high"


async def generate_conversation_id() -> str:
    """Generate a unique conversation ID."""
    return str(uuid.uuid4())
