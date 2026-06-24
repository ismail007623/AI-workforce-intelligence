from pydantic import BaseModel


class PolicyUploadResponse(BaseModel):
    filename: str
    chunk_count: int
    message: str


class PolicyStatusResponse(BaseModel):
    has_policy: bool
    chunk_count: int
    namespace: str
    index_name: str
