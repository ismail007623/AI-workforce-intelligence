"""Authentication service: signup, login, refresh and profile lookup.

Passwords and raw tokens are never logged. Only user ids and email
addresses appear in log lines.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.config import get_settings
from backend.app.core.logger import get_logger
from backend.app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_refresh_token,
    verify_password_or_dummy,
)
from backend.app.models.employee import Employee
from backend.app.models.invitation import Invitation
from backend.app.models.organization import Organization, generate_pinecone_namespace
from backend.app.models.user import RefreshToken, User, UserRole
from backend.app.schemas.auth import (
    AuthData,
    AuthUserResponse,
    CompanySignupRequest,
    InvitationAcceptRequest,
    InvitationCreatedResponse,
    InvitationCreateRequest,
    InvitationResponse,
    LoginRequest,
    SignupRequest,
    TokenPair,
)

logger = get_logger(__name__)

_GENERIC_LOGIN_MESSAGE = "Invalid email or password."


def _normalise_email(email: str) -> str:
    """Normalise an email address for comparison and storage.

    Args:
        email: The raw email address supplied by the caller.

    Returns:
        The lower-cased, stripped email address.
    """
    return email.strip().lower()


async def _get_user_by_email(session: AsyncSession, email: str) -> User | None:
    """Load a user by normalised email address.

    Args:
        session: The database session.
        email: The email address to look up.

    Returns:
        The matching user, or None when no account uses the email.
    """
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


def _hash_invite_token(token: str) -> str:
    """Hash a raw invitation token for storage.

    Args:
        token: The raw invitation token.

    Returns:
        The SHA-256 hex digest of the token. Raw tokens are never
        stored or logged.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _invitation_response(invitation: Invitation) -> InvitationResponse:
    """Build the public view of an invitation.

    Args:
        invitation: The stored invitation row.

    Returns:
        The public invitation response, without any token material.
    """
    created_at = invitation.created_at
    return InvitationResponse(
        id=invitation.id,
        org_id=invitation.org_id,
        email=invitation.email,
        role=invitation.role,
        expires_at=invitation.expires_at.isoformat(),
        used_at=invitation.used_at.isoformat() if invitation.used_at else None,
        created_at=created_at.isoformat()
        if created_at is not None
        else datetime.now(timezone.utc).isoformat(),
    )


async def _find_linkable_employee(
    session: AsyncSession, employee_id: str | None, email: str
) -> Employee | None:
    """Find the existing employee record a signup may link to.

    Args:
        session: The database session.
        employee_id: The employee code supplied, or None.
        email: The normalised email address supplied.

    Returns:
        The matching employee, looked up by employee code first and
        then by email, or None when no record matches.
    """
    if employee_id:
        result = await session.execute(
            select(Employee).where(Employee.employee_id == employee_id)
        )
        employee = result.scalar_one_or_none()
        if employee is not None:
            return employee
    result = await session.execute(select(Employee).where(Employee.email == email))
    return result.scalar_one_or_none()


async def _build_user_response(session: AsyncSession, user: User) -> AuthUserResponse:
    """Build the public profile response for a user.

    Args:
        session: The database session.
        user: The user to describe.

    Returns:
        The public profile, including the linked employee code and
        department when the account is linked to an employee, plus
        the organization id and name when the account belongs to one.
    """
    employee = None
    department_name = None
    if user.employee_id is not None:
        result = await session.execute(
            select(Employee)
            .options(selectinload(Employee.department))
            .where(Employee.id == user.employee_id)
        )
        employee = result.scalar_one_or_none()
        if employee is not None and employee.department is not None:
            department_name = employee.department.name
    organization_name = None
    if user.org_id is not None:
        organization = await session.get(Organization, user.org_id)
        if organization is not None:
            organization_name = organization.name
    return AuthUserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        org_id=user.org_id,
        organization_name=organization_name,
        employee_id=employee.employee_id if employee is not None else None,
        department=department_name,
        is_active=user.is_active,
    )


async def _issue_token_pair(
    session: AsyncSession, user: User, employee_code: str | None
) -> TokenPair:
    """Issue an access/refresh pair and store the refresh-token hash.

    Args:
        session: The database session.
        user: The user the tokens belong to.
        employee_code: The linked employee code, or None for HR accounts.

    Returns:
        The issued token pair.
    """
    access_token = create_access_token(user.id, user.email, user.role.value, employee_code)
    refresh_token = create_refresh_token(
        user.id, user.email, user.role.value, employee_code
    )
    expires_at = datetime.now(timezone.utc) + timedelta(
        days=get_settings().refresh_token_expire_days
    )
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_refresh_token(refresh_token),
            expires_at=expires_at,
            revoked=False,
        )
    )
    await session.flush()
    logger.info("Tokens issued successfully for user_id=%s.", user.id)
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=get_settings().access_token_expire_minutes * 60,
    )


async def signup_user(session: AsyncSession, payload: SignupRequest) -> AuthData:
    """Create a new employee account linked to an existing record.

    Public signup is employee-only: the role is always employee and
    no new employee record is created. The signup must match an
    existing employee record (by employee code first, then by email);
    otherwise it fails and HR must add the employee first.

    Args:
        session: The database session.
        payload: The validated signup payload.

    Returns:
        The new user's profile plus a fresh token pair.

    Raises:
        HTTPException: 409 when the email is already registered or the
            chosen employee record already has an account. 400 when
            no existing employee record matches the signup.
        Exception: Re-raised with a generic message on unexpected
            database errors.
    """
    try:
        email = _normalise_email(str(payload.email))
        existing = await _get_user_by_email(session, email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        employee = await _find_linkable_employee(
            session, payload.employee_id, email
        )
        if employee is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Employee record not found. Ask HR to add you first.",
            )
        linked = await session.execute(
            select(User).where(User.employee_id == employee.id)
        )
        if linked.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This employee already has an account.",
            )

        user = User(
            name=payload.name,
            email=email,
            hashed_password=hash_password(payload.password),
            role=UserRole.employee,
            employee_id=employee.id,
            org_id=employee.org_id,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        tokens = await _issue_token_pair(session, user, employee.employee_id)
        profile = await _build_user_response(session, user)
        logger.info("User signed up successfully for user_id=%s.", user.id)
        return AuthData(user=profile, tokens=tokens)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error signing up user: {e}")
        raise Exception(f"Error signing up user: {str(e)}") from e


async def company_signup(
    session: AsyncSession, payload: CompanySignupRequest
) -> AuthData:
    """Register a new company and its first admin user.

    Creates the organization (with a server-generated Pinecone
    namespace) and an Admin account with no employee link. Email
    verification is not part of Phase 1.

    Args:
        session: The database session.
        payload: The validated company signup payload.

    Returns:
        The new admin's profile plus a fresh token pair.

    Raises:
        HTTPException: 409 when the admin email is already registered.
        Exception: Re-raised with a generic message on unexpected
            database errors.
    """
    try:
        email = _normalise_email(str(payload.email))
        existing = await _get_user_by_email(session, email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        organization = Organization(
            name=payload.company_name.strip(),
            timezone=payload.timezone.strip(),
            work_start=payload.work_start,
            work_end=payload.work_end,
            grace_minutes=payload.grace_minutes,
            pinecone_namespace=generate_pinecone_namespace(),
        )
        session.add(organization)
        await session.flush()

        user = User(
            name=payload.admin_name,
            email=email,
            hashed_password=hash_password(payload.password),
            role=UserRole.admin,
            employee_id=None,
            org_id=organization.id,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        tokens = await _issue_token_pair(session, user, None)
        profile = await _build_user_response(session, user)
        logger.info(
            "Company signed up successfully for org_id=%s user_id=%s.",
            organization.id,
            user.id,
        )
        return AuthData(user=profile, tokens=tokens)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error signing up company: {e}")
        raise Exception(f"Error signing up company: {str(e)}") from e


async def create_invitation(
    session: AsyncSession, creator: User, payload: InvitationCreateRequest
) -> InvitationCreatedResponse:
    """Create an HR/Admin invitation for the creator's organization.

    The raw token is returned exactly once so the inviter can share
    it; only its SHA-256 hash is stored.

    Args:
        session: The database session.
        creator: The HR or Admin user creating the invitation.
        payload: The validated invitation payload (email and role).

    Returns:
        The created invitation plus its raw token.

    Raises:
        HTTPException: 403 when the creator is not HR or Admin, or
            400 when the creator has no organization. 409 when an
            unused, unexpired invitation already exists for the
            same email in the same organization.
        Exception: Re-raised with a generic message on unexpected
            database errors.
    """
    try:
        if creator.role not in (UserRole.hr, UserRole.admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only HR or Admin can invite new users.",
            )
        if creator.org_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Your account is not linked to an organization yet.",
            )
        email = _normalise_email(str(payload.email))
        now = datetime.now(timezone.utc)
        pending = await session.execute(
            select(Invitation).where(
                Invitation.org_id == creator.org_id,
                Invitation.email == email,
                Invitation.used_at.is_(None),
                Invitation.expires_at > now,
            )
        )
        if pending.scalar_one_or_none() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An active invitation already exists for this email.",
            )
        token = secrets.token_urlsafe(32)
        invitation = Invitation(
            org_id=creator.org_id,
            email=email,
            role=payload.role,
            token_hash=_hash_invite_token(token),
            expires_at=now + timedelta(hours=24),
            used_at=None,
            created_by=creator.id,
        )
        session.add(invitation)
        await session.flush()
        logger.info(
            "Invitation created successfully for org_id=%s invitation_id=%s.",
            creator.org_id,
            invitation.id,
        )
        return InvitationCreatedResponse(
            invitation=_invitation_response(invitation), token=token
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invitation: {e}")
        raise Exception(f"Error creating invitation: {str(e)}") from e


async def accept_invitation(
    session: AsyncSession, payload: InvitationAcceptRequest
) -> AuthData:
    """Accept an invitation and create the invited account.

    Args:
        session: The database session.
        payload: The validated accept payload (raw token, name,
            password).

    Returns:
        The new user's profile plus a fresh token pair.

    Raises:
        HTTPException: 401 with a generic message for unknown,
            expired, or already-used tokens. 409 when the invited
            email is already registered.
        Exception: Re-raised with a generic message on unexpected
            database errors.
    """
    try:
        now = datetime.now(timezone.utc)
        result = await session.execute(
            select(Invitation).where(
                Invitation.token_hash == _hash_invite_token(payload.token)
            )
        )
        invitation = result.scalar_one_or_none()
        expires_at = invitation.expires_at if invitation is not None else None
        if expires_at is not None and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if (
            invitation is None
            or invitation.used_at is not None
            or expires_at is None
            or expires_at <= now
        ):
            logger.error("Error accepting invitation: invalid or expired invitation.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired invitation.",
            )
        email = invitation.email
        existing = await _get_user_by_email(session, email)
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )
        user = User(
            name=payload.name,
            email=email,
            hashed_password=hash_password(payload.password),
            role=UserRole(invitation.role.value),
            employee_id=None,
            org_id=invitation.org_id,
            is_active=True,
        )
        session.add(user)
        invitation.used_at = now
        await session.flush()

        tokens = await _issue_token_pair(session, user, None)
        profile = await _build_user_response(session, user)
        logger.info("Invitation accepted successfully for user_id=%s.", user.id)
        return AuthData(user=profile, tokens=tokens)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accepting invitation: {e}")
        raise Exception(f"Error accepting invitation: {str(e)}") from e


async def list_invitations(
    session: AsyncSession, user: User
) -> list[InvitationResponse]:
    """List the invitations of the caller's organization.

    Args:
        session: The database session.
        user: The HR or Admin user requesting the list.

    Returns:
        The organization's invitations, newest first. Token hashes
        are never included.

    Raises:
        HTTPException: 403 when the caller is not HR or Admin.
        Exception: Re-raised with a generic message on unexpected
            database errors.
    """
    try:
        if user.role not in (UserRole.hr, UserRole.admin):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only HR or Admin can list invitations.",
            )
        result = await session.execute(
            select(Invitation)
            .where(Invitation.org_id == user.org_id)
            .order_by(Invitation.created_at.desc())
        )
        invitations = result.scalars().all()
        logger.info(
            "Invitations listed successfully for org_id=%s.", user.org_id
        )
        return [_invitation_response(item) for item in invitations]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error listing invitations: {e}")
        raise Exception(f"Error listing invitations: {str(e)}") from e


async def authenticate_user(session: AsyncSession, payload: LoginRequest) -> AuthData:
    """Verify credentials and issue a fresh token pair.

    Args:
        session: The database session.
        payload: The validated login payload.

    Returns:
        The user's profile plus a fresh token pair.

    Raises:
        HTTPException: 401 with a generic message for unknown emails,
            wrong passwords, and inactive accounts alike.
        Exception: Re-raised with a generic message on unexpected
            database errors.
    """
    try:
        email = _normalise_email(str(payload.email))
        user = await _get_user_by_email(session, email)
        stored_hash = user.hashed_password if user is not None else None
        password_ok = verify_password_or_dummy(payload.password, stored_hash)
        if user is None or not password_ok or not user.is_active:
            logger.error("Error authenticating user: invalid credentials.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=_GENERIC_LOGIN_MESSAGE,
            )
        profile = await _build_user_response(session, user)
        tokens = await _issue_token_pair(session, user, profile.employee_id)
        logger.info("User authenticated successfully for user_id=%s.", user.id)
        return AuthData(user=profile, tokens=tokens)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error authenticating user: {e}")
        raise Exception(f"Error authenticating user: {str(e)}") from e


async def refresh_tokens(session: AsyncSession, refresh_token: str) -> AuthData:
    """Rotate a refresh token, revoking the previous one.

    Args:
        session: The database session.
        refresh_token: The raw refresh token supplied by the client.

    Returns:
        The user's profile plus a new token pair. The supplied refresh
        token is revoked and cannot be used again.

    Raises:
        HTTPException: 401 with a generic message when the token is
            invalid, expired, revoked, or unknown.
        Exception: Re-raised with a generic message on unexpected
            database errors.
    """
    try:
        payload = decode_token(refresh_token, expected_type="refresh")
        try:
            user_id = int(payload["sub"])
        except (KeyError, TypeError, ValueError) as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
            ) from exc
        result = await session.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == hash_refresh_token(refresh_token)
            )
        )
        stored = result.scalar_one_or_none()
        now = datetime.now(timezone.utc)
        stored_expires = stored.expires_at if stored is not None else None
        if stored_expires is not None and stored_expires.tzinfo is None:
            stored_expires = stored_expires.replace(tzinfo=timezone.utc)
        if (
            stored is None
            or stored.revoked
            or stored.user_id != user_id
            or stored_expires is None
            or stored_expires <= now
        ):
            logger.error("Error refreshing tokens: invalid or expired refresh token.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
            )
        user = await session.get(User, user_id)
        if user is None or not user.is_active:
            logger.error("Error refreshing tokens: user not found or inactive.")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
            )
        stored.revoked = True
        profile = await _build_user_response(session, user)
        tokens = await _issue_token_pair(session, user, profile.employee_id)
        logger.info("Tokens refreshed successfully for user_id=%s.", user.id)
        return AuthData(user=profile, tokens=tokens)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing tokens: {e}")
        raise Exception(f"Error refreshing tokens: {str(e)}") from e


async def revoke_refresh_token(session: AsyncSession, refresh_token: str) -> None:
    """Revoke a refresh token, ignoring invalid or unknown tokens.

    Args:
        session: The database session.
        refresh_token: The raw refresh token to revoke.

    Returns:
        None. Logout is idempotent: unknown or expired tokens are
        treated as already logged out.
    """
    try:
        result = await session.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == hash_refresh_token(refresh_token)
            )
        )
        stored = result.scalar_one_or_none()
        if stored is not None and not stored.revoked:
            stored.revoked = True
            await session.flush()
            logger.info("Refresh token revoked successfully.")
    except Exception as e:
        logger.error(f"Error revoking refresh token: {e}")
        raise Exception(f"Error revoking refresh token: {str(e)}") from e


async def get_user_profile(session: AsyncSession, user_id: int) -> AuthUserResponse:
    """Load the public profile for a user id.

    Args:
        session: The database session.
        user_id: The database id of the user.

    Returns:
        The public profile.

    Raises:
        HTTPException: 401 when the user does not exist or is inactive.
    """
    try:
        user = await session.get(User, user_id)
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token.",
            )
        profile = await _build_user_response(session, user)
        logger.info("User profile loaded successfully for user_id=%s.", user.id)
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading user profile: {e}")
        raise Exception(f"Error loading user profile: {str(e)}") from e
