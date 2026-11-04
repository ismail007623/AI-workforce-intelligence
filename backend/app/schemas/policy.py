from datetime import datetime

from pydantic import BaseModel, ConfigDict


class PolicyUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    filename: str
    chunk_count: int
    page_count: int
    file_size_bytes: int
    uploaded_at: datetime
    last_updated_at: datetime
    message: str


class PolicyStatusResponse(BaseModel):
    has_policy: bool
    chunk_count: int
    namespace: str
    index_name: str
    filename: str | None = None
    page_count: int | None = None
    file_size_bytes: int | None = None
    uploaded_by: str | None = None
    uploaded_at: datetime | None = None
    last_updated_at: datetime | None = None
    status: str | None = None


class PolicyHistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    uploaded_by: str
    uploaded_at: datetime
    status: str
    page_count: int
    file_size_bytes: int
