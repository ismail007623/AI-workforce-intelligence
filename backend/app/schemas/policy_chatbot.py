from pydantic import BaseModel


class PolicyChatRequest(BaseModel):
    employee_id: str        # e.g. "EMP001"
    conversation_id: str | None = None
    message: str