import os
import json
from groq import Groq
from agent.state import AgentState
from services.geocoding import get_bbox_from_postal_code, get_postal_code_from_city
from services.scraper import query_overpass, normalize_osm_results, CATEGORY_TAGS
from services.db import insert_prospects, get_db, mongo_to_json_safe
from services.geocoding import get_bbox_from_location
from datetime import datetime, timezone
from services.web_search import search_company_web, format_web_context

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

GENERAL_PROMPT = """Tu es l'assistant IA de BelgoData, une plateforme de prospection B2B en Belgique.
Réponds de façon naturelle et utile à ce message, même s'il ne concerne pas directement la prospection.
Si pertinent, tu peux orienter la conversation vers tes capacités (recherche d'entreprises par secteur/ville en Belgique).
Reste concis (3-4 phrases maximum).

Message: "{query}"
"""

def general_node(state: AgentState) -> AgentState:
    prompt = GENERAL_PROMPT.format(query=state["user_query"])
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    state["response"] = completion.choices[0].message.content.strip()
    state["suggested_actions"] = []
    return state


CLASSIFY_PROMPT = """Tu es un assistant expert en prospection B2B en Belgique. Tu dois:
1. Comprendre précisément l'intention de l'utilisateur
2. Extraire le code postal (même partiel ou ambigu) et la catégorie
3. Utiliser l'historique pour maintenir le contexte
4. Supporter TOUS les codes postaux belges (pas seulement 1000)



Catégories disponibles: {categories}
Analyse le message utilisateur et réponds UNIQUEMENT avec un objet JSON (rien d'autre, pas de markdown) au format:

Historique de conversation (du plus ancien au plus récent):
{history}

{{
  "intent": "scrape" | "list" | "report" | "general",
  "location": "code postal (4 chiffres) OU nom de ville belge mentionné, sinon null",
  "category": "une des catégories disponibles, déduite intelligemment même si le terme exact n'y est pas (ex: 'école' -> 'ecole', 'avocat' -> 'avocat'), sinon null"
  "company_name": "nom de l'entreprise mentionnée si l'utilisateur demande un bilan/rapport, sinon null",
}}

Règles:
- "scrape" = chercher de nouvelles entreprises
- "list" = voir des prospects déjà en base
- "general" = conversation normale, salutation, question hors-sujet, demande d'aide

Message utilisateur: "{query}"
"""

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

    results = mongo_to_json_safe(results)  # remplace la boucle manuelle

    state["prospects_sample"] = results
    state["scraped_count"] = total
    state["response"] = f"Voici {len(results)} prospects sur {total} trouvés en base."
    state["suggested_actions"] = ["Voir tous les résultats", "Affiner la recherche"]
    return state

def classify_intent_node(state: AgentState) -> AgentState:
    categories = ", ".join(CATEGORY_TAGS.keys())

    history = state.get("history", [])
    history_text = "\n".join(
        f"{h.get('role', '?')}: {h.get('content', '')}" for h in history
    ) if history else "(aucun historique)"

    prompt = CLASSIFY_PROMPT.format(
        categories=categories,
        history=history_text,
        query=state["user_query"],
    )

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0,
    )

    raw = completion.choices[0].message.content.strip()
    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {"intent": "general", "location": None, "category": None}

    state["intent"] = parsed.get("intent", "general")
    state["postal_code"] = parsed.get("location")
    state["category"] = parsed.get("category")
    state["company_name"] = parsed.get("company_name")
    return state

def scrape_node(state: AgentState) -> AgentState:
    postal_code = state.get("postal_code")
    category = state.get("category")

    if not postal_code or not category:
        missing = []
        if not postal_code:
            missing.append("un code postal belge (ex: 1000, 2000, 3000, 8000)")
        if not category:
            missing.append(f"une catégorie ({', '.join(CATEGORY_TAGS.keys())})")
        
        state["response"] = (
            f"J'ai besoin de {' et '.join(missing)} pour lancer une recherche. "
            f"Exemple: \"Trouve-moi des restaurants à 1000 Bruxelles\"."
        )
        state["suggested_actions"] = [
            "Restaurants à 1000 Bruxelles",
            "Cafés à 2000 Anvers",
            "Boulangeries à 3000 Louvain",
        ]
        return state

    bbox = get_bbox_from_location(postal_code)  # au lieu de get_bbox_from_postal_code
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
        f"✅ Recherche effectuée à {postal_code}!\n"
        f"Trouvé {len(prospects)} {category}(s) au total.\n"
        f"{summary['inserted']} nouveaux prospects ajoutés, {summary['skipped']} déjà en base."
    )
    other_categories = [c for c in CATEGORY_TAGS.keys() if c != category]
    state["suggested_actions"] = [
        f"Chercher d'autres {other_categories[0] if other_categories else 'catégories'} à {postal_code}",
        "Chercher dans un autre code postal",
        "Affiner les résultats",
    ]
    return state


def list_prospects_node(state: AgentState) -> AgentState:
    db = get_db()
    collection = db["prospects"]

    filter_query = {}
    location_desc = []
    
    if state.get("postal_code"):
        filter_query["address.postcode"] = state["postal_code"]
        location_desc.append(f"à {state['postal_code']}")
    if state.get("category"):
        filter_query["category"] = state["category"]
        location_desc.append(f"en {state['category']}")

    results = list(collection.find(filter_query).limit(10))
    total = collection.count_documents(filter_query)

    for r in results:
        r["_id"] = str(r["_id"])

    state["prospects_sample"] = results
    state["scraped_count"] = total
    
    location_text = " ".join(location_desc) if location_desc else "en base"
    if total == 0:
        state["response"] = (
            f"Aucun prospect trouvé {location_text}. "
            f"Voulez-vous lancer une recherche OSM pour en ajouter?"
        )
        state["suggested_actions"] = [
            f"Scraper {state.get('category', 'des entreprises')} à {state.get('postal_code', '1000')}",
        ]
    else:
        state["response"] = f"Affichage de {len(results)}/{total} prospects {location_text}."
        state["suggested_actions"] = [
            "Voir tous les résultats",
            "Affiner la recherche",
            "Exporter les résultats",
        ]
    
    return state


def clarify_node(state: AgentState) -> AgentState:
    state["response"] = (
        "Je n'ai pas bien compris votre demande. Vous pouvez par exemple:\n"
        "• **Chercher** : \"Trouve-moi des restaurants à 1000 Bruxelles\"\n"
        "• **Lister** : \"Montre-moi les cafés à 2000 Anvers\"\n"
        "• **Chercher par catégorie** : \"Donne-moi les pharmacies à 3000 Louvain\"\n"
        "• **Chercher par ville** : \"Cherche des coiffeurs à Liège\"\n\n"
        "Codes postaux belges: 1000=Bruxelles, 2000=Anvers, 3000=Louvain, 5000=Namur, 8000=Bruges"
    )
    state["suggested_actions"] = [
        "Restaurants à 1000 Bruxelles",
        "Cafés à 2000 Anvers",
        "Pharmacies à 5000 Namur",
    ]
    return state





REPORT_PROMPT = """Tu es un expert en analyse de prospection B2B en Belgique.

=== DONNÉES INTERNES (base de données) ===
Nom: {name}
Catégorie: {category}
Adresse: {address}
Téléphone: {phone}
Email: {email}
Site web: {website}

=== INFORMATIONS COMPLÉMENTAIRES (recherche web) ===
{web_context}

Génère une analyse de prospection au format JSON STRICT (rien d'autre, pas de markdown), avec cette structure exacte:
{{
  "score": <entier 0-100, basé sur la complétude des données ET les informations web trouvées>,
  "presence_digitale": "Bonne" | "Moyenne" | "Faible",
  "analyse": "<3-4 phrases, en t'appuyant sur les données internes ET le contexte web>",
  "forces": ["<force1>", "<force2>", "<force3>"],
  "faiblesses": ["<faiblesse1>", "<faiblesse2>", "<faiblesse3>"],
  "argumentaire": "<2-3 phrases suggérant comment approcher cette entreprise commercialement>"
}}

Base le score sur: téléphone (+15), email (+10), site web (+15), adresse complète (+10), pertinence du secteur (+20 max), qualité/quantité des informations web trouvées (+30 max).
Si les informations web sont vides ou non pertinentes, base-toi uniquement sur les données internes et indique une présence digitale plus faible.
"""


def generate_report_node(state: AgentState) -> AgentState:
    db = get_db()
    collection = db["prospects"]

    company_name = state.get("company_name")
    if not company_name:
        state["response"] = "Quelle entreprise voulez-vous analyser ? Donnez-moi son nom exact."
        state["suggested_actions"] = []
        return state

    prospect = collection.find_one({"name": {"$regex": company_name, "$options": "i"}})
    if not prospect:
        state["response"] = f"Je n'ai pas trouvé '{company_name}' dans la base de prospects."
        state["suggested_actions"] = []
        return state

    address_str = ", ".join(filter(None, [
        prospect.get("address", {}).get("street"),
        prospect.get("address", {}).get("city"),
        prospect.get("address", {}).get("postcode"),
    ])) or "Non renseignée"

    web_results = search_company_web(
        name=prospect.get("name"),
        city=prospect.get("address", {}).get("city"),
    )
    web_context = format_web_context(web_results)

    prompt = REPORT_PROMPT.format(
        name=prospect.get("name"),
        category=prospect.get("category"),
        address=address_str,
        phone=prospect.get("phone") or "Non renseigné",
        email=prospect.get("email") or "Non renseigné",
        website=prospect.get("website") or "Non renseigné",
        web_context=web_context,
    )

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    raw = completion.choices[0].message.content.strip()
    try:
        analysis = json.loads(raw)
    except json.JSONDecodeError:
        analysis = {
            "score": 50, "presence_digitale": "Moyenne",
            "analyse": "Analyse non disponible.", "forces": [], "faiblesses": [],
            "argumentaire": "",
        }

    report_doc = {
        "prospect_id": str(prospect["_id"]),
        "name": prospect.get("name"),
        "category": prospect.get("category"),
        "address": prospect.get("address"),
        "phone": prospect.get("phone"),
        "email": prospect.get("email"),
        "website": prospect.get("website"),
        "source": prospect.get("source"),
        "score": analysis.get("score", 50),
        "presence_digitale": analysis.get("presence_digitale", "Moyenne"),
        "analyse": analysis.get("analyse", ""),
        "forces": analysis.get("forces", []),
        "faiblesses": analysis.get("faiblesses", []),
        "argumentaire": analysis.get("argumentaire", ""),
        "web_sources": web_results,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    reports_collection = db["reports"]
    result = reports_collection.insert_one(report_doc)
    report_doc["_id"] = str(result.inserted_id)

    state["report"] = report_doc
    state["response"] = (
        f"Bilan généré pour {prospect.get('name')} — score de prospection : {analysis.get('score')}/100 "
        f"(enrichi avec {len(web_results)} source(s) web)."
    )
    state["suggested_actions"] = []
    return state