from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.core.scoping import visible_user_ids
from backend.app.models.employee import Department, Employee
from backend.app.models.user import User
from backend.app.schemas.employee import EmployeeCreate, EmployeeResponse


async def list_employees(session: AsyncSession, me: User) -> list[EmployeeResponse]:
    result = await session.execute(
        select(Employee)
        .options(selectinload(Employee.department))
        .where(Employee.id.in_(visible_user_ids(session, me)))
    )
    employees = result.scalars().all()
    return [
        EmployeeResponse(
            employee_id=e.employee_id,
            name=e.name,
            email=e.email,
            department=e.department.name,
        )
        for e in employees
    ]


async def create_employee(session: AsyncSession, me: User, payload: EmployeeCreate) -> EmployeeResponse:
    """Create an employee in the creator's organization.

    Args:
        session: The database session.
        me: The HR/Admin user creating the employee. The new
            employee's ``org_id`` always comes from this user,
            never from the request body.
        payload: The employee details from the request.

    Returns:
        The created employee.

    Raises:
        HTTPException: 409 when the employee ID already exists.
    """
    existing = await session.execute(select(Employee).where(Employee.employee_id == payload.employee_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee ID already exists")

    # Departments are looked up inside the creator's org only, so a
    # same-named department in another org is never reused. Known
    # limitation: Department.name is still globally unique in the
    # schema, so two orgs cannot both create a department with the
    # same name yet (see PHASE2_SUMMARY.md).
    dept_result = await session.execute(
        select(Department).where(
            Department.name == payload.department,
            Department.org_id == me.org_id,
        )
    )
    department = dept_result.scalar_one_or_none()
    if department is None:
        department = Department(name=payload.department, org_id=me.org_id)
        session.add(department)
        await session.flush()

    employee = Employee(
        employee_id=payload.employee_id,
        name=payload.name,
        email=payload.email,
        department_id=department.id,
        org_id=me.org_id,
    )
    session.add(employee)
    await session.flush()
    await session.refresh(employee, attribute_names=["department"])

    return EmployeeResponse(
        employee_id=employee.employee_id,
        name=employee.name,
        email=employee.email,
        department=employee.department.name,
    )
