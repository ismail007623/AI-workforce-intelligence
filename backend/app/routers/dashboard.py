from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.schemas.dashboard import DailyTrendPoint, DashboardSummary, DepartmentStats
from backend.app.services import stats_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
async def dashboard_summary(session: AsyncSession = Depends(get_db)):
    return await stats_service.get_dashboard_summary(session)


@router.get("/departments", response_model=list[DepartmentStats])
async def department_stats(session: AsyncSession = Depends(get_db)):
    return await stats_service.get_department_stats(session)


@router.get("/trend", response_model=list[DailyTrendPoint])
async def attendance_trend(days: int = 7, session: AsyncSession = Depends(get_db)):
    points = await stats_service.get_daily_trend(session, days=days)
    return [DailyTrendPoint(**p) for p in points]
