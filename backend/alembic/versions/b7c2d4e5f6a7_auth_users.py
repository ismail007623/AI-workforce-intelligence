"""Add users and refresh_tokens tables for JWT authentication.

Revision ID: b7c2d4e5f6a7
Revises: 8410df4f6239
Create Date: 2026-11-04
Fixed: 2026-11-07 - idempotent against ``Base.metadata.create_all``.

Why this changed
---------------
The app creates the ``userrole`` type and the ``users`` /
``refresh_tokens`` tables itself at startup (``main.py`` lifespan runs
``Base.metadata.create_all``), while the initial migration
``8410df4f6239`` is empty and does nothing. The old version of this
file called ``_USER_ROLE.create(checkfirst=True)`` and then
``op.create_table("users", ... role=_USER_ROLE ...)``. The explicit
create was skipped, but ``create_table`` itself re-issued
``CREATE TYPE userrole AS ENUM ('employee', 'hr')`` (SQLAlchemy's
Enum ``_on_table_create`` runs without ``checkfirst``), so on any
database where the backend had already started, the migration failed
with ``asyncpg.exceptions.DuplicateObjectError: type "userrole"
already exists`` and Phases 1-3 never ran.

This version:
- creates the type only on Postgres, inside a ``DO`` block that
  swallows ``duplicate_object``, so it is a no-op when the type
  already exists (from ``create_all`` or a previous run);
- uses ``create_type=False`` on the Enum, so ``create_table`` never
  tries to create the type itself;
- creates each table (and its indexes) only when the table does not
  already exist, so a database where ``create_all`` already ran
  upgrades cleanly with no ``alembic stamp`` needed;
- includes ``'admin'`` in the enum values to match the current
  ``UserRole`` model (employee / hr / admin). Phase 1's
  ``ALTER TYPE ... ADD VALUE IF NOT EXISTS 'admin'`` stays harmless.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b7c2d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "8410df4f6239"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# create_type=False: the type is created by the DO block below (Postgres
# only) or already exists; create_table must never try to create it.
_USER_ROLE = sa.Enum("employee", "hr", "admin", name="userrole", create_type=False)


def upgrade() -> None:
    """Create the users and refresh_tokens tables (if not already there)."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if bind.dialect.name == "postgresql":
        # No-op when userrole already exists (e.g. created by
        # Base.metadata.create_all at app startup).
        op.execute(
            sa.text(
                "DO $$ BEGIN "
                "CREATE TYPE userrole AS ENUM ('employee', 'hr', 'admin'); "
                "EXCEPTION WHEN duplicate_object THEN null; "
                "END $$;"
            )
        )

    if not inspector.has_table("users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("name", sa.String(length=200), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("hashed_password", sa.String(length=255), nullable=False),
            sa.Column("role", _USER_ROLE, nullable=False),
            sa.Column("employee_id", sa.Integer(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["employee_id"], ["employees.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("email"),
            sa.UniqueConstraint("employee_id"),
        )
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    if not inspector.has_table("refresh_tokens"):
        op.create_table(
            "refresh_tokens",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("token_hash", sa.String(length=64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("token_hash"),
        )
        op.create_index("ix_refresh_tokens_token_hash", "refresh_tokens", ["token_hash"], unique=True)
        op.create_index("ix_refresh_tokens_user_id", "refresh_tokens", ["user_id"], unique=False)


def downgrade() -> None:
    """Drop the refresh_tokens and users tables (if present)."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if inspector.has_table("refresh_tokens"):
        op.drop_index("ix_refresh_tokens_user_id", table_name="refresh_tokens")
        op.drop_index("ix_refresh_tokens_token_hash", table_name="refresh_tokens")
        op.drop_table("refresh_tokens")
    if inspector.has_table("users"):
        op.drop_index("ix_users_email", table_name="users")
        op.drop_table("users")
    _USER_ROLE.drop(bind, checkfirst=True)
