from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.app.models.employee import Department, Employee
from backend.app.schemas.employee import EmployeeCreate, EmployeeResponse


async def list_employees(session: AsyncSession) -> list[EmployeeResponse]:
    result = await session.execute(select(Employee).options(selectinload(Employee.department)))
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


async def create_employee(session: AsyncSession, payload: EmployeeCreate) -> EmployeeResponse:
    existing = await session.execute(select(Employee).where(Employee.employee_id == payload.employee_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Employee ID already exists")

    dept_result = await session.execute(select(Department).where(Department.name == payload.department))
    department = dept_result.scalar_one_or_none()
    if department is None:
        department = Department(name=payload.department)
        session.add(department)
        await session.flush()

    employee = Employee(
        employee_id=payload.employee_id,
        name=payload.name,
        email=payload.email,
        department_id=department.id,
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
