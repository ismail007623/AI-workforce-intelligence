"""Password hashing and JWT helpers.

Only token hashes are stored in the database; raw refresh tokens are
never persisted and passwords are never logged.
"""

import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import HTTPException, status

from backend.app.core.config import get_settings
from backend.app.core.logger import get_logger

logger = get_logger(__name__)

_DUMMY_HASH = bcrypt.hashpw(b"dummy-password-for-timing", bcrypt.gensalt())


def _require_secret() -> str:
    """Return the configured JWT secret, failing fast when it is empty.

    Returns:
        The JWT secret key from settings.

    Raises:
        RuntimeError: If ``jwt_secret_key`` is not configured.
    """
    secret = get_settings().jwt_secret_key
    if not secret:
        raise RuntimeError(
            "JWT_SECRET_KEY is not configured. Set it in .env "
            "(generate one with: openssl rand -hex 32) and restart."
        )
    return secret


def hash_password(password: str) -> str:
    """Hash a plain-text password with bcrypt.

    Args:
        password: The plain-text password to hash.

    Returns:
        The bcrypt hash as a UTF-8 string.

    Raises:
        ValueError: If the password exceeds bcrypt's 72-byte limit.
    """
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise ValueError("Password must be at most 72 bytes.")
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash.

    Args:
        password: The plain-text password supplied by the user.
        hashed_password: The stored bcrypt hash.

    Returns:
        True when the password matches, otherwise False. Invalid hashes
        and over-long passwords return False instead of raising.
    """
    try:
        password_bytes = password.encode("utf-8")
        if len(password_bytes) > 72:
            return False
        return bcrypt.checkpw(password_bytes, hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        logger.error("Error verifying password: invalid stored hash format.")
        return False


def verify_password_or_dummy(password: str, hashed_password: str | None) -> bool:
    """Verify a password, using a dummy hash when no user exists.

    Args:
        password: The plain-text password supplied by the user.
        hashed_password: The stored bcrypt hash, or None when the
            account does not exist.

    Returns:
        True only when a real hash exists and matches. This keeps the
        timing of unknown-email and wrong-password failures similar.
    """
    if hashed_password is None:
        bcrypt.checkpw(password.encode("utf-8")[:72], _DUMMY_HASH)
        return False
    return verify_password(password, hashed_password)


def _build_token(
    user_id: int,
    email: str,
    role: str,
    employee_id: str | None,
    token_type: str,
    expires_delta: timedelta,
) -> str:
    """Build a signed JWT with a type claim.

    Args:
        user_id: Database id of the user.
        email: The user's email address.
        role: The user's role (``employee`` or ``hr``).
        employee_id: The linked employee code, or None for HR accounts.
        token_type: ``"access"`` or ``"refresh"``.
        expires_delta: How long the token stays valid.

    Returns:
        The encoded JWT string.
    """
    now = datetime.now(timezone.utc)
    payload = {
        "jti": str(uuid.uuid4()),
        "sub": str(user_id),
        "email": email,
        "role": role,
        "employee_id": employee_id,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    settings = get_settings()
    return jwt.encode(payload, _require_secret(), algorithm=settings.jwt_algorithm)


def create_access_token(
    user_id: int,
    email: str,
    role: str,
    employee_id: str | None,
) -> str:
    """Create a short-lived access token.

    Args:
        user_id: Database id of the user.
        email: The user's email address.
        role: The user's role (``employee`` or ``hr``).
        employee_id: The linked employee code, or None for HR accounts.

    Returns:
        The encoded access JWT string.
    """
    expires = timedelta(minutes=get_settings().access_token_expire_minutes)
    return _build_token(user_id, email, role, employee_id, "access", expires)


def create_refresh_token(
    user_id: int,
    email: str,
    role: str,
    employee_id: str | None,
) -> str:
    """Create a long-lived refresh token.

    Args:
        user_id: Database id of the user.
        email: The user's email address.
        role: The user's role (``employee`` or ``hr``).
        employee_id: The linked employee code, or None for HR accounts.

    Returns:
        The encoded refresh JWT string.
    """
    expires = timedelta(days=get_settings().refresh_token_expire_days)
    return _build_token(user_id, email, role, employee_id, "refresh", expires)


def decode_token(token: str, expected_type: str) -> dict:
    """Decode and validate a JWT, checking its type claim.

    Args:
        token: The encoded JWT string.
        expected_type: ``"access"`` or ``"refresh"``.

    Returns:
        The decoded token payload.

    Raises:
        HTTPException: 401 when the token is missing, expired, has a
            bad signature, or has the wrong type claim.
    """
    try:
        settings = get_settings()
        payload = jwt.decode(
            token,
            _require_secret(),
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError as exc:
        logger.error("Error decoding token: token has expired.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        ) from exc
    except jwt.InvalidTokenError as exc:
        logger.error("Error decoding token: invalid token.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        ) from exc
    if payload.get("type") != expected_type:
        logger.error("Error decoding token: wrong token type.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )
    return payload


def hash_refresh_token(token: str) -> str:
    """Hash a refresh token for storage.

    Args:
        token: The raw refresh token string.

    Returns:
        The SHA-256 hex digest of the token. Raw tokens are never
        stored or logged.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
