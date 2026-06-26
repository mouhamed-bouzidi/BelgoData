from typing import TypedDict, Optional, List



class AgentState(TypedDict):
    user_query: str
    history: Optional[List[dict]]  # [{"role": "user"|"agent", "content": "..."}]
    history: Optional[List[dict]]  # ← ajoute cette ligne

    intent: Optional[str]
    postal_code: Optional[str]
    category: Optional[str]
    company_name: Optional[str]

    scraped_count: Optional[int]
    prospects_sample: Optional[List[dict]]

    response: Optional[str]
    suggested_actions: Optional[List[str]]