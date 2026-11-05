"""Invitation model: one-time invites for HR and Admin accounts.

Only the SHA-256 hash of the invite token is stored. The raw token is
shown to the inviting HR/Admin exactly once, when the invitation is
created, and is never stored or logged.
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base


class InviteRole(str, enum.Enum):
    """Roles that can be granted through an invitation."""

    hr = "hr"
    admin = "admin"


class Invitation(Base):
    """An invitation for one email address to join an organization."""

    __tablename__ = "invitations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    org_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("organizations.id"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    role: Mapped[InviteRole] = mapped_column(Enum(InviteRole), nullable=False)
    token_hash: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_by: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    organization = relationship("Organization", back_populates="invitations")
