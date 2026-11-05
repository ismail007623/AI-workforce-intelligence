"""Organization scoping helpers for multi-tenant data access.

Every database query that reads tenant data must go through
:func:`visible_user_ids` (or its alias :func:`visible_employee_ids`)
so a caller can only ever see rows belonging to their own
organization. The scope is always derived from the authenticated
user loaded from the database — never from client input.

Choice of IDs: the helper returns a ``select`` of ``Employee.id``
(the integer primary key). ``AttendanceRecord.employee_id``,
``LateArrivalReason.employee_id`` and
``EmployeeReliabilityScore.employee_id`` are all foreign keys to
``Employee.id``, while ``Employee.employee_id`` is the human-readable
code (``EMP003``) used in URLs and request bodies. Scoping by the
integer key keeps every ``.in_(...)`` filter on the same column type.
"""

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.logger import get_logger
from backend.app.models.employee import Employee
from backend.app.models.user import User

logger = get_logger(__name__)


def visible_user_ids(db: AsyncSession, me: User):
    """Return a select of the Employee ids the caller may see.

    Args:
        db: The database session. The select is built from the
            authenticated user only, so no query is run here; the
            parameter is kept for symmetry with the other scoping
            helpers and for future lookups.
        me: The authenticated user, resolved from the JWT and the
            database by :func:`get_current_user`.

    Returns:
        A SQLAlchemy select of ``Employee.id`` usable inside
        ``.in_(...)`` filters: all employees of the caller's org
        for HR/Admin, only the caller's own linked employee for an
        employee, and (ready for a future Manager role) the
        manager's own record plus employees whose ``manager_id``
        is the manager's linked employee id.
    """
    role = getattr(me.role, "value", me.role)
    if role == "manager" and me.employee_id is not None:
        # No Manager role exists yet (Phase 2); this branch is ready
        # for when one is added and is not reachable today.
        return select(Employee.id).where(
            or_(
                Employee.id == me.employee_id,
                Employee.manager_id == me.employee_id,
            )
        )
    if role in ("hr", "admin"):
        return select(Employee.id).where(Employee.org_id == me.org_id)
    if me.employee_id is None:
        # Unlinked employee account: sees nothing.
        return select(Employee.id).where(False)
    return select(Employee.id).where(Employee.id == me.employee_id)


def visible_employee_ids(db: AsyncSession, me: User):
    """Alias of :func:`visible_user_ids`.

    Both names exist because callers think in terms of either
    "users" (accounts) or "employees" (records); they are the same
    set of ``Employee.id`` values.
    """
    return visible_user_ids(db, me)


async def get_scoped_employee(
    session: AsyncSession, me: User, employee_code: str
) -> Employee:
    """Load an employee by code, enforcing organization scope.

    Args:
        session: The database session.
        me: The authenticated user.
        employee_code: The human-readable employee code, e.g.
            ``EMP003``.

    Returns:
        The matching Employee row.

    Raises:
        HTTPException: 404 when no employee has that code (the same
            answer for every caller, so existence cannot be probed
            across orgs); 403 when the employee exists in a different
            organization, or when an employee caller asks for someone
            else's record.
    """
    result = await session.execute(
        select(Employee)
        .options(selectinload(Employee.department))
        .where(Employee.employee_id == employee_code)
    )
    employee = result.scalar_one_or_none()
    if employee is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Employee not found",
        )
    role = getattr(me.role, "value", me.role)
    if role in ("hr", "admin"):
        if (
            employee.org_id is not None
            and me.org_id is not None
            and employee.org_id != me.org_id
        ):
            logger.info(
                "cross-org access denied user_id=%s employee_code=%s",
                me.id,
                employee_code,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You may only access records in your own organization.",
            )
        return employee
    if me.employee_id != employee.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You may only access your own records.",
        )
    return employee
