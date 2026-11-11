"""Phase 1 multi-tenant foundation: organizations, org_id, invitations.

Revision ID: c9d8e7f6a5b4
Revises: b7c2d4e5f6a7
Create Date: 2026-11-05
Fixed: 2026-11-07 - idempotent against ``Base.metadata.create_all``.

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

Why this changed (2026-11-07 fix)
----------------------------------
The old version had the same trap as the login migration: it called
``_INVITE_ROLE.create(checkfirst=True)`` and then
``op.create_table("invitations", ... role=_INVITE_ROLE ...)``, and
``create_table`` re-issues ``CREATE TYPE inviterole`` without
``checkfirst``. If the backend had already started with the Phase 1
code, ``create_all`` had already created the ``inviterole`` type, the
``organizations`` and ``invitations`` tables, the ``org_id`` columns
and their indexes/FKs — so this migration would fail with
``type "inviterole" already exists`` (or ``relation "organizations"
already exists`` / ``column "org_id" already exists``) right after
the login migration was fixed. Every create/add step below is now
guarded by inspection, so the migration is a no-op for anything
``create_all`` already built, and still builds everything on a
fresh database.

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

# create_type=False: the type is created by the DO block below (Postgres
# only) or already exists; create_table must never try to create it.
_INVITE_ROLE = sa.Enum("hr", "admin", name="inviterole", create_type=False)

_ORG_ID_TABLES = (
    "users",
    "employees",
    "departments",
    "attendance_records",
    "policy_uploads",
)


def _has_column(bind, table: str, column: str) -> bool:
    if not sa.inspect(bind).has_table(table):
        return False
    return any(c["name"] == column for c in sa.inspect(bind).get_columns(table))


def _has_index(bind, table: str, index: str) -> bool:
    if not sa.inspect(bind).has_table(table):
        return False
    return any(i["name"] == index for i in sa.inspect(bind).get_indexes(table))


def _has_fk(bind, table: str, fk_name: str) -> bool:
    if not sa.inspect(bind).has_table(table):
        return False
    return any(f["name"] == fk_name for f in sa.inspect(bind).get_foreign_keys(table))


def upgrade() -> None:
    """Create organizations/invitations, add org_id, backfill data."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    is_postgres = bind.dialect.name == "postgresql"

    if is_postgres:
        # ADD VALUE cannot use the new value in the same transaction
        # on older Postgres, so run it in its own autocommit block.
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin'")
        # No-op when inviterole already exists (created by create_all).
        op.execute(
            sa.text(
                "DO $$ BEGIN "
                "CREATE TYPE inviterole AS ENUM ('hr', 'admin'); "
                "EXCEPTION WHEN duplicate_object THEN null; "
                "END $$;"
            )
        )

    if not inspector.has_table("organizations"):
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

    if not inspector.has_table("invitations"):
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
        # runs. Only touch tables that already exist, and only add
        # the column/index when create_all has not already built it.
        if not inspector.has_table(table):
            continue
        if not _has_column(bind, table, "org_id"):
            op.add_column(
                table,
                sa.Column("org_id", sa.Integer(), nullable=True),
            )
        if not _has_index(bind, table, f"ix_{table}_org_id"):
            op.create_index(f"ix_{table}_org_id", table, ["org_id"], unique=False)
    for table, target in (
        ("users", "organizations"),
        ("employees", "organizations"),
        ("departments", "organizations"),
        ("attendance_records", "organizations"),
        ("policy_uploads", "organizations"),
    ):
        if not inspector.has_table(table):
            continue
        # SQLite cannot add a foreign-key constraint with ALTER TABLE,
        # so it gets the column and index only; Postgres gets the FK.
        if bind.dialect.name == "sqlite":
            continue
        fk_name = f"fk_{table}_org_id_{target}"
        if not _has_fk(bind, table, fk_name):
            op.create_foreign_key(
                fk_name, table, target, ["org_id"], ["id"]
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
        # Only present when create_all already ran with the Phase 3
        # models (pinecone_migrated is NOT NULL there): the row below
        # must include it, or the insert fails.
        sa.column("pinecone_migrated", sa.Boolean()),
    )
    default_org_row = {
        "name": "Default Organization",
        "timezone": "Asia/Karachi",
        "work_start": "10:00",
        "work_end": "19:00",
        "grace_minutes": 15,
        "pinecone_namespace": namespace,
        "created_at": now,
        "updated_at": now,
    }
    if _has_column(bind, "organizations", "pinecone_migrated"):
        default_org_row["pinecone_migrated"] = False
    op.bulk_insert(
        organizations,
        [default_org_row],
    )
    default_org_id = bind.execute(
        sa.select(sa.column("id"))
        .select_from(organizations)
        .where(sa.column("pinecone_namespace") == namespace)
    ).scalar_one()
    for table in _ORG_ID_TABLES:
        if not inspector.has_table(table):
            continue
        bind.execute(
            sa.text(f"UPDATE {table} SET org_id = :org_id WHERE org_id IS NULL"),
            {"org_id": default_org_id},
        )


def downgrade() -> None:
    """Drop org_id columns and the new tables."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for table, target in (
        ("users", "organizations"),
        ("employees", "organizations"),
        ("departments", "organizations"),
        ("attendance_records", "organizations"),
        ("policy_uploads", "organizations"),
    ):
        if not inspector.has_table(table):
            continue
        if bind.dialect.name == "sqlite":
            continue
        if _has_fk(bind, table, f"fk_{table}_org_id_{target}"):
            op.drop_constraint(f"fk_{table}_org_id_{target}", table, type_="foreignkey")
    for table in _ORG_ID_TABLES:
        if not inspector.has_table(table):
            continue
        if _has_index(bind, table, f"ix_{table}_org_id"):
            op.drop_index(f"ix_{table}_org_id", table_name=table)
        if _has_column(bind, table, "org_id"):
            op.drop_column(table, "org_id")
    if inspector.has_table("invitations"):
        if _has_index(bind, "invitations", "ix_invitations_token_hash"):
            op.drop_index("ix_invitations_token_hash", table_name="invitations")
        if _has_index(bind, "invitations", "ix_invitations_org_id"):
            op.drop_index("ix_invitations_org_id", table_name="invitations")
        if _has_index(bind, "invitations", "ix_invitations_email"):
            op.drop_index("ix_invitations_email", table_name="invitations")
        op.drop_table("invitations")
    _INVITE_ROLE.drop(bind, checkfirst=True)
    if inspector.has_table("organizations"):
        if _has_index(bind, "organizations", "ix_organizations_pinecone_namespace"):
            op.drop_index(
                "ix_organizations_pinecone_namespace", table_name="organizations"
            )
        op.drop_table("organizations")
