
from langgraph.graph import StateGraph, END
from agent.state import AgentState
from agent.nodes import (
    classify_intent_node,
    scrape_node,
    list_prospects_node,
    general_node,
    generate_report_node,
    clarify_node,  # <-- Ajout du nœud
)

def route_by_intent(state: AgentState) -> str:
    intent = state.get("intent", "general")
    if intent in ["scrape", "list", "general"]:
        return intent
    elif intent == "report":
        return "generate_report"
    elif intent == "clarify":
        return "clarify"
    return "general"

def build_agent_graph():
    graph = StateGraph(AgentState)

    # Déclaration de TOUS les nœuds
    graph.add_node("classify_intent", classify_intent_node)
    graph.add_node("scrape", scrape_node)
    graph.add_node("list", list_prospects_node)
    graph.add_node("general", general_node)
    graph.add_node("generate_report", generate_report_node)
    graph.add_node("clarify", clarify_node)  # <-- Déclaration ici

    graph.set_entry_point("classify_intent")

    # Liens conditionnels stricts
    graph.add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "scrape": "scrape",
            "list": "list",
            "generate_report": "generate_report",
            "general": "general",
            "clarify": "clarify",  # <-- Ajout du routage
        },
    )

    # Fin des nœuds
    graph.add_edge("scrape", END)
    graph.add_edge("list", END)
    graph.add_edge("generate_report", END)
    graph.add_edge("general", END)
    graph.add_edge("clarify", END)  # <-- Fin de clarification

    return graph.compile()

agent_graph = build_agent_graph()