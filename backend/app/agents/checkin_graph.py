import logging
from langgraph.graph import END, StateGraph
from backend.app.agents.nodes.email_notification import email_notification_node
from backend.app.agents.nodes.late_detection import late_detection_node
from backend.app.agents.nodes.monitoring import monitoring_node
from backend.app.agents.state import CheckInState
from backend.app.core.logger import get_logger

logger = get_logger(__name__)


def build_checkin_graph():
    graph = StateGraph(CheckInState)
    graph.add_node("monitoring", monitoring_node)
    graph.add_node("late_detection", late_detection_node)
    graph.add_node("email_notification", email_notification_node)

    graph.set_entry_point("monitoring")
    graph.add_edge("monitoring", "late_detection")
    graph.add_edge("late_detection", "email_notification")
    graph.add_edge("email_notification", END)

    return graph.compile()


checkin_graph = build_checkin_graph()


async def run_checkin_pipeline(state: CheckInState) -> CheckInState:
    logger.info("starting check-in pipeline for employee_id=%s", state.get("employee_id"))
    result = await checkin_graph.ainvoke(state)
    logger.info(
        "completed check-in pipeline for employee_id=%s status=%s notification_sent=%s",
        state.get("employee_id"),
        result.get("check_in_status"),
        result.get("notification_sent", False),
    )
    return result
