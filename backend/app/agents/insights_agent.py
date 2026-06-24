import json
import re

from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool
from langchain_openai import ChatOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import get_settings
from backend.app.schemas.insights import InsightsResponse
from backend.app.services import stats_service


def _build_tools(session: AsyncSession):
    @tool
    async def get_today_summary() -> str:
        """Return today's attendance summary counts."""
        summary = await stats_service.get_dashboard_summary(session)
        return json.dumps(summary.model_dump())

    @tool
    async def get_late_employees_today() -> str:
        """Return employees who checked in late today."""
        data = await stats_service.get_late_employees_today(session)
        return json.dumps(data)

    @tool
    async def get_early_leavers_today() -> str:
        """Return employees who left before office end time today."""
        data = await stats_service.get_early_leavers_today(session)
        return json.dumps(data)

    @tool
    async def get_employee_late_stats(employee_id: str) -> str:
        """Return late arrival stats for a specific employee this month."""
        data = await stats_service.get_employee_late_stats(session, employee_id)
        return json.dumps(data)

    @tool
    async def get_department_lateness() -> str:
        """Return per-department lateness statistics for today."""
        data = await stats_service.get_department_stats(session)
        return json.dumps([item.model_dump() for item in data])

    @tool
    async def get_attendance_trend(days: int = 7) -> str:
        """Return attendance rate trend comparing current and previous period."""
        data = await stats_service.get_attendance_trend(session, days=days)
        return json.dumps(data)

    return [
        get_today_summary,
        get_late_employees_today,
        get_early_leavers_today,
        get_employee_late_stats,
        get_department_lateness,
        get_attendance_trend,
    ]


def _parse_structured_response(question: str, raw_answer: str) -> InsightsResponse:
    summary = ""
    key_findings: list[str] = []
    recommendations: list[str] = []

    summary_match = re.search(r"Summary:\s*(.+?)(?=Key Findings:|Recommendations:|$)", raw_answer, re.S | re.I)
    if summary_match:
        summary = summary_match.group(1).strip()

    findings_match = re.search(r"Key Findings:\s*(.+?)(?=Recommendations:|$)", raw_answer, re.S | re.I)
    if findings_match:
        key_findings = [
            line.strip("- ").strip()
            for line in findings_match.group(1).strip().splitlines()
            if line.strip().startswith("-")
        ]

    recs_match = re.search(r"Recommendations:\s*(.+?)$", raw_answer, re.S | re.I)
    if recs_match:
        recommendations = [
            line.strip("- ").strip()
            for line in recs_match.group(1).strip().splitlines()
            if line.strip().startswith("-")
        ]

    if not summary:
        summary = raw_answer[:500]

    return InsightsResponse(
        question=question,
        summary=summary,
        key_findings=key_findings,
        recommendations=recommendations,
        raw_answer=raw_answer,
    )


async def run_insights_query(session: AsyncSession, question: str) -> InsightsResponse:
    settings = get_settings()
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not configured")

    tools = _build_tools(session)
    llm = ChatOpenAI(model=settings.openai_model, api_key=settings.openai_api_key, temperature=0)
    llm_with_tools = llm.bind_tools(tools)

    system_prompt = (
        "You are an AI Workforce Insights Agent for an HR attendance platform. "
        "Use the provided tools to analyze attendance data before answering. "
        "Respond in this format:\n\n"
        "Summary:\n<brief summary>\n\n"
        "Key Findings:\n- finding 1\n- finding 2\n\n"
        "Recommendations:\n- recommendation 1\n- recommendation 2"
    )

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=question),
    ]

    response = await llm_with_tools.ainvoke(messages)
    messages.append(response)

    while response.tool_calls:
        for tool_call in response.tool_calls:
            tool_fn = next(t for t in tools if t.name == tool_call["name"])
            tool_result = await tool_fn.ainvoke(tool_call["args"])
            messages.append(ToolMessage(content=tool_result, tool_call_id=tool_call["id"]))
        response = await llm_with_tools.ainvoke(messages)
        messages.append(response)

    final = await llm.ainvoke(
        messages
        + [
            HumanMessage(
                content="Provide the final answer strictly using Summary, Key Findings, and Recommendations sections."
            )
        ]
    )
    raw_answer = final.content if isinstance(final.content, str) else str(final.content)
    return _parse_structured_response(question, raw_answer)
