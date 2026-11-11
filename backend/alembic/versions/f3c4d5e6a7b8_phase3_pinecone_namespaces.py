"""Phase 3: per-org Pinecone migration flag + department uniqueness.

Revision ID: f3c4d5e6a7b8
Revises: d8e9f0a1b2c3
Create Date: 2026-11-05

1. ``organizations.pinecone_migrated`` (boolean, default False):
   records whether the one-time legacy-namespace migration has
   run for the org, so POST /policy/migrate-namespaces refuses
   to run twice.
2. ``departments`` uniqueness becomes composite (org_id, name):
   two companies may both have a department called
   "Engineering", but one company still cannot have the same
   department name twice.

Postgres drops the old unique constraint on ``name`` (found by
inspection, whatever its generated name is) and creates the
composite constraint. SQLite cannot drop a constraint in place
and the old ``UNIQUE (name)`` is unnamed in reflection, so
batch mode cannot drop it either — the table is rebuilt with
explicit DDL (copy, drop, rename) instead. Downgrade reverses
both steps.

Downgrade restores the global unique constraint on ``name``
and drops the migration flag column.

Fixed: 2026-11-07 - idempotent against ``Base.metadata.create_all``.
The Department model already carries the composite
``UniqueConstraint("org_id", "name", name="uq_department_org_name")``
and the Organization model already carries ``pinecone_migrated``, so
``create_all`` at app startup builds both. The old version called
``op.add_column("organizations", pinecone_migrated)`` and
``op.create_unique_constraint("uq_department_org_name", ...)``
unguarded, which fails with ``column already exists`` /
``duplicate object`` on any database where the backend had already
started with the Phase 3 code. Each step below is now guarded by
inspection, so it is a no-op for anything ``create_all`` already
built, and still builds it on a fresh database.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "f3c4d5e6a7b8"
down_revision: Union[str, Sequence[str], None] = "d8e9f0a1b2c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _old_name_unique_constraint(bind) -> str | None:
    """Find the unique constraint on departments.name, if any.

    Args:
        bind: The migration connection.

    Returns:
        The constraint name, or ``None`` when no such
        constraint is reflected (SQLite does not report the
        old column-level UNIQUE as a named constraint).
    """
    inspector = sa.inspect(bind)
    if not inspector.has_table("departments"):
        return None
    for constraint in inspector.get_unique_constraints("departments"):
        if constraint.get("column_names") == ["name"]:
            return constraint.get("name")
    return None


def _swap_departments_table(bind, *, unique_name: bool) -> None:
    """Recreate the departments table on SQLite.

    SQLite cannot drop a unique constraint in place, and the
    old global ``UNIQUE (name)`` is unnamed in reflection, so
    batch mode cannot drop it (it would keep the global
    uniqueness alongside the new composite one). The table is
    therefore rebuilt with explicit DDL: data is copied, the
    old table dropped, the new one renamed in its place.

    Args:
        bind: The migration connection.
        unique_name: When True the rebuilt table has the old
            global ``UNIQUE (name)`` (downgrade); when False
            it has the composite ``(org_id, name)`` uniqueness
            (upgrade).
    """
    name_unique = "UNIQUE (name)," if unique_name else ""
    composite = (
        ""
        if unique_name
        else "CONSTRAINT uq_department_org_name UNIQUE (org_id, name),"
    )
    bind.execute(sa.text("PRAGMA foreign_keys=OFF"))
    try:
        # A previous failed swap may have left the temp table
        # behind (SQLite DDL here is non-transactional).
        op.execute(sa.text("DROP TABLE IF EXISTS departments_new"))
        op.execute(
            sa.text(
                "CREATE TABLE departments_new ("
                "id INTEGER NOT NULL, "
                "name VARCHAR(100) NOT NULL, "
                "org_id INTEGER, "
                "PRIMARY KEY (id), "
                f"{composite} "
                f"{name_unique} "
                "FOREIGN KEY(org_id) REFERENCES organizations (id))"
            )
        )
        op.execute(
            sa.text(
                "INSERT INTO departments_new (id, name, org_id) "
                "SELECT id, name, org_id FROM departments"
            )
        )
        op.execute(sa.text("DROP TABLE departments"))
        op.execute(sa.text("ALTER TABLE departments_new RENAME TO departments"))
        op.create_index(
            "ix_departments_org_id", "departments", ["org_id"], unique=False
        )
    finally:
        bind.execute(sa.text("PRAGMA foreign_keys=ON"))
    violations = bind.execute(sa.text("PRAGMA foreign_key_check")).fetchall()
    if violations:
        raise RuntimeError(
            f"Foreign key check failed after departments rebuild: {violations}"
        )


def _has_column(bind, table: str, column: str) -> bool:
    if not sa.inspect(bind).has_table(table):
        return False
    return any(c["name"] == column for c in sa.inspect(bind).get_columns(table))


def _has_composite_unique(bind) -> bool:
    """True when departments already has the (org_id, name) unique."""
    inspector = sa.inspect(bind)
    if not inspector.has_table("departments"):
        return False
    for constraint in inspector.get_unique_constraints("departments"):
        if constraint.get("column_names") == ["org_id", "name"]:
            return True
    return False


def upgrade() -> None:
    """Add the migration flag and make department names org-scoped."""
    bind = op.get_bind()

    if _has_column(bind, "organizations", "pinecone_migrated"):
        pass
    elif sa.inspect(bind).has_table("organizations"):
        op.add_column(
            "organizations",
            sa.Column(
                "pinecone_migrated",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )

    if not sa.inspect(bind).has_table("departments"):
        return

    if bind.dialect.name == "sqlite":
        # Batch mode cannot drop the old unnamed UNIQUE on
        # name (it would keep global uniqueness alongside the
        # composite one), so the table is rebuilt with DDL.
        # Skip the rebuild when create_all already built the
        # composite uniqueness.
        if _has_composite_unique(bind):
            return
        _swap_departments_table(bind, unique_name=False)
        return

    old_name = _old_name_unique_constraint(bind)
    if old_name:
        op.drop_constraint(old_name, "departments", type_="unique")
    if not _has_composite_unique(bind):
        op.create_unique_constraint(
            "uq_department_org_name", "departments", ["org_id", "name"]
        )


def downgrade() -> None:
    """Restore global department-name uniqueness; drop the flag.

    The global unique constraint cannot be restored while two
    orgs share a department name, so downgrade refuses with a
    clear error in that case instead of failing halfway.
    """
    bind = op.get_bind()

    if sa.inspect(bind).has_table("departments"):
        duplicates = bind.execute(
            sa.text(
                "SELECT name FROM departments "
                "GROUP BY name HAVING COUNT(DISTINCT org_id) > 1"
            )
        ).fetchall()
        if duplicates:
            names = ", ".join(sorted(row[0] for row in duplicates))
            raise RuntimeError(
                "Cannot downgrade: these department names exist in "
                f"more than one organization: {names}. Rename or "
                "delete the duplicates first."
            )
        if bind.dialect.name == "sqlite":
            # Rebuild with the old global UNIQUE on name. This
            # fails if two orgs already share a department name.
            _swap_departments_table(bind, unique_name=True)
        else:
            if _has_composite_unique(bind):
                op.drop_constraint(
                    "uq_department_org_name", "departments", type_="unique"
                )
            if not _old_name_unique_constraint(bind):
                op.create_unique_constraint(
                    "departments_name_key", "departments", ["name"]
                )

    if _has_column(bind, "organizations", "pinecone_migrated"):
        op.drop_column("organizations", "pinecone_migrated")
