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
    rank: Optional[int]
    score_min: Optional[int]
    score_max: Optional[int]
    has_email: Optional[bool]
    has_website: Optional[bool]
    delete_confirm: Optional[bool]
    delete_all_confirm: Optional[bool]
    user_id: Optional[str]
    user_name: Optional[str]
    scraped_count: Optional[int]
    prospects_sample: Optional[List[dict]]
    response: Optional[str]
    suggested_actions: Optional[List[str]]
    report: Optional[dict]
    session_id: Optional[str]
    company_names: Optional[List[str]]
    email_draft: Optional[dict]
    comparison: Optional[dict]

class ExtractionIntention(BaseModel):
    intent: Literal[
        "scrape",
        "search",
        "list",
        "best",
        "count",
        "delete",
        "delete_all",
        "report",
        "email",
        "compare",
        "general",
        "clarify",
    ] = Field(
        ..., 
        description="L'action demandée : 'scrape' (recherche OSM), 'search'/'list' (recherche en base), 'best' (meilleurs scores), 'count' (compte), 'delete' (suppression ciblée par critères), 'delete_all' (suppression de TOUTE la base sans critère), 'report' (bilan entreprise), 'email' (générer un email de prospection pour une entreprise), 'compare' (comparer plusieurs entreprises entre elles), 'general' (discussion), 'clarify' (si incompréhensible)."
    )
    company_names: Optional[List[str]] = Field(
        None,
        description="Liste des noms d'entreprises à comparer si intent='compare' (2 noms ou plus). Sinon null."
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
        description="Nombre maximal d'éléments demandés pour les listes ou les meilleurs prospects (classement TOP N)."
    )
    rank: Optional[int] = Field(
        None,
        description="Rang précis et unique demandé dans le classement (ex: 'le 2ème meilleur' -> 2). Ne pas confondre avec limit (top N)."
    )
    score_min: Optional[int] = Field(
        None,
        description="Score minimum pour filtrer des prospects."
    )
    score_max: Optional[int] = Field(
        None,
        description="Score maximum pour filtrer des prospects."
    )
    has_email: Optional[bool] = Field(
        None,
        description="true si l'utilisateur veut des prospects AYANT un email ('qui ont un mail'), false s'il veut ceux SANS email ('pas de mail', 'sans email'), sinon null."
    )
    has_website: Optional[bool] = Field(
        None,
        description="true si l'utilisateur veut des prospects AYANT un site web, false s'il veut ceux SANS site web ('pas de site web', 'sans site'), sinon null."
    )
    delete_confirm: Optional[bool] = Field(
        None,
        description="Confirmation explicite de suppression ciblée si l'utilisateur le précise."
    )
    delete_all_confirm: Optional[bool] = Field(
        None,
        description="true UNIQUEMENT si l'utilisateur confirme explicitement et sans ambiguïté vouloir supprimer TOUTE la base de données (ex: 'oui, supprime tout', 'je confirme, efface toute la base')."
    )