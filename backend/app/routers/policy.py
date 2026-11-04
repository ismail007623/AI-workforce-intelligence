from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.deps import require_hr_role
from backend.app.core.logger import get_logger
from backend.app.schemas.policy import PolicyHistoryItem, PolicyStatusResponse, PolicyUploadResponse
from backend.app.services import policy_ingestion_service

logger = get_logger(__name__)
router = APIRouter(tags=["policy"], dependencies=[Depends(require_hr_role)])


@router.get("/policy/status", response_model=PolicyStatusResponse, response_model_exclude_none=True)
async def policy_status(session: AsyncSession = Depends(get_db)):

    try:
        logger.info("policy-status requested")
        result = await policy_ingestion_service.get_policy_status(session)
        logger.info("policy-status returned has_policy=%s", result["has_policy"])
        return result
    except ValueError as exc:
        logger.error("policy-status failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/policy/history", response_model=list[PolicyHistoryItem])
async def policy_history(session: AsyncSession = Depends(get_db)):
    logger.info("policy-history requested")
    try:
        return await policy_ingestion_service.get_policy_history(session)
    except ValueError as exc:
        logger.error("policy-history failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/policy/download")
async def policy_download(session: AsyncSession = Depends(get_db)):
    logger.info("policy-download requested")
    result = await policy_ingestion_service.get_active_download_path(session)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active policy document found.")
    filename, path = result
    return FileResponse(path, filename=filename, media_type="application/octet-stream")


@router.post("/policy/upload", response_model=PolicyUploadResponse)
async def policy_upload(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    x_awi_user: str = Header(default="HR Admin", alias="X-AWI-User"),
):
    filename = file.filename or "document"
    logger.info("policy-upload requested for file=%s", filename)

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    try:
        result = await policy_ingestion_service.ingest_policy_document(
            session,
            filename,
            content,
            uploaded_by=x_awi_user,
        )
        logger.info(
            "policy-upload completed file=%s chunks=%d pages=%d",
            result["filename"],
            result["chunk_count"],
            result["page_count"],
        )
        return result
    except ValueError as exc:
        msg = str(exc)
        logger.error("policy-upload validation failed: %s", msg)
        if "not configured" in msg.lower():
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=msg) from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg) from exc
    except Exception as exc:
        logger.exception("policy-upload failed for file=%s", filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process policy document. Please try again.",
        ) from exc
