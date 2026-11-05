from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.core.logger import get_logger
from backend.app.models.chat import ChatMessage

logger = get_logger(__name__)


async def get_last_n_messages(
    conversation_id: str,
    session: AsyncSession,
    n: int = 10,
    employee_id: str | None = None,
) -> list[dict]:
    """Return the last n messages of a conversation.

    Args:
        conversation_id: The conversation to read.
        session: The database session.
        n: How many messages to return.
        employee_id: When given, only messages saved for that
            employee code are returned, so a guessed conversation
            id cannot read another employee's (or org's) history.

    Returns:
        The messages oldest-first.
    """
    try:
        logger.info("Fetching last %d messages for conversation %s", n, conversation_id)
        query = select(ChatMessage).where(ChatMessage.conversation_id == conversation_id)
        if employee_id is not None:
            query = query.where(ChatMessage.employee_id == employee_id)
        result = await session.execute(
            query.order_by(ChatMessage.created_at.desc()).limit(n)
        )
        messages = list(reversed(result.scalars().all()))
        return [{"role": m.role, "content": m.content} for m in messages]
    except Exception as e:
        logger.error("Fail to fetch chat history for conversation %s: %s", conversation_id, e)
        raise Exception("Failed to get chat history")


async def save_message(
    conversation_id: str,
    employee_id: str,
    role: str,
    content: str,
    session: AsyncSession,
) -> None:
    try:
        logger.info("Saving %s message for employee %s in conversation %s", role, employee_id, conversation_id)
        msg = ChatMessage(
            conversation_id=conversation_id,
            employee_id=employee_id,
            role=role,
            content=content,
        )
        session.add(msg)
        await session.flush()
    except Exception as e:
        logger.error("Fail to save chat message for conversation %s: %s", conversation_id, e)
        raise Exception("Failed to save chat message")
