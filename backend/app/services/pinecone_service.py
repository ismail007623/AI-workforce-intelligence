from dataclasses import dataclass
from datetime import datetime, timezone

from pinecone import Pinecone

from backend.app.core.config import get_settings
from backend.app.core.logger import get_logger

logger = get_logger(__name__)

UPSERT_BATCH_SIZE = 100

_index = None


@dataclass
class PolicyChunk:
    chunk_index: int
    text: str
    source_filename: str
    uploaded_at: str


def _get_index():
    global _index
    settings = get_settings()
    if not settings.pinecone_api_key:
        raise ValueError("Pinecone API key is not configured.")
    if _index is None:
        pc = Pinecone(api_key=settings.pinecone_api_key)
        _index = pc.Index(settings.pinecone_index_name)
    return _index


def clear_namespace() -> None:
    settings = get_settings()
    index = _get_index()
    logger.info(
        "Clearing Pinecone namespace index=%s namespace=%s",
        settings.pinecone_index_name,
        settings.pinecone_namespace,
    )
    index.delete(delete_all=True, namespace=settings.pinecone_namespace)


def upsert_chunks(chunks: list[PolicyChunk], vectors: list[list[float]]) -> None:
    if len(chunks) != len(vectors):
        raise ValueError("Chunk and vector counts must match.")

    settings = get_settings()
    index = _get_index()

    records = [
        {
            "id": f"policy-{chunk.chunk_index}",
            "values": vector,
            "metadata": {
                "text": chunk.text[:1000],
                "chunk_index": chunk.chunk_index,
                "source_filename": chunk.source_filename,
                "uploaded_at": chunk.uploaded_at,
            },
        }
        for chunk, vector in zip(chunks, vectors)
    ]

    for i in range(0, len(records), UPSERT_BATCH_SIZE):
        batch = records[i : i + UPSERT_BATCH_SIZE]
        index.upsert(vectors=batch, namespace=settings.pinecone_namespace)
        logger.info("Upserted %d/%d policy vectors", min(i + UPSERT_BATCH_SIZE, len(records)), len(records))


def get_namespace_vector_count() -> int:
    settings = get_settings()
    index = _get_index()
    stats = index.describe_index_stats()
    namespaces = getattr(stats, "namespaces", None) or stats.get("namespaces", {})
    ns_stats = namespaces.get(settings.pinecone_namespace) if isinstance(namespaces, dict) else None
    if not ns_stats:
        return 0
    if isinstance(ns_stats, dict):
        return int(ns_stats.get("vector_count", 0))
    return int(getattr(ns_stats, "vector_count", 0))


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
