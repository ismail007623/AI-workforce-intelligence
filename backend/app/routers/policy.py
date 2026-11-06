from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.database import get_db
from backend.app.core.auth_deps import JWTBearer, get_current_user, require_admin_role, require_hr_role
from backend.app.models.user import User
from backend.app.core.logger import get_logger
from backend.app.schemas.policy import (
    PolicyHistoryItem,
    PolicyMigrationResponse,
    PolicyStatusResponse,
    PolicyUploadResponse,
)
from backend.app.services import policy_ingestion_service

logger = get_logger(__name__)
router = APIRouter(
    tags=["policy"],
    dependencies=[Depends(JWTBearer()), Depends(require_hr_role)],
)


@router.post("/policy/migrate-namespaces", response_model=PolicyMigrationResponse)
async def policy_migrate_namespaces(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _admin: User = Depends(require_admin_role),
):
    """Copy the old shared policy into this org's namespace.

    One-time, admin-only. Copies the vectors in the legacy
    global namespace into the caller's org namespace, verifies
    the copy by count, then deletes the legacy namespace. A
    second call for the same org is refused with 409.
    """
    logger.info("policy-migrate-namespaces requested org_id=%s", current_user.org_id)
    try:
        result = await policy_ingestion_service.migrate_policy_namespace(
            session, current_user.org_id
        )
        logger.info(
            "policy-migrate-namespaces done org_id=%s copied=%d deleted_global=%s",
            result["org_id"],
            result["copied_count"],
            result["deleted_global"],
        )
        return result
    except ValueError as exc:
        msg = str(exc)
        logger.error("policy-migrate-namespaces failed: %s", msg)
        if "already run" in msg:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg) from exc
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg) from exc
    except Exception as exc:
        logger.exception("policy-migrate-namespaces failed org_id=%s", current_user.org_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Policy namespace migration failed. Please try again.",
        ) from exc


@router.get("/policy/status", response_model=PolicyStatusResponse, response_model_exclude_none=True)
async def policy_status(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):

    try:
        logger.info("policy-status requested")
        result = await policy_ingestion_service.get_policy_status(session, current_user.org_id)
        logger.info("policy-status returned has_policy=%s", result["has_policy"])
        return result
    except ValueError as exc:
        logger.error("policy-status failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/policy/history", response_model=list[PolicyHistoryItem])
async def policy_history(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.info("policy-history requested")
    try:
        return await policy_ingestion_service.get_policy_history(session, current_user.org_id)
    except ValueError as exc:
        logger.error("policy-history failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.get("/policy/download")
async def policy_download(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    logger.info("policy-download requested")
    result = await policy_ingestion_service.get_active_download_path(session, current_user.org_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active policy document found.")
    filename, path = result
    return FileResponse(path, filename=filename, media_type="application/octet-stream")


@router.post("/policy/upload", response_model=PolicyUploadResponse)
async def policy_upload(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
            uploaded_by=current_user.name,
            org_id=current_user.org_id,
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
