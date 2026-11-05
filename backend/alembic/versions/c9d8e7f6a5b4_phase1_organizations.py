"""Phase 1 multi-tenant foundation: organizations, org_id, invitations.

Revision ID: c9d8e7f6a5b4
Revises: b7c2d4e5f6a7
Create Date: 2026-11-05

Adds the organizations and invitations tables, adds nullable org_id
columns to users, employees, departments, attendance_records and
policy_uploads, and adds 'admin' to the userrole enum (Postgres only).

Data migration: creates one "Default Organization" and assigns every
existing row with NULL org_id to it, so pre-tenant data keeps working
as a single company. The Pinecone namespace for the default org is
generated server-side (``org-<12 hex chars>``). The base tables are
created by ``Base.metadata.create_all`` at app startup rather than by
the initial migration, so org_id columns are only added to tables
that already exist when this migration runs.

Downgrade drops the new tables and columns. The 'admin' enum value
cannot be removed from a Postgres enum, so downgrade leaves it in
place; that is harmless.
"""

from datetime import datetime, timezone
from typing import Sequence, Union
import uuid

import sqlalchemy as sa
from alembic import op

revision: str = "c9d8e7f6a5b4"
down_revision: Union[str, Sequence[str], None] = "b7c2d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_INVITE_ROLE = sa.Enum("hr", "admin", name="inviterole")

_ORG_ID_TABLES = (
    "users",
    "employees",
    "departments",
    "attendance_records",
    "policy_uploads",
)


def upgrade() -> None:
    """Create organizations/invitations, add org_id, backfill data."""
    bind = op.get_bind()
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        # ADD VALUE cannot use the new value in the same transaction
        # on older Postgres, so run it in its own autocommit block.
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin'")

    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column(
            "timezone", sa.String(length=100), nullable=False, server_default="Asia/Karachi"
        ),
        sa.Column(
            "work_start", sa.String(length=5), nullable=False, server_default="10:00"
        ),
        sa.Column(
            "work_end", sa.String(length=5), nullable=False, server_default="19:00"
        ),
        sa.Column("grace_minutes", sa.Integer(), nullable=False, server_default="15"),
        sa.Column("pinecone_namespace", sa.String(length=100), nullable=False),
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
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("pinecone_namespace"),
    )
    op.create_index(
        "ix_organizations_pinecone_namespace",
        "organizations",
        ["pinecone_namespace"],
        unique=True,
    )

    _INVITE_ROLE.create(bind, checkfirst=True)
    op.create_table(
        "invitations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("org_id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("role", _INVITE_ROLE, nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_invitations_email", "invitations", ["email"], unique=False)
    op.create_index("ix_invitations_org_id", "invitations", ["org_id"], unique=False)
    op.create_index(
        "ix_invitations_token_hash", "invitations", ["token_hash"], unique=True
    )

    for table in _ORG_ID_TABLES:
        # Base tables (employees, departments, ...) are created by
        # Base.metadata.create_all at app startup, not by the initial
        # migration, so they may not exist yet when this migration
        # runs. Only touch tables that already exist.
        if not sa.inspect(bind).has_table(table):
            continue
        op.add_column(
            table,
            sa.Column("org_id", sa.Integer(), nullable=True),
        )
        op.create_index(f"ix_{table}_org_id", table, ["org_id"], unique=False)
    for table, target in (
        ("users", "organizations"),
        ("employees", "organizations"),
        ("departments", "organizations"),
        ("attendance_records", "organizations"),
        ("policy_uploads", "organizations"),
    ):
        if not sa.inspect(bind).has_table(table):
            continue
        # SQLite cannot add a foreign-key constraint with ALTER TABLE,
        # so it gets the column and index only; Postgres gets the FK.
        if bind.dialect.name == "sqlite":
            continue
        op.create_foreign_key(
            f"fk_{table}_org_id_{target}", table, target, ["org_id"], ["id"]
        )

    # Data migration: one default organization for all existing rows.
    now = datetime.now(timezone.utc)
    namespace = f"org-{uuid.uuid4().hex[:12]}"
    organizations = sa.table(
        "organizations",
        sa.column("id", sa.Integer()),
        sa.column("name", sa.String()),
        sa.column("timezone", sa.String()),
        sa.column("work_start", sa.String()),
        sa.column("work_end", sa.String()),
        sa.column("grace_minutes", sa.Integer()),
        sa.column("pinecone_namespace", sa.String()),
        sa.column("created_at", sa.DateTime(timezone=True)),
        sa.column("updated_at", sa.DateTime(timezone=True)),
    )
    op.bulk_insert(
        organizations,
        [
            {
                "name": "Default Organization",
                "timezone": "Asia/Karachi",
                "work_start": "10:00",
                "work_end": "19:00",
                "grace_minutes": 15,
                "pinecone_namespace": namespace,
                "created_at": now,
                "updated_at": now,
            }
        ],
    )
    default_org_id = bind.execute(
        sa.select(sa.column("id"))
        .select_from(organizations)
        .where(sa.column("pinecone_namespace") == namespace)
    ).scalar_one()
    for table in _ORG_ID_TABLES:
        if not sa.inspect(bind).has_table(table):
            continue
        bind.execute(
            sa.text(f"UPDATE {table} SET org_id = :org_id WHERE org_id IS NULL"),
            {"org_id": default_org_id},
        )


def downgrade() -> None:
    """Drop org_id columns and the new tables."""
    bind = op.get_bind()
    for table, target in (
        ("users", "organizations"),
        ("employees", "organizations"),
        ("departments", "organizations"),
        ("attendance_records", "organizations"),
        ("policy_uploads", "organizations"),
    ):
        if not sa.inspect(bind).has_table(table):
            continue
        if bind.dialect.name == "sqlite":
            continue
        op.drop_constraint(f"fk_{table}_org_id_{target}", table, type_="foreignkey")
    for table in _ORG_ID_TABLES:
        if not sa.inspect(bind).has_table(table):
            continue
        op.drop_index(f"ix_{table}_org_id", table_name=table)
        op.drop_column(table, "org_id")
    op.drop_index("ix_invitations_token_hash", table_name="invitations")
    op.drop_index("ix_invitations_org_id", table_name="invitations")
    op.drop_index("ix_invitations_email", table_name="invitations")
    op.drop_table("invitations")
    _INVITE_ROLE.drop(op.get_bind(), checkfirst=True)
    op.drop_index(
        "ix_organizations_pinecone_namespace", table_name="organizations"
    )
    op.drop_table("organizations")
