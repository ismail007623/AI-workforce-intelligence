from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.core.logger import get_logger
from backend.app.services import (
    document_parser,
    embedding_service,
    pinecone_service,
    policy_upload_service,
)

logger = get_logger(__name__)

CHUNK_SIZE = 500
CHUNK_OVERLAP = 100


def _chunk_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
    )
    return splitter.split_text(text)


def _record_to_upload_response(record: policy_upload_service.PolicyUpload) -> dict:
    return {
        "filename": record.filename,
        "chunk_count": record.chunk_count,
        "page_count": record.page_count,
        "file_size_bytes": record.file_size_bytes,
        "uploaded_at": record.uploaded_at,
        "last_updated_at": record.updated_at,
        "message": "Company policy document uploaded and indexed successfully.",
    }


async def ingest_policy_document(
    session: AsyncSession,
    filename: str,
    content: bytes,
    uploaded_by: str = "HR Admin",
    org_id: int | None = None,
) -> dict:
    """Ingest a policy document for one organization.

    The database record is stamped with the uploader's ``org_id``,
    and only that org's previous active policy is replaced. The
    Pinecone write itself still uses the single global namespace in
    Phase 2 (per-org namespaces are Phase 3 work); do not treat the
    policy chatbot as isolated yet.

    Args:
        session: The database session.
        filename: The uploaded file name.
        content: The uploaded file bytes.
        uploaded_by: The uploader's display name.
        org_id: The uploader's organization id.

    Returns:
        The upload response dict.
    """
    settings = get_settings()

    if len(content) > settings.policy_max_upload_bytes:
        raise ValueError(
            f"File exceeds maximum size of {settings.policy_max_upload_bytes // (1024 * 1024)} MB."
        )

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("pdf", "docx"):
        raise ValueError("Only PDF and DOCX files are supported.")

    logger.info("Starting policy ingestion for file=%s size=%d", filename, len(content))

    parsed = document_parser.parse_document(filename, content)

    await policy_upload_service.mark_active_as_replaced(session, org_id)

    record = await policy_upload_service.create_upload_record(
        session,
        filename=filename,
        stored_path="",
        file_size_bytes=len(content),
        page_count=parsed.page_count,
        uploaded_by=uploaded_by,
        org_id=org_id,
    )

    stored_path = policy_upload_service.save_policy_file(record.id, filename, content)
    record.stored_path = stored_path
    await session.flush()

    try:
        pinecone_service.clear_namespace()

        chunks = _chunk_text(parsed.text)
        if not chunks:
            raise ValueError("Document produced no text chunks after parsing.")

        uploaded_at = pinecone_service.now_iso()
        policy_chunks = [
            pinecone_service.PolicyChunk(
                chunk_index=i,
                text=chunk,
                source_filename=filename,
                uploaded_at=uploaded_at,
            )
            for i, chunk in enumerate(chunks)
        ]

        vectors = embedding_service.embed_texts([c.text for c in policy_chunks])
        pinecone_service.upsert_chunks(policy_chunks, vectors)

        await policy_upload_service.complete_upload_record(session, record, chunk_count=len(chunks))

        logger.info("Policy ingestion complete file=%s chunks=%d", filename, len(chunks))
        return _record_to_upload_response(record)
    except Exception:
        await policy_upload_service.fail_upload_record(session, record)
        await session.commit()
        raise


async def get_policy_status(session: AsyncSession, org_id: int | None = None) -> dict:
    settings = get_settings()
    active = None
    try:
        active = await policy_upload_service.get_active_upload(session, org_id)
    except ProgrammingError:
        await session.rollback()
        active = None

    if active:
        return {
            "has_policy": True,
            "chunk_count": active.chunk_count,
            "namespace": settings.pinecone_namespace,
            "index_name": settings.pinecone_index_name,
            "filename": active.filename,
            "page_count": active.page_count,
            "file_size_bytes": active.file_size_bytes,
            "uploaded_by": active.uploaded_by,
            "uploaded_at": active.uploaded_at,
            "last_updated_at": active.updated_at,
            "status": active.status,
        }

    try:
        count = pinecone_service.get_namespace_vector_count()
    except ValueError:
        count = 0

    return {
        "has_policy": False,
        "chunk_count": count,
        "namespace": settings.pinecone_namespace,
        "index_name": settings.pinecone_index_name,
    }


async def get_policy_history(session: AsyncSession, org_id: int | None = None) -> list[dict]:
    try:
        records = await policy_upload_service.list_upload_history(session, org_id)
    except ProgrammingError:
        await session.rollback()
        return []
    return [
        {
            "id": r.id,
            "filename": r.filename,
            "uploaded_by": r.uploaded_by,
            "uploaded_at": r.uploaded_at,
            "status": r.status,
            "page_count": r.page_count,
            "file_size_bytes": r.file_size_bytes,
        }
        for r in records
    ]


async def get_active_download_path(session: AsyncSession, org_id: int | None = None) -> tuple[str, str] | None:
    active = await policy_upload_service.get_active_upload(session, org_id)
    if not active:
        return None
    path = policy_upload_service.resolve_stored_path(active.stored_path)
    if not path.is_file():
        return None
    return active.filename, str(path)
