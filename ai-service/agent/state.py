# =====================================================================
# FICHIER : agent/state.py
# =====================================================================
from typing import TypedDict, Optional, List, Literal
from pydantic import BaseModel, Field

class AgentState(TypedDict):
    user_query: str
    history: Optional[List[dict]]
    intent: Optional[str]
    postal_code: Optional[str]
    category: Optional[str]
    company_name: Optional[str]
    user_id: Optional[str]
    user_name: Optional[str]
    scraped_count: Optional[int]
    prospects_sample: Optional[List[dict]]
    response: Optional[str]
    suggested_actions: Optional[List[str]]
    report: Optional[dict] 
    session_id: Optional[str]

class ExtractionIntention(BaseModel):
    intent: Literal["scrape", "list", "report", "general", "clarify"] = Field(
        ..., 
        description="L'action demandée : 'scrape' (recherche OSM), 'list' (voir la DB), 'report' (bilan entreprise), 'general' (discussion), 'clarify' (si incompréhensible)."
    )
    category: Optional[str] = Field(
        None, 
        description="Le secteur d'activité traduit en anglais s'il correspond à : boulangerie->bakery, ecole->school, cafe->cafe, restaurant->restaurant, etc. Sinon null."
    )
    location: Optional[str] = Field(
        None, 
        description="Le nom de la ville ou le code postal belge extrait (ex: 'Leuven', 'Bruxelles', '8000')."
    )
    company_name: Optional[str] = Field(
        None, 
        description="Le nom de l'entreprise s'il s'agit d'une demande de rapport/bilan."
    )