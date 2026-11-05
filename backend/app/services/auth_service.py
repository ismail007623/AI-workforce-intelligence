"""Authentication service: signup, login, refresh and profile lookup.

Passwords and raw tokens are never logged. Only user ids and email
addresses appear in log lines.
"""

import re
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
from backend.app.models.employee import Department, Employee
from backend.app.models.user import RefreshToken, User, UserRole
from backend.app.schemas.auth import (
    AuthData,
    AuthUserResponse,
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


async def _get_or_create_department(session: AsyncSession, name: str) -> Department:
    """Load a department by name, creating it when it does not exist.

    Args:
        session: The database session.
        name: The department name.

    Returns:
        The existing or newly created department (flushed).
    """
    result = await session.execute(select(Department).where(Department.name == name))
    department = result.scalar_one_or_none()
    if department is None:
        department = Department(name=name)
        session.add(department)
        await session.flush()
    return department


async def _next_employee_id(session: AsyncSession) -> str:
    """Generate the next free employee code of the form EMP###.

    Args:
        session: The database session.

    Returns:
        The next unused employee code, derived deterministically from
        the highest existing EMP number.
    """
    result = await session.execute(select(Employee.employee_id))
    highest = 0
    for (code,) in result.all():
        match = re.fullmatch(r"EMP(\d+)", code or "")
        if match:
            highest = max(highest, int(match.group(1)))
    candidate_number = highest + 1
    while True:
        candidate = f"EMP{candidate_number:03d}"
        exists = await session.execute(
            select(Employee).where(Employee.employee_id == candidate)
        )
        if exists.scalar_one_or_none() is None:
            return candidate
        candidate_number += 1


async def _build_user_response(session: AsyncSession, user: User) -> AuthUserResponse:
    """Build the public profile response for a user.

    Args:
        session: The database session.
        user: The user to describe.

    Returns:
        The public profile, including the linked employee code and
        department when the account is linked to an employee.
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
    return AuthUserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
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
    """Create a new account, linking or creating an employee record.

    Args:
        session: The database session.
        payload: The validated signup payload.

    Returns:
        The new user's profile plus a fresh token pair.

    Raises:
        HTTPException: 409 when the email is already registered or the
            chosen employee record already has an account. 400 when an
            employee signup has no existing record and no department.
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

        employee: Employee | None = None
        if payload.role == UserRole.employee:
            if payload.employee_id:
                result = await session.execute(
                    select(Employee).where(Employee.employee_id == payload.employee_id)
                )
                employee = result.scalar_one_or_none()
                if employee is not None:
                    linked = await session.execute(
                        select(User).where(User.employee_id == employee.id)
                    )
                    if linked.scalar_one_or_none() is not None:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="This employee already has an account.",
                        )
            if employee is None:
                result = await session.execute(
                    select(Employee).where(Employee.email == email)
                )
                employee = result.scalar_one_or_none()
                if employee is not None:
                    linked = await session.execute(
                        select(User).where(User.employee_id == employee.id)
                    )
                    if linked.scalar_one_or_none() is not None:
                        raise HTTPException(
                            status_code=status.HTTP_409_CONFLICT,
                            detail="This employee already has an account.",
                        )
            if employee is None:
                if not payload.department:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Department is required for a new employee account.",
                    )
                department = await _get_or_create_department(
                    session, payload.department
                )
                code = payload.employee_id or await _next_employee_id(session)
                employee = Employee(
                    employee_id=code,
                    name=payload.name,
                    email=email,
                    department_id=department.id,
                )
                session.add(employee)
                await session.flush()

        user = User(
            name=payload.name,
            email=email,
            hashed_password=hash_password(payload.password),
            role=payload.role,
            employee_id=employee.id if employee is not None else None,
            is_active=True,
        )
        session.add(user)
        await session.flush()

        employee_code = employee.employee_id if employee is not None else None
        tokens = await _issue_token_pair(session, user, employee_code)
        profile = await _build_user_response(session, user)
        logger.info("User signed up successfully for user_id=%s.", user.id)
        return AuthData(user=profile, tokens=tokens)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error signing up user: {e}")
        raise Exception(f"Error signing up user: {str(e)}") from e


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
