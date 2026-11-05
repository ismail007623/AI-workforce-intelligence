"""Phase 2 org scoping: add employees.manager_id.

Revision ID: d8e9f0a1b2c3
Revises: c9d8e7f6a5b4
Create Date: 2026-11-05

Adds a nullable self-referencing ``manager_id`` to employees so the
``visible_user_ids`` scoping helper can answer "which employees does
this manager see" (employees whose manager_id is the manager's
linked employee id). No Manager role is added in Phase 2, so the
column is unused by any endpoint today; it is ready for when a
Manager role is added later.

Downgrade drops the column (and its Postgres foreign key).
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "d8e9f0a1b2c3"
down_revision: Union[str, Sequence[str], None] = "c9d8e7f6a5b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the nullable manager_id column to employees."""
    bind = op.get_bind()
    if not sa.inspect(bind).has_table("employees"):
        return
    op.add_column(
        "employees",
        sa.Column("manager_id", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_employees_manager_id", "employees", ["manager_id"], unique=False
    )
    # SQLite cannot add a foreign-key constraint with ALTER TABLE,
    # so it gets the column and index only; Postgres gets the FK.
    if bind.dialect.name == "sqlite":
        return
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
        op.drop_constraint(
            "fk_employees_manager_id_employees", "employees", type_="foreignkey"
        )
    op.drop_index("ix_employees_manager_id", table_name="employees")
    op.drop_column("employees", "manager_id")
