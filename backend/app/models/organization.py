"""Organization model: one tenant (company) in the multi-tenant system.

Every company gets one row here. The Pinecone namespace for the
company is derived from this row and is generated server-side only,
never from client input.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.core.database import Base


def generate_pinecone_namespace() -> str:
    """Generate a unique Pinecone namespace name for a new organization.

    Returns:
        A namespace name of the form ``org-<12 hex chars>``. The
        random suffix keeps namespaces unguessable; the name is never
        derived from the company name.
    """
    return f"org-{uuid.uuid4().hex[:12]}"


class Organization(Base):
    """A company (tenant). Users, employees and data belong to one org."""

    __tablename__ = "organizations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    timezone: Mapped[str] = mapped_column(
        String(100), nullable=False, default="Asia/Karachi"
    )
    work_start: Mapped[str] = mapped_column(
        String(5), nullable=False, default="10:00"
    )
    work_end: Mapped[str] = mapped_column(String(5), nullable=False, default="19:00")
    grace_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=15)
    pinecone_namespace: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
        default=generate_pinecone_namespace,
    )
    pinecone_migrated: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    users = relationship("User", back_populates="organization")
    employees = relationship("Employee", back_populates="organization")
    departments = relationship("Department", back_populates="organization")
    invitations = relationship("Invitation", back_populates="organization")
