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

    The document is parsed and embedded *before* anything is
    cleared, so a failed parse or embedding leaves the old
    policy untouched. Only then is the caller's own Pinecone
    namespace cleared and the new vectors upserted there. The
    database record is marked replaced only after the upsert
    succeeds.

    Args:
        session: The database session.
        filename: The uploaded file name.
        content: The uploaded file bytes.
        uploaded_by: The uploader's display name.
        org_id: The uploader's organization id (required).

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

    # Resolve the org namespace first: a missing org fails here,
    # before any Pinecone write.
    namespace = await pinecone_service.namespace_for_org(session, org_id)

    logger.info("Starting policy ingestion for file=%s size=%d", filename, len(content))

    # Parse, chunk and embed BEFORE clearing: a failure here must
    # leave the previous policy in place.
    parsed = document_parser.parse_document(filename, content)
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

    try:
        pinecone_service.clear_namespace(namespace)
        pinecone_service.upsert_chunks(policy_chunks, vectors, namespace, org_id)

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

        await policy_upload_service.complete_upload_record(session, record, chunk_count=len(chunks))

        logger.info("Policy ingestion complete file=%s chunks=%d", filename, len(chunks))
        return _record_to_upload_response(record)
    except Exception:
        logger.error("Policy ingestion failed for file=%s", filename)
        raise


async def get_policy_status(session: AsyncSession, org_id: int | None = None) -> dict:
    settings = get_settings()
    try:
        namespace = await pinecone_service.namespace_for_org(session, org_id)
    except ValueError:
        namespace = pinecone_service.legacy_namespace()
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
            "namespace": namespace,
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
        count = pinecone_service.get_namespace_vector_count(namespace)
    except ValueError:
        count = 0

    return {
        "has_policy": False,
        "chunk_count": count,
        "namespace": namespace,
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


async def migrate_policy_namespace(session: AsyncSession, org_id: int | None) -> dict:
    """Copy the old shared policy into one org's namespace.

    One-time, admin-only (the router enforces the role). The
    vectors in the legacy global namespace are copied into the
    caller's org namespace with org-prefixed ids and ``org_id``
    metadata. Only after the copy is verified by count is the
    legacy namespace deleted. The org is then flagged as
    migrated so the endpoint refuses to run twice.

    Args:
        session: The database session.
        org_id: The admin's organization id (required).

    Returns:
        A summary dict with org_id, namespace, copied_count
        and deleted_global.

    Raises:
        ValueError: When the org is missing, or when the
            migration has already run for this org.
    """
    from backend.app.models.organization import Organization

    if org_id is None:
        raise ValueError("Organization is required for migration.")
    org = await session.get(Organization, org_id)
    if org is None:
        raise ValueError("Organization not found.")
    if org.pinecone_migrated:
        raise ValueError(
            "Policy namespace migration has already run for this organization."
        )

    legacy = pinecone_service.legacy_namespace()
    namespace = org.pinecone_namespace or await pinecone_service.namespace_for_org(
        session, org_id
    )
    logger.info(
        "Migrating policy namespace org_id=%d %s -> %s", org_id, legacy, namespace
    )
    before_count = pinecone_service.get_namespace_vector_count(namespace)

    copied = pinecone_service.copy_namespace(legacy, namespace, org_id)

    # The org namespace may already hold vectors the org
    # uploaded itself, so verify against before + copied.
    verified = pinecone_service.get_namespace_vector_count(namespace)
    if verified != before_count + copied:
        raise ValueError(
            f"Migration copy verification failed: namespace "
            f"{namespace} held {before_count} vectors, copied "
            f"{copied}, but now holds {verified}. "
            "The legacy namespace was not deleted."
        )

    deleted_global = False
    if copied > 0:
        pinecone_service.delete_namespace(legacy)
        deleted_global = True

    org.pinecone_migrated = True
    await session.flush()

    logger.info(
        "Policy namespace migration complete org_id=%d copied=%d deleted_global=%s",
        org_id,
        copied,
        deleted_global,
    )
    return {
        "org_id": org_id,
        "namespace": namespace,
        "copied_count": copied,
        "deleted_global": deleted_global,
    }
