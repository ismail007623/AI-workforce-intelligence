from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.agents.insights_agent import run_insights_query
from backend.app.core.auth_deps import JWTBearer, get_current_user, require_hr_role
from backend.app.core.database import get_db
from backend.app.core.logger import get_logger
from backend.app.models.user import User
from backend.app.schemas.employee import EmployeeCreate, EmployeeResponse
from backend.app.schemas.insights import InsightsQueryRequest, InsightsResponse
from backend.app.services import employee_service

logger = get_logger(__name__)
router = APIRouter(
    tags=["employees", "insights"],
    dependencies=[Depends(JWTBearer()), Depends(require_hr_role)],
)


@router.get("/employees", response_model=list[EmployeeResponse])
async def list_employees(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.info("list-employees requested")
    result = await employee_service.list_employees(session, current_user)
    logger.info("list-employees returned %d employees", len(result))
    return result


@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
async def create_employee(
    payload: EmployeeCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.info("create-employee requested for name=%s department=%s", payload.name, payload.department)
    result = await employee_service.create_employee(session, current_user, payload)
    logger.info("create-employee completed for employee_id=%s", result.employee_id)
    return result


@router.post("/insights/query", response_model=InsightsResponse)
async def insights_query(
    payload: InsightsQueryRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.info("insights-query requested with question=%s", payload.question)
    try:
        result = await run_insights_query(session, payload.question, current_user)
        logger.info("insights-query completed for question=%s", payload.question)
        return result
    except ValueError as exc:
        logger.error("insights-query failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
