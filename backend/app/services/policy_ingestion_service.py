from langchain_text_splitters import RecursiveCharacterTextSplitter

from backend.app.core.config import get_settings
from backend.app.core.logger import get_logger
from backend.app.services import document_parser, embedding_service, pinecone_service

logger = get_logger(__name__)

CHUNK_SIZE = 800
CHUNK_OVERLAP = 120


def _chunk_text(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        length_function=len,
    )
    return splitter.split_text(text)


def ingest_policy_document(filename: str, content: bytes) -> dict:
    settings = get_settings()

    if len(content) > settings.policy_max_upload_bytes:
        raise ValueError(
            f"File exceeds maximum size of {settings.policy_max_upload_bytes // (1024 * 1024)} MB."
        )

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ("pdf", "docx"):
        raise ValueError("Only PDF and DOCX files are supported.")

    logger.info("Starting policy ingestion for file=%s size=%d", filename, len(content))

    pinecone_service.clear_namespace()

    text = document_parser.extract_text(filename, content)
    chunks = _chunk_text(text)
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

    logger.info("Policy ingestion complete file=%s chunks=%d", filename, len(chunks))

    return {
        "filename": filename,
        "chunk_count": len(chunks),
        "message": "Company policy document uploaded and indexed successfully.",
    }


def get_policy_status() -> dict:
    settings = get_settings()
    count = pinecone_service.get_namespace_vector_count()
    return {
        "has_policy": count > 0,
        "chunk_count": count,
        "namespace": settings.pinecone_namespace,
        "index_name": settings.pinecone_index_name,
    }
