"""Pydantic schemas for authentication payloads and responses."""

from pydantic import BaseModel, EmailStr, Field

from backend.app.models.invitation import InviteRole
from backend.app.models.user import UserRole


class SignupRequest(BaseModel):
    """Payload for creating a new employee account.

    Public signup is employee-only. The account is linked to an
    existing employee record (by employee code first, then by email).
    No new employee record is created, and the role cannot be chosen.
    """

    name: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Full name of the account holder.",
        examples=["Usman Ali"],
    )
    email: EmailStr = Field(
        ...,
        description="Email address used to sign in. Must match the employee record.",
        examples=["usman@example.com"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="Password, at least 8 characters.",
        examples=["correct-horse-battery"],
    )
    employee_id: str | None = Field(
        default=None,
        max_length=20,
        description="Existing employee code (for example EMP003) to link this account to. When omitted, an existing record is matched by email.",
        examples=["EMP003"],
    )


class CompanySignupRequest(BaseModel):
    """Payload for registering a new company plus its first admin.

    Creates the organization and its first Admin user. Email
    verification is not part of Phase 1.
    """

    company_name: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Name of the company being registered.",
        examples=["Acme Corp"],
    )
    admin_name: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Full name of the first admin.",
        examples=["Ayesha Khan"],
    )
    email: EmailStr = Field(
        ...,
        description="Email address of the first admin. Must be unique.",
        examples=["admin@acme.com"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="Password, at least 8 characters.",
        examples=["correct-horse-battery"],
    )
    timezone: str = Field(
        default="Asia/Karachi",
        max_length=100,
        description="IANA timezone for the organization.",
        examples=["Asia/Karachi"],
    )
    work_start: str = Field(
        default="10:00",
        pattern=r"^\d{2}:\d{2}$",
        description="Work start time, HH:MM.",
        examples=["10:00"],
    )
    work_end: str = Field(
        default="19:00",
        pattern=r"^\d{2}:\d{2}$",
        description="Work end time, HH:MM.",
        examples=["19:00"],
    )
    grace_minutes: int = Field(
        default=15,
        ge=0,
        le=120,
        description="Grace minutes after work start before a check-in is late.",
        examples=[15],
    )


class InvitationCreateRequest(BaseModel):
    """Payload for inviting one person to join the organization."""

    email: EmailStr = Field(
        ..., description="Email address of the person to invite.", examples=["sara@acme.com"]
    )
    role: InviteRole = Field(
        ...,
        description="Role to grant. Only hr and admin can be invited.",
        examples=["hr"],
    )


class InvitationAcceptRequest(BaseModel):
    """Payload for accepting an invitation with its raw token."""

    token: str = Field(
        ...,
        min_length=1,
        description="The raw invitation token shown to the inviter once.",
    )
    name: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="Full name of the person accepting.",
        examples=["Sara Ahmed"],
    )
    password: str = Field(
        ...,
        min_length=8,
        max_length=72,
        description="Password, at least 8 characters.",
        examples=["correct-horse-battery"],
    )


class InvitationResponse(BaseModel):
    """Public view of an invitation. Never includes a token hash."""

    id: int = Field(..., description="Database id of the invitation.", examples=[1])
    org_id: int = Field(..., description="Organization the invite belongs to.", examples=[1])
    email: str = Field(..., description="Invited email address.", examples=["sara@acme.com"])
    role: InviteRole = Field(..., description="Role the invite grants.", examples=["hr"])
    expires_at: str = Field(..., description="ISO timestamp when the invite expires.")
    used_at: str | None = Field(
        default=None, description="ISO timestamp when the invite was accepted, or null."
    )
    created_at: str = Field(..., description="ISO timestamp when the invite was created.")


class InvitationCreatedResponse(BaseModel):
    """An invitation plus its raw token, shown exactly once."""

    invitation: InvitationResponse = Field(..., description="The created invitation.")
    token: str = Field(
        ...,
        description="Raw invitation token. Store or share it now; it is never shown again.",
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
    org_id: int | None = Field(
        default=None,
        description="Organization the account belongs to, or null for legacy accounts.",
        examples=[1],
    )
    organization_name: str | None = Field(
        default=None,
        description="Name of the account's organization, or null.",
        examples=["Acme Corp"],
    )
    employee_id: str | None = Field(
        default=None,
        description="Linked employee code, or null for HR/Admin accounts.",
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
