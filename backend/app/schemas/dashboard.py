from pydantic import BaseModel


class DashboardSummary(BaseModel):
    total_employees: int
    present: int
    late: int
    absent: int
    early_left: int
    attendance_rate: float


class DepartmentStats(BaseModel):
    department: str
    total_employees: int
    present: int
    late: int
    absent: int
    early_left: int
    lateness_rate: float
    attendance_rate: float = 0.0
    valid_reasons: int = 0
    weak_reasons: int = 0
    invalid_reasons: int = 0
    avg_reliability: float = 0.0
    department_risk_level: str = "Low"


class DailyTrendPoint(BaseModel):
    date: str
    day: str
    present: int
    late: int
    absent: int
