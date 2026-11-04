from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from backend.app.schemas.policy_chatbot import PolicyChatRequest
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.utils.time_rules import generate_conversation_id
from backend.app.agents.policy_assistant_graph import AgentState, policy_graph
from backend.app.core.database import get_db
from backend.app.core.logger import get_logger
from backend.app.services.policy_assistant_service import get_last_n_messages, save_message

logger = get_logger(__name__)

router = APIRouter(tags=["policy-assistant"])



@router.post("/policy/chat")
async def policy_chat(
    req: PolicyChatRequest,
    session: AsyncSession = Depends(get_db),
):
    try:
        logger.info("Entering policy-chat API for employee %s conversation %s", req.employee_id, req.conversation_id)
        conversation_id = req.conversation_id
        employee_id = req.employee_id
        user_query = req.message

        # Generate conversation ID if this is the first message
        conversation_id = req.conversation_id or await generate_conversation_id()

        # Pre-fetch conversation history 
        chat_history = await get_last_n_messages(conversation_id, session)

        # Persist user message before invoking the graph
        await save_message(conversation_id, employee_id, "user", user_query, session)
        await session.commit()

        initial_state: AgentState = {
            "employee_id": employee_id,
            "conversation_id": conversation_id,
            "user_message": user_query,
            "chat_history": chat_history,
            "category": None,
            "retrieved_chunks": None,
            "no_policy_doc_found": False,
            "response": None,
        }

        final_state = await policy_graph.ainvoke(initial_state)

        response_text = final_state.get("response") or ""
        citations = final_state.get("retrieved_chunks") or []

        # Persist assistant reply
        await save_message(conversation_id, employee_id, "assistant", response_text, session)
        await session.commit()

        return JSONResponse(
            content={
                "succeed": True,
                "status": status.HTTP_200_OK,
                "message": "Request done successfully",
                "data": {"query": user_query,"response": response_text, "converstaion_id": conversation_id ,"citations": citations}
            },
            status_code=status.HTTP_200_OK,
        )

    except Exception as e:
        logger.error("Fail policy-chat API for employee %s: %s", req.employee_id, e)
        return JSONResponse(
            content={
                "succeed": False,
                "status": status.HTTP_404_NOT_FOUND,
                "message": "Failed to get answer",
                "data": None
            },
            status_code=status.HTTP_404_NOT_FOUND,
        )
