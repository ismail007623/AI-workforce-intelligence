import asyncio
from typing import Literal, TypedDict
from langchain_core.messages import HumanMessage, SystemMessage ,AIMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field
from backend.app.core.config import get_settings
from backend.app.core.logger import get_logger
from backend.app.services.embedding_service import embed_texts
from backend.app.services.pinecone_service import _get_index

logger = get_logger(__name__)

settings = get_settings()

llm = ChatOpenAI(
    model=settings.openai_model,
    api_key=settings.openai_api_key,
    temperature=0,
    )

TOP_K = 3


# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

class AgentState(TypedDict, total=False):
    employee_id: str
    conversation_id: str
    user_message: str
    chat_history: list[dict]        # [{role, content}, ...]  pre-fetched
    category: str | None
    retrieved_chunks: list[dict] | None
    no_policy_doc_found: bool
    response: str | None


# ---------------------------------------------------------------------------
# Structured output for classifier
# ---------------------------------------------------------------------------

class ClassifyOutput(BaseModel):
    category: Literal["greeting", "rag_query"] = Field(
        description="'greeting' for greetings/small talk/thanks/unrelated; 'rag_query' for anything requiring company policy information"
    )
    reasoning: str = Field(description="Brief reason for classification")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _build_lc_history(chat_history: list[dict]) -> list:
    """Convert DB chat history to LangChain messages."""
    msgs = []

    for m in chat_history:
        if m["role"] == "user":
            msgs.append(HumanMessage(content=m["content"]))
        elif m["role"] == "assistant":
            msgs.append(AIMessage(content=m["content"]))

    return msgs

def _build_context_block(chunks: list[dict]) -> str:
    parts = []
    for i, c in enumerate(chunks, 1):
        filename = c.get("source_filename", "policy")
        chunk_idx = c.get("chunk_index", i)
        text = c.get("text", "").strip()
        parts.append(f"[Section {chunk_idx} — {filename}]\n{text}")
    return "\n\n---\n\n".join(parts)


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

async def classify_query(state: AgentState) -> AgentState:
    logger.info("classify_query: classifying message for conversation %s", state.get("conversation_id"))
    classifier = llm.with_structured_output(ClassifyOutput)

    system_prompt = (
        "You are a query classifier for an HR Policy Assistant chatbot.\n"
        "Classify the user's latest message into one of:\n"
        "  - 'greeting': greetings, small talk, thank you, goodbye, or anything NOT about company policy.\n"
        "  - 'rag_query': any question that requires looking up company policy information.\n"
        "Use the conversation history as context to resolve follow-up questions correctly."
    )

    history_msgs = _build_lc_history(state.get("chat_history") or [])
    messages = [SystemMessage(content=system_prompt)] + history_msgs + [HumanMessage(content=state["user_message"])]

    result: ClassifyOutput = await classifier.ainvoke(messages)
    logger.info("classify_query: category=%s reasoning=%s", result.category, result.reasoning)
    return {**state, "category": result.category}


async def generate_greeting_response(state: AgentState) -> AgentState:
    logger.info("generate_greeting_response: conversation %s", state.get("conversation_id"))
    system_prompt = (
    "You are a friendly HR Policy Assistant. "
    "This node is used only for greetings and polite conversation. "
    "If the user's message is a greeting, farewell, thanks, or simple small talk, respond warmly and briefly. "
    "For any other type of question, do not answer it. Instead, reply that you are designed to help with company HR policies such as leave, attendance, working hours, WFH, benefits, and other company policies."
)

    history_msgs = _build_lc_history(state.get("chat_history") or [])
    messages = [SystemMessage(content=system_prompt)] + history_msgs + [HumanMessage(content=state["user_message"])]

    response = await llm.ainvoke(messages)
    return {**state, "response": response.content, "retrieved_chunks": []}


async def retrieve_policy_context(state: AgentState) -> AgentState:
    logger.info("retrieve_policy_context: conversation %s", state.get("conversation_id"))
    settings = get_settings()

    loop = asyncio.get_event_loop()

    # Embed query (sync call → thread pool)
    query_vector: list[float] = await loop.run_in_executor(
        None, lambda: embed_texts([state["user_message"]])[0]
    )

    # Query Pinecone (sync call → thread pool)
    def _pinecone_query():
        index = _get_index()
        return index.query(
            vector=query_vector,
            top_k=TOP_K,
            namespace=settings.pinecone_namespace,
            include_metadata=True,
        )

    results = await loop.run_in_executor(None, _pinecone_query)

    matches = results.matches or []
    chunks = []
    for match in matches:
        score = match.score if hasattr(match, "score") else 0.0
        meta = match.metadata or {}
        chunks.append({
            "text": meta.get("text", ""),
            "chunk_index": meta.get("chunk_index"),
            "source_filename": meta.get("source_filename", ""),
            "uploaded_at": meta.get("uploaded_at", ""),
            "score": round(score, 4),
        })

    no_doc = len(chunks) == 0
    logger.info("retrieve_policy_context: found %d chunks (no_doc=%s)", len(chunks), no_doc)
    return {**state, "retrieved_chunks": chunks, "no_policy_doc_found": no_doc}


async def generate_rag_response(state: AgentState) -> AgentState:
    logger.info("generate_rag_response: conversation %s", state.get("conversation_id"))

    if state.get("no_policy_doc_found"):
        msg = (
            "I'm sorry, but there is no company policy document available at the moment. "
            "Please ask an HR administrator to upload the policy document, and I'll be happy to help you then."
        )
        logger.info("generate_rag_response: no policy doc found — returning fallback message")
        return {**state, "response": msg}


    context_block = _build_context_block(state.get("retrieved_chunks") or [])
    system_prompt = (
    "You are an HR Policy Assistant for AI Workforce Intelligence.\n\n"
    "Your role is to answer employee questions using ONLY the company policy context provided below.\n\n"
    "Instructions:\n"
    "1. Use only the information available in the provided policy context.\n"
    "2. Never guess, infer, or use outside knowledge.\n"
    "3. Answer the user's question directly before providing any additional context.\n"
    "4. Match the level of detail to the user's request:\n"
    "   - For broad or general questions, provide a brief, conversational summary.\n"
    "   - For specific questions, include all relevant details such as eligibility, conditions, durations, limits, exceptions, and requirements.\n"
    "   - If the user explicitly asks for complete details, explain the policy comprehensively.\n"
    "5. Write naturally as if you are an HR representative. Use complete paragraphs instead of bullet points, numbered lists, or headings unless the user specifically requests them.\n"
    "6. Summarize information in your own words. Avoid copying large portions of the policy verbatim unless quoting is necessary.\n"
    "7. Include relevant section references (e.g., [Section 3.1]) whenever applicable.\n"
    "8. If the requested information is not available in the provided context, reply exactly: \"I don't have that information in the current policy document.\"\n"
    "9. Keep responses concise by default and avoid unnecessary repetition. Expand only when needed to fully answer the user's question.\n"
    "10. Maintain a professional, friendly, and easy-to-understand tone.\n\n"
    f"--- POLICY CONTEXT ---\n{context_block}\n--- END CONTEXT ---"
)

    history_msgs = _build_lc_history(state.get("chat_history") or [])
    messages = (
        [SystemMessage(content=system_prompt)]
        + history_msgs
        +[HumanMessage(content=state["user_message"])]
    )

    response = await llm.ainvoke(messages)
    return {**state, "response": response.content}


# ---------------------------------------------------------------------------
# Routing
# ---------------------------------------------------------------------------

def route_after_classify(state: AgentState) -> str:
    return state.get("category") or "greeting"


# ---------------------------------------------------------------------------
# Graph compilation
# ---------------------------------------------------------------------------

def compile_policy_graph():
    graph = StateGraph(AgentState)

    graph.add_node("classify_query", classify_query)
    graph.add_node("generate_greeting_response", generate_greeting_response)
    graph.add_node("retrieve_policy_context", retrieve_policy_context)
    graph.add_node("generate_rag_response", generate_rag_response)

    graph.set_entry_point("classify_query")

    graph.add_conditional_edges(
        "classify_query",
        route_after_classify,
        {
            "greeting": "generate_greeting_response",
            "rag_query": "retrieve_policy_context",
        },
    )

    graph.add_edge("retrieve_policy_context", "generate_rag_response")
    graph.add_edge("generate_greeting_response", END)
    graph.add_edge("generate_rag_response", END)

    return graph.compile()


# Singleton — compiled once at module load
policy_graph = compile_policy_graph()
