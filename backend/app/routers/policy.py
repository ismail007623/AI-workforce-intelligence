from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from backend.app.core.deps import require_hr_role
from backend.app.core.logger import get_logger
from backend.app.schemas.policy import PolicyStatusResponse, PolicyUploadResponse
from backend.app.services import policy_ingestion_service

logger = get_logger(__name__)
router = APIRouter(tags=["policy"], dependencies=[Depends(require_hr_role)])


@router.get("/policy/status", response_model=PolicyStatusResponse)
async def policy_status():
    logger.info("policy-status requested")
    try:
        result = policy_ingestion_service.get_policy_status()
        logger.info("policy-status returned chunk_count=%d", result["chunk_count"])
        return result
    except ValueError as exc:
        logger.error("policy-status failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc


@router.post("/policy/upload", response_model=PolicyUploadResponse)
async def policy_upload(file: UploadFile = File(...)):
    filename = file.filename or "document"
    logger.info("policy-upload requested for file=%s", filename)

    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty.")

    try:
        result = policy_ingestion_service.ingest_policy_document(filename, content)
        logger.info(
            "policy-upload completed file=%s chunks=%d",
            result["filename"],
            result["chunk_count"],
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
