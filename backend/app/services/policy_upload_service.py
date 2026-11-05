import re
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.models.policy_upload import PolicyUpload

ACTIVE = "active"
INDEXING = "indexing"
FAILED = "failed"
REPLACED = "replaced"


def _sanitize_filename(filename: str) -> str:
    name = Path(filename).name
    return re.sub(r"[^\w.\-]", "_", name) or "document"


def _storage_dir() -> Path:
    settings = get_settings()
    path = Path(settings.policy_storage_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def save_policy_file(upload_id: int, filename: str, content: bytes) -> str:
    safe_name = _sanitize_filename(filename)
    relative = f"{upload_id}_{safe_name}"
    full_path = _storage_dir() / relative
    full_path.write_bytes(content)
    return relative


def resolve_stored_path(stored_path: str) -> Path:
    return _storage_dir() / stored_path


async def mark_active_as_replaced(session: AsyncSession, org_id: int | None = None) -> None:
    """Mark the caller's org's active policy as replaced.

    Args:
        session: The database session.
        org_id: The organization whose policy is replaced.
    """
    await session.execute(
        update(PolicyUpload)
        .where(PolicyUpload.status == ACTIVE, PolicyUpload.org_id == org_id)
        .values(status=REPLACED, updated_at=datetime.now(timezone.utc))
    )


async def create_upload_record(
    session: AsyncSession,
    *,
    filename: str,
    stored_path: str,
    file_size_bytes: int,
    page_count: int,
    uploaded_by: str,
    org_id: int | None = None,
) -> PolicyUpload:
    record = PolicyUpload(
        filename=filename,
        stored_path=stored_path,
        file_size_bytes=file_size_bytes,
        page_count=page_count,
        chunk_count=0,
        uploaded_by=uploaded_by,
        org_id=org_id,
        status=INDEXING,
    )
    session.add(record)
    await session.flush()
    return record


async def complete_upload_record(
    session: AsyncSession,
    record: PolicyUpload,
    *,
    chunk_count: int,
) -> PolicyUpload:
    record.chunk_count = chunk_count
    record.status = ACTIVE
    record.updated_at = datetime.now(timezone.utc)
    await session.flush()
    return record


async def fail_upload_record(session: AsyncSession, record: PolicyUpload) -> None:
    record.status = FAILED
    record.updated_at = datetime.now(timezone.utc)
    await session.flush()


async def get_active_upload(session: AsyncSession, org_id: int | None = None) -> PolicyUpload | None:
    result = await session.execute(
        select(PolicyUpload)
        .where(PolicyUpload.status == ACTIVE, PolicyUpload.org_id == org_id)
        .order_by(PolicyUpload.id.desc())
    )
    return result.scalars().first()


async def list_upload_history(session: AsyncSession, org_id: int | None = None) -> list[PolicyUpload]:
    result = await session.execute(
        select(PolicyUpload)
        .where(PolicyUpload.org_id == org_id)
        .order_by(PolicyUpload.uploaded_at.desc())
    )
    return list(result.scalars().all())
