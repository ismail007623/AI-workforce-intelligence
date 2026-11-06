"""Pinecone access for company policy documents.

Multi-tenant rule: one shared index (``company-policy``), one
namespace per organization. Every function takes the namespace
explicitly — it comes from the caller's ``Organization`` row
(loaded from the database via the token user), never from the
client and never from the global settings value.

Vector ids are prefixed with the org (``org-<org_id>-policy-<n>``)
and every vector carries ``org_id`` in its metadata. Every query
also filters on ``org_id`` metadata, so even a wrong namespace
cannot leak another org's chunks.

The global settings namespace (``settings.pinecone_namespace``)
is deprecated: it is only the *legacy* namespace name used by
the one-time migration in :func:`copy_namespace`. No upload,
query or count uses it.
"""

from dataclasses import dataclass
from datetime import datetime, timezone

from pinecone import Pinecone
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.core.logger import get_logger
from backend.app.models.organization import Organization, generate_pinecone_namespace

logger = get_logger(__name__)

UPSERT_BATCH_SIZE = 100
FETCH_BATCH_SIZE = 100
LIST_PAGE_SIZE = 100
QUERY_TOP_K = 3

settings = get_settings()

try:
    pc = Pinecone(api_key=settings.pinecone_api_key)
    _index = pc.Index(settings.pinecone_index_name)
except Exception as exc:  # pragma: no cover - missing/invalid key
    logger.error("Pinecone client could not be created: %s", exc)
    pc = None
    _index = None


@dataclass
class PolicyChunk:
    chunk_index: int
    text: str
    source_filename: str
    uploaded_at: str


def _get_index():
    """Return the configured Pinecone index client.

    Returns:
        The Pinecone index client.

    Raises:
        ValueError: When Pinecone is not configured.
    """
    if _index is None:
        raise ValueError("Pinecone is not configured.")
    return _index


def legacy_namespace() -> str:
    """Return the old shared (global) namespace name.

    Returns:
        The deprecated global namespace, used only by the
        one-time migration that copies it into per-org namespaces.
    """
    return get_settings().pinecone_namespace


async def namespace_for_org(session: AsyncSession, org_id: int | None) -> str:
    """Return the Pinecone namespace for an organization.

    Args:
        session: The database session.
        org_id: The organization id. Must not be ``None``.

    Returns:
        The org's stored namespace. A missing namespace on an
        old org row is generated and saved (defensive only —
        company signup always sets one).

    Raises:
        ValueError: When ``org_id`` is missing or the org does
            not exist.
    """
    if org_id is None:
        raise ValueError("Organization is required for policy access.")
    org = await session.get(Organization, org_id)
    if org is None:
        raise ValueError("Organization not found.")
    if not org.pinecone_namespace:
        org.pinecone_namespace = generate_pinecone_namespace()
        await session.flush()
    return org.pinecone_namespace


def vector_id(org_id: int, chunk_index: int) -> str:
    """Build the Pinecone vector id for one policy chunk.

    Args:
        org_id: The owning organization id.
        chunk_index: The chunk number inside the document.

    Returns:
        An id of the form ``org-<org_id>-policy-<chunk_index>``.
    """
    return f"org-{org_id}-policy-{chunk_index}"


def clear_namespace(namespace: str) -> None:
    """Delete every vector in one organization's namespace.

    Args:
        namespace: The org namespace to clear. Other orgs'
            namespaces are untouched.

    Raises:
        Exception: The Pinecone error is logged and re-raised —
            a failed clear must never silently leave stale
            vectors behind.
    """
    try:
        index = _get_index()
        logger.info(
            "Clearing Pinecone namespace index=%s namespace=%s",
            get_settings().pinecone_index_name,
            namespace,
        )
        index.delete(delete_all=True, namespace=namespace)
    except Exception as exc:
        logger.error(
            "Failed to clear Pinecone namespace %s: %s", namespace, exc
        )
        raise


def delete_namespace(namespace: str) -> None:
    """Delete every vector in a namespace (migration cleanup).

    Args:
        namespace: The namespace to empty.
    """
    clear_namespace(namespace)


def upsert_chunks(
    chunks: list[PolicyChunk],
    vectors: list[list[float]],
    namespace: str,
    org_id: int,
) -> None:
    """Upsert policy chunks into one organization's namespace.

    Args:
        chunks: The parsed policy chunks.
        vectors: One embedding per chunk, same order as ``chunks``.
        namespace: The owning org's namespace.
        org_id: The owning org id, stored in every vector's
            metadata and prefixed onto every vector id.

    Raises:
        ValueError: When chunk and vector counts differ.
    """
    if len(chunks) != len(vectors):
        raise ValueError("Chunk and vector counts must match.")

    index = _get_index()

    records = [
        {
            "id": vector_id(org_id, chunk.chunk_index),
            "values": vector,
            "metadata": {
                "text": chunk.text[:1000],
                "chunk_index": chunk.chunk_index,
                "source_filename": chunk.source_filename,
                "uploaded_at": chunk.uploaded_at,
                "org_id": org_id,
            },
        }
        for chunk, vector in zip(chunks, vectors)
    ]

    for i in range(0, len(records), UPSERT_BATCH_SIZE):
        batch = records[i : i + UPSERT_BATCH_SIZE]
        index.upsert(vectors=batch, namespace=namespace)
        logger.info(
            "Upserted %d/%d policy vectors namespace=%s",
            min(i + UPSERT_BATCH_SIZE, len(records)),
            len(records),
            namespace,
        )


def query_namespace(
    vector: list[float],
    namespace: str,
    org_id: int,
    top_k: int = QUERY_TOP_K,
) -> list[dict]:
    """Search one org's namespace for the closest policy chunks.

    Args:
        vector: The embedded query vector.
        namespace: The caller's org namespace.
        org_id: The caller's org id. The query is filtered on
            ``org_id`` metadata as a second isolation check.
        top_k: How many matches to return.

    Returns:
        A list of chunk dicts (text, chunk_index,
        source_filename, uploaded_at, score), closest first.
    """
    index = _get_index()
    results = index.query(
        vector=vector,
        top_k=top_k,
        namespace=namespace,
        include_metadata=True,
        filter={"org_id": org_id},
    )
    matches = (
        results.get("matches", [])
        if isinstance(results, dict)
        else (getattr(results, "matches", None) or [])
    )
    chunks = []
    for match in matches:
        if isinstance(match, dict):
            meta = match.get("metadata") or {}
            score = match.get("score") or 0.0
        else:
            meta = getattr(match, "metadata", None) or {}
            score = getattr(match, "score", 0.0) or 0.0
        chunks.append(
            {
                "text": meta.get("text", ""),
                "chunk_index": meta.get("chunk_index"),
                "source_filename": meta.get("source_filename", ""),
                "uploaded_at": meta.get("uploaded_at", ""),
                "score": round(float(score), 4),
            }
        )
    return chunks


def get_namespace_vector_count(namespace: str) -> int:
    """Count the vectors in one namespace.

    Args:
        namespace: The namespace to count.

    Returns:
        The vector count, or 0 when the namespace is empty
        or absent.
    """
    index = _get_index()
    stats = index.describe_index_stats()
    namespaces = getattr(stats, "namespaces", None) or stats.get("namespaces", {})
    ns_stats = namespaces.get(namespace) if isinstance(namespaces, dict) else None
    if not ns_stats:
        return 0
    if isinstance(ns_stats, dict):
        return int(ns_stats.get("vector_count", 0))
    return int(getattr(ns_stats, "vector_count", 0))


def _list_vector_ids(index, namespace: str) -> list[str]:
    """List every vector id in a namespace, paginated.

    Args:
        index: The Pinecone index client.
        namespace: The namespace to list.

    Returns:
        All vector ids in the namespace.
    """
    ids: list[str] = []
    pagination_token = None
    while True:
        result = index.list(
            namespace=namespace, limit=LIST_PAGE_SIZE, pagination_token=pagination_token
        )
        vectors = getattr(result, "vectors", None)
        if vectors is None and isinstance(result, dict):
            vectors = result.get("vectors", [])
        for item in vectors or []:
            if isinstance(item, dict):
                ids.append(item.get("id"))
            else:
                ids.append(getattr(item, "id", None))
        token = getattr(result, "pagination_token", None)
        if token is None and isinstance(result, dict):
            token = result.get("pagination_token")
        if not token:
            break
        pagination_token = token
    return [i for i in ids if i]


def copy_namespace(
    source_namespace: str, target_namespace: str, org_id: int
) -> int:
    """Copy vectors from one namespace into an org namespace.

    Pinecone has no server-side copy, so vectors are listed,
    fetched in batches and re-upserted with org-prefixed ids
    and ``org_id`` metadata. The source namespace is not
    modified.

    Args:
        source_namespace: The namespace to copy from (the old
            global namespace during migration).
        target_namespace: The owning org's namespace.
        org_id: The owning org id, stamped on every copied
            vector.

    Returns:
        How many vectors were copied.
    """
    index = _get_index()
    source_ids = _list_vector_ids(index, source_namespace)
    logger.info(
        "Copying %d vectors namespace=%s -> %s org_id=%d",
        len(source_ids),
        source_namespace,
        target_namespace,
        org_id,
    )
    copied = 0
    for start in range(0, len(source_ids), FETCH_BATCH_SIZE):
        batch_ids = source_ids[start : start + FETCH_BATCH_SIZE]
        fetched = index.fetch(ids=batch_ids, namespace=source_namespace)
        vectors = getattr(fetched, "vectors", None)
        if vectors is None and isinstance(fetched, dict):
            vectors = fetched.get("vectors", {})
        records = []
        for old_id in batch_ids:
            item = (vectors or {}).get(old_id)
            if item is None:
                continue
            if isinstance(item, dict):
                values = item.get("values") or []
                meta = dict(item.get("metadata") or {})
            else:
                values = getattr(item, "values", []) or []
                meta = dict(getattr(item, "metadata", None) or {})
            meta["org_id"] = org_id
            # Migrated ids get their own prefix so they can never
            # overwrite vectors an org already uploaded itself.
            safe_old_id = "".join(
                ch if ch.isalnum() or ch in ("-", "_") else "-" for ch in old_id
            )
            records.append(
                {
                    "id": f"org-{org_id}-migrated-{safe_old_id}",
                    "values": values,
                    "metadata": {
                        "text": meta.get("text", ""),
                        "chunk_index": meta.get("chunk_index", copied),
                        "source_filename": meta.get("source_filename", ""),
                        "uploaded_at": meta.get("uploaded_at", ""),
                        "org_id": org_id,
                    },
                }
            )
            copied += 1
        if records:
            index.upsert(vectors=records, namespace=target_namespace)
    logger.info(
        "Copied %d vectors namespace=%s -> %s org_id=%d",
        copied,
        source_namespace,
        target_namespace,
        org_id,
    )
    return copied


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
