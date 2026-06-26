from langgraph.graph import StateGraph, END
from agent.state import AgentState
from agent.nodes import (
    classify_intent_node,
    scrape_node,
    list_prospects_node,
    general_node,
)


def route_by_intent(state: AgentState) -> str:
    intent = state.get("intent", "general")
    if intent == "scrape":
        return "scrape"
    elif intent == "list":
        return "list"
    else:
        return "general"


def build_agent_graph():
    graph = StateGraph(AgentState)

    graph.add_node("classify_intent", classify_intent_node)
    graph.add_node("scrape", scrape_node)
    graph.add_node("list", list_prospects_node)
    graph.add_node("general", general_node)

    graph.set_entry_point("classify_intent")

    graph.add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "scrape": "scrape",
            "list": "list",
            "general": "general",
        },
    )

    graph.add_edge("scrape", END)
    graph.add_edge("list", END)
    graph.add_edge("general", END)

    return graph.compile()


# Compilé une seule fois au démarrage de l'app
agent_graph = build_agent_graph()