from pydantic import BaseModel, EmailStr, Field


class EmployeeCreate(BaseModel):
    employee_id: str = Field(..., examples=["EMP011"])
    name: str
    email: EmailStr
    department: str


class EmployeeResponse(BaseModel):
    employee_id: str
    name: str
    email: str
    department: str
