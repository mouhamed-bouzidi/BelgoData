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
    city: Optional[str]
    category: Optional[str]
    company_name: Optional[str]
    email: Optional[str]
    website: Optional[str]
    search: Optional[str]
    limit: Optional[int]
    score_min: Optional[int]
    score_max: Optional[int]
    delete_confirm: Optional[bool]
    user_id: Optional[str]
    user_name: Optional[str]
    scraped_count: Optional[int]
    prospects_sample: Optional[List[dict]]
    response: Optional[str]
    suggested_actions: Optional[List[str]]
    report: Optional[dict]
    session_id: Optional[str]

class ExtractionIntention(BaseModel):
    intent: Literal[
        "scrape",
        "search",
        "list",
        "best",
        "count",
        "delete",
        "report",
        "general",
        "clarify",
    ] = Field(
        ..., 
        description="L'action demandée : 'scrape' (recherche OSM), 'search'/'list' (recherche en base), 'best' (meilleurs scores), 'count' (compte), 'delete' (suppression), 'report' (bilan entreprise), 'general' (discussion), 'clarify' (si incompréhensible)."
    )
    category: Optional[str] = Field(
        None, 
        description="Le secteur d'activité traduit en anglais s'il correspond à : boulangerie->bakery, ecole->school, cafe->cafe, restaurant->restaurant, etc. Sinon null."
    )
    location: Optional[str] = Field(
        None, 
        description="Le nom de la ville ou le code postal belge extrait (ex: 'Leuven', 'Bruxelles', '8000')."
    )
    city: Optional[str] = Field(
        None,
        description="Le nom de la ville belge extrait si disponible."
    )
    company_name: Optional[str] = Field(
        None, 
        description="Le nom de l'entreprise s'il s'agit d'une demande de rapport/bilan."
    )
    search: Optional[str] = Field(
        None,
        description="Terme libre de recherche pour la base ou la suppression."
    )
    limit: Optional[int] = Field(
        None,
        description="Nombre maximal d'éléments demandés pour les listes ou les meilleurs prospects."
    )
    score_min: Optional[int] = Field(
        None,
        description="Score minimum pour filtrer des prospects."
    )
    score_max: Optional[int] = Field(
        None,
        description="Score maximum pour filtrer des prospects."
    )
    delete_confirm: Optional[bool] = Field(
        None,
        description="Confirmation explicite de suppression si l'utilisateur le précise."
    )