"""Pydantic schemas for authentication payloads and responses."""

from pydantic import BaseModel, EmailStr, Field

from backend.app.models.user import UserRole


class SignupRequest(BaseModel):
    """Payload for creating a new account."""

    name: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Full name of the account holder.",
        examples=["Usman Ali"],
    )
    email: EmailStr = Field(
        ...,
        description="Email address used to sign in. Must be unique.",
        examples=["usman@example.com"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="Password, at least 8 characters.",
        examples=["correct-horse-battery"],
    )
    role: UserRole = Field(
        default=UserRole.employee,
        description="Account role. Employee accounts link to an employee record; HR accounts do not.",
        examples=["employee"],
    )
    department: str | None = Field(
        default=None,
        max_length=100,
        description="Department for a new employee record. Required only when signing up as an employee with no existing employee record.",
        examples=["Engineering"],
    )
    employee_id: str | None = Field(
        default=None,
        max_length=20,
        description="Existing employee code (for example EMP003) to link this account to. When omitted for an employee, an existing record is matched by email, otherwise a new record is created.",
        examples=["EMP003"],
    )


class LoginRequest(BaseModel):
    """Payload for signing in with email and password."""

    email: EmailStr = Field(
        ..., description="Email address of the account.", examples=["usman@example.com"]
    )
    password: str = Field(
        ...,
        min_length=1,
        max_length=72,
        description="Account password.",
        examples=["correct-horse-battery"],
    )


class RefreshRequest(BaseModel):
    """Payload for rotating a refresh token or revoking it on logout."""

    refresh_token: str = Field(
        ...,
        min_length=1,
        description="The refresh token issued at login or signup.",
    )


class TokenPair(BaseModel):
    """An access token plus its refresh token."""

    access_token: str = Field(..., description="Short-lived JWT for API calls.")
    refresh_token: str = Field(..., description="Long-lived JWT used only to refresh.")
    token_type: str = Field(default="bearer", description="Token type for the Authorization header.")
    expires_in: int = Field(
        ..., description="Access-token lifetime in seconds.", examples=[900]
    )


class AuthUserResponse(BaseModel):
    """Public profile of the authenticated user. Never includes a password."""

    id: int = Field(..., description="Database id of the user.", examples=[1])
    name: str = Field(..., description="Full name.", examples=["Usman Ali"])
    email: str = Field(..., description="Email address.", examples=["usman@example.com"])
    role: UserRole = Field(..., description="Account role.", examples=["employee"])
    employee_id: str | None = Field(
        default=None,
        description="Linked employee code, or null for HR accounts.",
        examples=["EMP003"],
    )
    department: str | None = Field(
        default=None,
        description="Department of the linked employee record, or null for HR accounts.",
        examples=["Engineering"],
    )
    is_active: bool = Field(..., description="Whether the account may sign in.")


class AuthData(BaseModel):
    """User profile plus the token pair issued for a fresh session."""

    user: AuthUserResponse = Field(..., description="Profile of the signed-in user.")
    tokens: TokenPair = Field(..., description="Access and refresh tokens for the session.")


MeResponse = AuthUserResponse
