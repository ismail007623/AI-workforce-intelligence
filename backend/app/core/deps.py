"""Backwards-compatible re-exports for JWT auth dependencies.

The previous ``X-AWI-Role`` header trust has been removed. Import from
``backend.app.core.auth_deps`` directly in new code.
"""

from backend.app.core.auth_deps import (
    JWTBearer,
    get_current_user,
    require_hr_role,
    require_self_not_hr,
    require_self_or_hr,
    resolve_current_user,
)

__all__ = [
    "JWTBearer",
    "get_current_user",
    "require_hr_role",
    "require_self_not_hr",
    "require_self_or_hr",
    "resolve_current_user",
]
