from pydantic import BaseModel


class DepartmentEmployeeRow(BaseModel):
    employee_id: str
    employee_name: str
    late_count_month: int
    absent_count_month: int
    on_time_count_month: int
    concern_score: float | None = None
    avg_validity: float | None = None
    weak_reason_count: int = 0
    invalid_reason_count: int = 0
    reliability_score: int | None = None
    evaluation_status: str
