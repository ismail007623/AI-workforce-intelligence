from datetime import date as date_type

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.auth_deps import JWTBearer, require_hr_role
from backend.app.schemas.attendance import AbsentEmployeeResponse
from backend.app.schemas.dashboard import DailyTrendPoint, DashboardSummary, DepartmentStats
from backend.app.schemas.department_employees import DepartmentEmployeeRow
from backend.app.services import department_employee_service, stats_service

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"],
    dependencies=[Depends(JWTBearer()), Depends(require_hr_role)],
)


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(session: AsyncSession = Depends(get_db)):
    return await stats_service.get_dashboard_summary(session)


@router.get("/departments", response_model=list[DepartmentStats])
async def department_stats(
    sort_by: str | None = Query(
        default=None,
        pattern="^(late_count|risk|attendance|reliability|invalid_reasons)$",
    ),
    session: AsyncSession = Depends(get_db),
):
    return await stats_service.get_department_stats(session, sort_by=sort_by)


@router.get("/departments/{department_name}/employees", response_model=list[DepartmentEmployeeRow])
async def department_employees(
    department_name: str,
    sort_by: str | None = Query(
        default=None,
        pattern="^(late|punctual|absent)$",
    ),
    session: AsyncSession = Depends(get_db),
    _hr = Depends(require_hr_role),
):
    rows = await department_employee_service.get_department_employees(
        session, department_name, sort_by=sort_by
    )
    await session.commit()
    return [DepartmentEmployeeRow(**row) for row in rows]


@router.get("/trend", response_model=list[DailyTrendPoint])
async def attendance_trend(days: int = 7, session: AsyncSession = Depends(get_db)):
    points = await stats_service.get_daily_trend(session, days=days)
    return [DailyTrendPoint(**p) for p in points]


@router.get("/absentees", response_model=list[AbsentEmployeeResponse])
async def list_absentees(
    date: date_type | None = Query(default=None, description="Filter by date (YYYY-MM-DD). Defaults to today."),
    session: AsyncSession = Depends(get_db),
):
    rows = await stats_service.get_absent_employees_by_date(session, record_date=date)
    return [AbsentEmployeeResponse(**row) for row in rows]
