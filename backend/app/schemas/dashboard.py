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


class DailyTrendPoint(BaseModel):
    date: str
    day: str
    present: int
    late: int
    absent: int
