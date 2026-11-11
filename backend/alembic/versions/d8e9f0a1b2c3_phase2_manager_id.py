"""Phase 2 org scoping: add employees.manager_id.

Revision ID: d8e9f0a1b2c3
Revises: c9d8e7f6a5b4
Create Date: 2026-11-05
Fixed: 2026-11-07 - idempotent against ``Base.metadata.create_all``.

Adds a nullable self-referencing ``manager_id`` to employees so the
``visible_user_ids`` scoping helper can answer "which employees does
this manager see" (employees whose manager_id is the manager's
linked employee id). No Manager role is added in Phase 2, so the
column is unused by any endpoint today; it is ready for when a
Manager role is added later.

Why this changed (2026-11-07 fix)
----------------------------------
The Employee model already carries ``manager_id`` (with index and
self-FK), so ``Base.metadata.create_all`` at app startup creates the
column, index and FK. The old version called ``op.add_column`` /
``op.create_index`` / ``op.create_foreign_key`` unguarded, which
fails with ``column "manager_id" already exists`` on any database
where the backend had already started with the Phase 2 code. Each
step below is now guarded by inspection, so it is a no-op for
anything ``create_all`` already built, and still builds it on a
fresh database.

Downgrade drops the column (and its Postgres foreign key).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d8e9f0a1b2c3"
down_revision: Union[str, Sequence[str], None] = "c9d8e7f6a5b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


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
    """Add the nullable manager_id column to employees."""
    bind = op.get_bind()
    if not sa.inspect(bind).has_table("employees"):
        return
    if not _has_column(bind, "employees", "manager_id"):
        op.add_column(
            "employees",
            sa.Column("manager_id", sa.Integer(), nullable=True),
        )
    if not _has_index(bind, "employees", "ix_employees_manager_id"):
        op.create_index(
            "ix_employees_manager_id", "employees", ["manager_id"], unique=False
        )
    # SQLite cannot add a foreign-key constraint with ALTER TABLE,
    # so it gets the column and index only; Postgres gets the FK.
    if bind.dialect.name == "sqlite":
        return
    if not _has_fk(bind, "employees", "fk_employees_manager_id_employees"):
        op.create_foreign_key(
            "fk_employees_manager_id_employees",
            "employees",
            "employees",
            ["manager_id"],
            ["id"],
        )


def downgrade() -> None:
    """Drop the manager_id column from employees."""
    bind = op.get_bind()
    if not sa.inspect(bind).has_table("employees"):
        return
    if bind.dialect.name != "sqlite":
        if _has_fk(bind, "employees", "fk_employees_manager_id_employees"):
            op.drop_constraint(
                "fk_employees_manager_id_employees", "employees", type_="foreignkey"
            )
    if _has_index(bind, "employees", "ix_employees_manager_id"):
        op.drop_index("ix_employees_manager_id", table_name="employees")
    if _has_column(bind, "employees", "manager_id"):
        op.drop_column("employees", "manager_id")
