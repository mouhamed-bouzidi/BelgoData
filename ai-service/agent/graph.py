from langgraph.graph import StateGraph, END
from agent.state import AgentState
from agent.nodes import (
    classify_intent_node,
    scrape_node,
    search_prospects_node,
    best_prospects_node,
    count_prospects_node,
    delete_prospects_node,
    delete_all_prospects_node,
    general_node,
    generate_report_node,
    generate_email_node,
    compare_prospects_node,
    clarify_node,
)

def route_by_intent(state: AgentState) -> str:
    intent = state.get("intent", "general")
    if intent == "scrape":
        return "scrape"
    if intent in ["search", "list"]:
        return "search"
    if intent == "best":
        return "best"
    if intent == "count":
        return "count"
    if intent == "delete":
        return "delete"
    if intent == "delete_all":
        return "delete_all"
    if intent == "report":
        return "generate_report"
    if intent == "email":
        return "generate_email"
    if intent == "compare":
        return "compare"
    if intent == "clarify":
        return "clarify"
    return "general"

def build_agent_graph():
    graph = StateGraph(AgentState)

    # Déclaration de TOUS les nœuds
    graph.add_node("classify_intent", classify_intent_node)
    graph.add_node("scrape", scrape_node)
    graph.add_node("search_prospects", search_prospects_node)
    graph.add_node("best", best_prospects_node)
    graph.add_node("count", count_prospects_node)
    graph.add_node("delete", delete_prospects_node)
    graph.add_node("delete_all", delete_all_prospects_node)
    graph.add_node("general", general_node)
    graph.add_node("generate_report", generate_report_node)
    graph.add_node("generate_email", generate_email_node)
    graph.add_node("compare", compare_prospects_node)
    graph.add_node("clarify", clarify_node)

    graph.set_entry_point("classify_intent")

    # Liens conditionnels stricts
    graph.add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "scrape": "scrape",
            "search": "search_prospects",
            "list": "search_prospects",
            "best": "best",
            "count": "count",
            "delete": "delete",
            "delete_all": "delete_all",
            "generate_report": "generate_report",
            "generate_email": "generate_email",
            "compare": "compare",
            "general": "general",
            "clarify": "clarify",
        },
    )

    # Fin des nœuds
    graph.add_edge("scrape", END)
    graph.add_edge("search_prospects", END)
    graph.add_edge("best", END)
    graph.add_edge("count", END)
    graph.add_edge("delete", END)
    graph.add_edge("delete_all", END)
    graph.add_edge("generate_report", END)
    graph.add_edge("generate_email", END)
    graph.add_edge("compare", END)
    graph.add_edge("general", END)
    graph.add_edge("clarify", END)

    return graph.compile()

agent_graph = build_agent_graph()