from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from backend.app.models.attendance import CheckInStatus, CheckOutStatus


class EmployeeActionRequest(BaseModel):
    employee_id: str = Field(..., examples=["EMP001"])


class LateStats(BaseModel):
    late_arrivals_this_month: int
    average_delay_minutes: float
    risk_level: str


class CheckInResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    employee_id: str
    employee_name: str
    date: date
    check_in_time: datetime
    check_in_status: CheckInStatus
    late_minutes: int
    notification_sent: bool
    requires_late_reason: bool = False
    late_stats: LateStats | None = None


class CheckOutResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    employee_id: str
    employee_name: str
    date: date
    check_in_time: datetime | None
    check_out_time: datetime
    check_in_status: CheckInStatus | None
    check_out_status: CheckOutStatus
    early_leave_minutes: int


class AttendanceRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    employee_id: str
    employee_name: str
    department: str
    date: date
    check_in_time: datetime | None
    check_out_time: datetime | None
    check_in_status: CheckInStatus | None
    check_out_status: CheckOutStatus | None
    late_minutes: int
    early_leave_minutes: int


class AbsentEmployeeResponse(BaseModel):
    employee_id: str
    employee_name: str
    department: str


class EmployeeSummaryResponse(BaseModel):
    employee_id: str
    employee_name: str
    department: str
    today_status: str
    late_arrivals_this_month: int
    average_delay_minutes: float
    risk_level: str
    attendance_rate_this_month: float
    late_reason_pending: bool = False
    reliability_score: int | None = None
