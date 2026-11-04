from langchain_openai import OpenAIEmbeddings
from backend.app.core.config import get_settings

settings =  get_settings()
_embeddings = OpenAIEmbeddings(
    api_key=settings.openai_api_key,
    model=settings.openai_embedding_model,
)
EMBED_BATCH_SIZE = 100


def _get_embeddings_client() -> OpenAIEmbeddings:
    return _embeddings
 

def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    client = _get_embeddings_client()
    vectors: list[list[float]] = []

    for i in range(0, len(texts), EMBED_BATCH_SIZE):
        batch = texts[i : i + EMBED_BATCH_SIZE]
        vectors.extend(client.embed_documents(batch))

    return vectors
