from typing import TypedDict, Optional, List


class AgentState(TypedDict):
    # Entrée utilisateur
    user_query: str

    # Détecté par classify_intent
    intent: Optional[str]  # "scrape" | "list" | "report" | "clarify" | "unknown"
    postal_code: Optional[str]
    category: Optional[str]
    company_name: Optional[str]

    # Résultats intermédiaires
    scraped_count: Optional[int]
    prospects_sample: Optional[List[dict]]

    # Réponse finale à l'utilisateur
    response: Optional[str]
    suggested_actions: Optional[List[str]]