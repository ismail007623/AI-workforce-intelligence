"""JWT bearer and role dependencies.

These replace the previous ``X-AWI-Role`` header trust: every protected
route resolves the caller from a signed access token.
"""

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.logger import get_logger
from backend.app.core.security import decode_token
from backend.app.models.employee import Employee
from backend.app.models.user import User, UserRole

logger = get_logger(__name__)


class JWTBearer(HTTPBearer):
    """Extract a bearer token from the Authorization header.

    Returns the raw token string so endpoints read like the project's
    existing style. Missing or non-bearer credentials raise 401.
    """

    def __init__(self, auto_error: bool = False) -> None:
        super().__init__(auto_error=auto_error)

    async def __call__(self, request: Request) -> str:
        """Return the bearer token from the request, or raise 401.

        Args:
            request: The incoming FastAPI request.

        Returns:
            The raw bearer token string.

        Raises:
            HTTPException: 401 when no bearer token is present.
        """
        credentials: HTTPAuthorizationCredentials | None = await super().__call__(
            request
        )
        if credentials is None or credentials.scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Not authenticated.",
            )
        return credentials.credentials


async def resolve_current_user(
    session: AsyncSession, token: str
) -> User:
    """Resolve the user behind an access token.

    Args:
        session: The database session.
        token: The raw access token string.

    Returns:
        The authenticated, active user.

    Raises:
        HTTPException: 401 when the token is invalid/expired or the
            user does not exist or is inactive.
    """
    payload = decode_token(token, expected_type="access")
    try:
        user_id = int(payload["sub"])
    except (KeyError, TypeError, ValueError) as exc:
        logger.error("Error resolving current user: token has no valid subject.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        ) from exc
    user = await session.get(User, user_id)
    if user is None or not user.is_active:
        logger.error("Error resolving current user: user not found or inactive.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )
    return user


async def get_current_user(
    token: str = Depends(JWTBearer()),
    session: AsyncSession = Depends(get_db),
) -> User:
    """FastAPI dependency returning the authenticated user.

    Args:
        token: The bearer token extracted by :class:`JWTBearer`.
        session: The database session.

    Returns:
        The authenticated, active user.
    """
    return await resolve_current_user(session, token)


async def require_hr_role(
    current_user: User = Depends(get_current_user),
) -> User:
    """FastAPI dependency requiring the HR role.

    Args:
        current_user: The authenticated user resolved by
            :func:`get_current_user`.

    Returns:
        The authenticated HR user.

    Raises:
        HTTPException: 403 when the user is not HR.
    """
    if current_user.role != UserRole.hr:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR access required.",
        )
    return current_user


async def _own_employee_code(session: AsyncSession, user: User) -> str | None:
    """Return the employee code linked to a user, if any.

    Args:
        session: The database session.
        user: The authenticated user.

    Returns:
        The linked employee code, or None for unlinked accounts.
    """
    if user.employee_id is None:
        return None
    result = await session.execute(
        select(Employee.employee_id).where(Employee.id == user.employee_id)
    )
    return result.scalar_one_or_none()


async def require_self_or_hr(
    session: AsyncSession, current_user: User, employee_id: str
) -> User:
    """Allow HR users, or employees acting on their own record only.

    Args:
        session: The database session.
        current_user: The authenticated user.
        employee_id: The employee code being accessed.

    Returns:
        The authenticated user.

    Raises:
        HTTPException: 403 when an employee accesses another
            employee's record.
    """
    if current_user.role == UserRole.hr:
        return current_user
    own_code = await _own_employee_code(session, current_user)
    if own_code is None or own_code != employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only access your own records.",
        )
    return current_user


async def require_self_not_hr(
    session: AsyncSession, current_user: User, employee_id: str
) -> User:
    """Allow only the owning employee (never HR) for check-in/out actions.

    Args:
        session: The database session.
        current_user: The authenticated user.
        employee_id: The employee code being acted on.

    Returns:
        The authenticated user.

    Raises:
        HTTPException: 403 when an HR account attempts the action or
            an employee acts on another employee's record.
    """
    if current_user.role == UserRole.hr:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="HR accounts cannot check in or out.",
        )
    own_code = await _own_employee_code(session, current_user)
    if own_code is None or own_code != employee_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only act on your own record.",
        )
    return current_user
