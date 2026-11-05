from datetime import datetime

from pydantic import BaseModel, Field


class LateReasonSubmitRequest(BaseModel):
    employee_id: str
    reason: str = Field(..., min_length=3, max_length=2000)


class MeLateReasonRequest(BaseModel):
    """Late-reason body for the /me endpoint: reason only.

    The employee is resolved from the token, so there is no
    employee_id to fake.
    """

    reason: str = Field(..., min_length=3, max_length=2000)


class LateReasonEvaluationResponse(BaseModel):
    category: str
    validity_score: int
    risk_score: int
    decision: str
    explanation: str
    pattern_detected: bool = False
    pattern_summary: str | None = None
    reliability_score: int | None = None


class LateReasonSubmitResponse(BaseModel):
    employee_id: str
    attendance_id: int
    reason: str
    status: str
    evaluation: LateReasonEvaluationResponse | None = None


class LateIntelligenceRecord(BaseModel):
    employee_id: str
    employee_name: str
    department: str
    check_in_time: datetime | None
    late_minutes: int
    reason: str | None = None
    ai_category: str | None = None
    ai_decision: str | None = None
    validity_score: int | None = None
    risk_score: int | None = None
    reliability_score: int | None = None
    pattern_detected: bool = False
    pattern_summary: str | None = None
    reason_status: str | None = None
