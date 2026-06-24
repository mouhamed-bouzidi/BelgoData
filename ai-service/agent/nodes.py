import os
import json
from groq import Groq
from agent.state import AgentState
from services.geocoding import get_bbox_from_postal_code
from services.scraper import query_overpass, normalize_osm_results, CATEGORY_TAGS
from services.db import insert_prospects, get_db

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

CLASSIFY_PROMPT = """Tu es un assistant qui analyse les demandes d'un utilisateur faisant de la prospection B2B en Belgique.

Catégories disponibles: {categories}

Analyse le message utilisateur et réponds UNIQUEMENT avec un objet JSON (rien d'autre, pas de markdown) au format:
{{
  "intent": "scrape" | "list" | "unknown",
  "postal_code": "code postal belge à 4 chiffres si mentionné, sinon null",
  "category": "une des catégories disponibles si mentionnée/déductible, sinon null"
}}

Règles:
- "scrape" = l'utilisateur veut chercher/trouver de nouvelles entreprises (ex: "trouve-moi des restaurants à 1000")
- "list" = l'utilisateur veut voir des prospects déjà en base (ex: "montre-moi les prospects", "liste les cafés")
- "unknown" = la demande ne correspond à aucun cas ci-dessus

Message utilisateur: "{query}"
"""


def classify_intent_node(state: AgentState) -> AgentState:
    categories = ", ".join(CATEGORY_TAGS.keys())
    prompt = CLASSIFY_PROMPT.format(categories=categories, query=state["user_query"])

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    raw = completion.choices[0].message.content.strip()

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {"intent": "unknown", "postal_code": None, "category": None}

    state["intent"] = parsed.get("intent", "unknown")
    state["postal_code"] = parsed.get("postal_code")
    state["category"] = parsed.get("category")
    return state


def scrape_node(state: AgentState) -> AgentState:
    postal_code = state.get("postal_code")
    category = state.get("category")

    if not postal_code or not category:
        state["response"] = (
            "J'ai besoin d'un code postal et d'une catégorie pour lancer une recherche. "
            "Exemple: \"Trouve-moi des restaurants à 1000 Bruxelles\"."
        )
        state["suggested_actions"] = []
        return state

    bbox = get_bbox_from_postal_code(postal_code)
    if bbox is None:
        state["response"] = f"Je n'ai pas trouvé le code postal {postal_code}."
        state["suggested_actions"] = []
        return state

    raw_results = query_overpass(bbox, category)
    prospects = normalize_osm_results(raw_results, postal_code)
    summary = insert_prospects(prospects)

    state["scraped_count"] = summary["inserted"]
    state["prospects_sample"] = prospects[:5]
    state["response"] = (
        f"J'ai trouvé {len(prospects)} {category}(s) à {postal_code}. "
        f"{summary['inserted']} nouveaux prospects ajoutés "
        f"({summary['skipped']} déjà existants)."
    )
    state["suggested_actions"] = [
        "Voir la liste des entreprises",
        "Générer un bilan global",
        "Exporter les résultats",
    ]
    return state


def list_prospects_node(state: AgentState) -> AgentState:
    db = get_db()
    collection = db["prospects"]

    filter_query = {}
    if state.get("postal_code"):
        filter_query["address.postcode"] = state["postal_code"]
    if state.get("category"):
        filter_query["category"] = state["category"]

    results = list(collection.find(filter_query).limit(5))
    total = collection.count_documents(filter_query)

    for r in results:
        r["_id"] = str(r["_id"])

    state["prospects_sample"] = results
    state["scraped_count"] = total
    state["response"] = f"Voici {len(results)} prospects sur {total} trouvés en base."
    state["suggested_actions"] = ["Voir tous les résultats", "Affiner la recherche"]
    return state


def clarify_node(state: AgentState) -> AgentState:
    state["response"] = (
        "Je n'ai pas bien compris votre demande. Vous pouvez par exemple me demander : "
        "\"Trouve-moi des bureaux à 1000 Bruxelles\" ou \"Montre-moi les prospects de la catégorie café\"."
    )
    state["suggested_actions"] = []
    return state