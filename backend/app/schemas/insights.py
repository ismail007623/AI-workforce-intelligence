from pydantic import BaseModel, Field


class InsightsQueryRequest(BaseModel):
    question: str = Field(..., examples=["Which employees have attendance issues this month?"])


class InsightsResponse(BaseModel):
    question: str
    summary: str
    key_findings: list[str]
    recommendations: list[str]
    raw_answer: str
