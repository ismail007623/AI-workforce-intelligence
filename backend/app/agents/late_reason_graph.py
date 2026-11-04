import json
import re
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any, TypedDict

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import END, StateGraph
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.app.core.config import get_settings
from backend.app.core.database import async_session_factory
from backend.app.core.logger import get_logger
from backend.app.models.attendance import NotificationLog, NotificationStatus
from backend.app.models.employee import Employee
from backend.app.models.late_reason import (
    LateArrivalReason,
    LateReasonEvaluation,
    LateReasonStatus,
)
from backend.app.services import email_service, reliability_service

logger = get_logger(__name__)

CATEGORIES = [
    "Traffic",
    "Medical",
    "Family Emergency",
    "Weather",
    "Public Transport",
    "Technical Issue",
    "Personal Negligence",
    "Unknown",
]
DECISIONS = ["Valid", "Acceptable", "Weak", "Invalid"]


class AIEvalOutput(BaseModel):
    category: str = Field(description="Reason category")
    validity_score: int = Field(ge=0, le=100)
    risk_score: int = Field(ge=0, le=100)
    decision: str
    explanation: str


class LateReasonState(TypedDict, total=False):
    employee_id: str
    employee_name: str
    employee_db_id: int
    attendance_id: int
    late_reason_id: int
    reason_text: str
    history: list[dict]
    category: str
    validity_score: int
    risk_score: int
    decision: str
    explanation: str
    pattern_detected: bool
    pattern_summary: str | None
    weak_invalid_count_30d: int
    hr_alert_required: bool
    reliability_score: int
    db_session: Any
    skip_hr_notification: bool


def _parse_ai_json(text: str) -> AIEvalOutput:
    match = re.search(r"\{.*\}", text, re.S)
    if match:
        data = json.loads(match.group())
        return AIEvalOutput(**data)
    raise ValueError("Could not parse AI evaluation response")


async def fetch_history_node(state: LateReasonState) -> LateReasonState:
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    async with async_session_factory() as session:
        result = await session.execute(
            select(LateArrivalReason, LateReasonEvaluation)
            .outerjoin(LateReasonEvaluation, LateReasonEvaluation.late_reason_id == LateArrivalReason.id)
            .join(Employee, Employee.id == LateArrivalReason.employee_id)
            .where(Employee.employee_id == state["employee_id"], LateArrivalReason.submitted_at >= cutoff)
            .order_by(LateArrivalReason.submitted_at.desc())
            .limit(20)
        )
        history = []
        for reason, evaluation in result.all():
            entry = {"reason": reason.reason, "submitted_at": reason.submitted_at.isoformat()}
            if evaluation:
                entry["category"] = evaluation.category
                entry["decision"] = evaluation.decision
            history.append(entry)

        emp_result = await session.execute(select(Employee).where(Employee.employee_id == state["employee_id"]))
        employee = emp_result.scalar_one()
        weak_invalid = await reliability_service._weak_invalid_counts_30d(session, employee.id)

    return {**state, "history": history, "weak_invalid_count_30d": weak_invalid[0] + weak_invalid[1]}


async def evaluate_reason_node(state: LateReasonState) -> LateReasonState:
    settings = get_settings()
    if not settings.openai_api_key:
        return {
            **state,
            "category": "Unknown",
            "validity_score": 50,
            "risk_score": 50,
            "decision": "Acceptable",
            "explanation": "AI evaluation unavailable; reason recorded for HR review.",
        }

    history_text = "\n".join(
        f"- {h.get('submitted_at', '')}: {h['reason'][:120]} ({h.get('decision', 'n/a')})"
        for h in state.get("history", [])[:10]
    )
    prompt = """
You are a senior HR compliance officer with expertise in workforce attendance 
management. You evaluate employee late arrival reasons objectively, fairly, 
and in line with professional HR standards.

TASK:
Analyze the employee's late arrival reason for today and return a structured 
HR decision based on validity, risk, and historical attendance patterns.

CATEGORIES:
{', ".join(CATEGORIES)}

DECISIONS:
- Valid     → Genuine, verifiable, beyond employee control (e.g., accident, medical)
- Acceptable → Reasonable but partially avoidable (e.g., traffic without prior notice)
- Weak      → Vague, unverifiable, or shows poor planning (e.g., "woke up late")
- Invalid   → Dishonest, repeat negligence, or no reason given

GUIDELINES:
1. Personal negligence (oversleeping, poor planning, forgetting alarm) = low validity (0–30), high risk (70–100)
2. Force majeure events (accidents, hospital, natural disaster) = high validity (80–100), low risk (0–20)
3. Vague or unverifiable reasons = mid-low validity (20–50), mid-high risk (50–75)
4. Always cross-reference with recent history before deciding
5. Escalate risk score if same excuse is repeated within 30 days
6. Maintain formal, neutral HR tone in explanation

TRENDS TO DETECT:
- Repeated same reason → flag as "Pattern Detected"
- Monday/Friday late arrivals → flag as "High-Risk Pattern"
- Increasing frequency → flag as "Escalating Concern"
- First-time offense with valid reason → flag as "Low Risk, Monitor"

ATTENDANCE HISTORY (last 30 days):
{history_text or 'No previous records found.'}

TODAY'S REASON SUBMITTED BY EMPLOYEE:
"{state['reason_text']}"

OUTPUT FORMAT:
Return ONLY a valid JSON object with these exact keys:
{{
  "category":        "<one of the defined categories>",
  "validity_score":  <integer 0–100>,
  "risk_score":      <integer 0–100>,
  "decision":        "<Valid | Acceptable | Weak | Invalid>",
  "trend_flag":      "<Pattern Detected | High-Risk Pattern | Escalating Concern | Low Risk, Monitor | None>",
  "explanation":     "<2–3 sentences: reason for decision, history impact, recommended HR action>",
  "recommended_action": "<No Action | Verbal Warning | Written Warning | HR Meeting Required>"
}}

"""

    llm = ChatOpenAI(api_key=settings.openai_api_key, model=settings.openai_model, temperature=0.2)
    response = await llm.ainvoke(
        [
            SystemMessage(content="You are an HR attendance analyst. Respond with valid JSON only."),
            HumanMessage(content=prompt),
        ]
    )
    parsed = _parse_ai_json(response.content if isinstance(response.content, str) else str(response.content))
    if parsed.category not in CATEGORIES:
        parsed.category = "Unknown"
    if parsed.decision not in DECISIONS:
        parsed.decision = "Acceptable"

    return {
        **state,
        "category": parsed.category,
        "validity_score": parsed.validity_score,
        "risk_score": parsed.risk_score,
        "decision": parsed.decision,
        "explanation": parsed.explanation,
    }


async def detect_patterns_node(state: LateReasonState) -> LateReasonState:
    history = state.get("history", [])
    categories = [h.get("category") for h in history if h.get("category")]
    category = state.get("category", "Unknown")
    pattern_detected = False
    pattern_summary = None

    recent_cats = categories[:10]
    if recent_cats.count(category) >= 2 or Counter(recent_cats).most_common(1)[0][1] >= 3 if recent_cats else False:
        pattern_detected = True
        top_cat, count = Counter(recent_cats + [category]).most_common(1)[0]
        pattern_summary = (
            f"Pattern detected: {count} recent {top_cat.lower()}-related excuses. Manager review recommended."
        )

    return {**state, "pattern_detected": pattern_detected, "pattern_summary": pattern_summary}


async def persist_evaluation_node(state: LateReasonState) -> LateReasonState:
    session: AsyncSession = state["db_session"]

    reason_result = await session.execute(
        select(LateArrivalReason).where(LateArrivalReason.id == state["late_reason_id"])
    )
    reason = reason_result.scalar_one()

    evaluation = LateReasonEvaluation(
        late_reason_id=state["late_reason_id"],
        category=state["category"],
        validity_score=state["validity_score"],
        risk_score=state["risk_score"],
        decision=state["decision"],
        explanation=state["explanation"],
        pattern_detected=state.get("pattern_detected", False),
        pattern_summary=state.get("pattern_summary"),
    )
    session.add(evaluation)
    reason.status = LateReasonStatus.evaluated

    rel = await reliability_service.refresh_reliability_score(session, reason.employee_id)
    await session.flush()
    reliability_score = rel.reliability_score

    return {**state, "reliability_score": reliability_score}


async def hr_notification_node(state: LateReasonState) -> LateReasonState:
    if state.get("skip_hr_notification"):
        return state

    decision = state.get("decision", "")
    weak_invalid_count = state.get("weak_invalid_count_30d", 0)
    if decision in ("Weak", "Invalid"):
        weak_invalid_count += 1
    settings = get_settings()
    hr_alert = decision in ("Weak", "Invalid")
    high_risk = weak_invalid_count >= settings.high_risk_reason_threshold

    if not hr_alert and not high_risk:
        return state

    try:
        if high_risk:
            body = email_service.build_hr_high_risk_alert(
                state.get("employee_name", state["employee_id"]),
                weak_invalid_count,
            )
            subject = f"High Risk Alert: {state.get('employee_name', state['employee_id'])}"
            alert_type = "hr_high_risk_alert"
        else:
            body = email_service.build_hr_late_reason_alert(
                state.get("employee_name", state["employee_id"]),
                state["reason_text"],
                decision,
                state.get("category", ""),
                state.get("validity_score", 0),
                state.get("risk_score", 0),
                state.get("explanation", ""),
            )
            subject = f"Late Reason Alert ({decision}): {state.get('employee_name', state['employee_id'])}"
            alert_type = "hr_late_reason_alert"

        await email_service.send_email(settings.hr_email, subject, body)

        async with async_session_factory() as session:
            log = NotificationLog(
                employee_id=state["employee_db_id"],
                attendance_id=state["attendance_id"],
                type=alert_type,
                sent_at=datetime.now(timezone.utc),
                status=NotificationStatus.sent,
                message=body,
            )
            session.add(log)
            await session.commit()
    except Exception as exc:
        logger.error("HR notification failed: %s", exc)

    return state


def build_late_reason_graph():
    graph = StateGraph(LateReasonState)
    graph.add_node("fetch_history", fetch_history_node)
    graph.add_node("evaluate_reason", evaluate_reason_node)
    graph.add_node("detect_patterns", detect_patterns_node)
    graph.add_node("persist_evaluation", persist_evaluation_node)
    graph.add_node("hr_notification", hr_notification_node)

    graph.set_entry_point("fetch_history")
    graph.add_edge("fetch_history", "evaluate_reason")
    graph.add_edge("evaluate_reason", "detect_patterns")
    graph.add_edge("detect_patterns", "persist_evaluation")
    graph.add_edge("persist_evaluation", "hr_notification")
    graph.add_edge("hr_notification", END)
    return graph.compile()


late_reason_graph = build_late_reason_graph()


async def run_late_reason_pipeline(state: LateReasonState) -> LateReasonState:
    logger.info("starting late-reason pipeline for employee_id=%s", state.get("employee_id"))
    result = await late_reason_graph.ainvoke(state)
    logger.info(
        "completed late-reason pipeline for employee_id=%s decision=%s",
        state.get("employee_id"),
        result.get("decision"),
    )
    return result
