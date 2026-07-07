import os
import json
import logging
from datetime import datetime, timezone
from groq import Groq

from agent.state import AgentState, ExtractionIntention
from services.geocoding import get_bbox_from_location
from services.scraper import query_overpass, normalize_osm_results, CATEGORY_TAGS
from services.db import insert_prospects, get_db, mongo_to_json_safe
from services.web_search import search_company_web, format_web_context
from services.deep_scraper import deep_scraping_prospect

# Configuration du Logger pour le monitoring Docker
logger = logging.getLogger(__name__)

# Initialisation du client Groq
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# =====================================================================
# PROMPTS DE L'AGENT
# =====================================================================
GENERAL_PROMPT = """Tu es l'assistant IA de BelgoData, une plateforme de prospection B2B en Belgique.
Réponds de façon naturelle et utile à ce message, même s'il ne concerne pas directement la prospection.
Si pertinent, tu peux orienter la conversation vers tes capacités (recherche d'entreprises par secteur/ville en Belgique).
Reste concis (3-4 phrases maximum).

Message: "{query}"
"""

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

# =====================================================================
# NŒUDS DE L'AGENT LANGGRAPH
# =====================================================================

def classify_intent_node(state: AgentState) -> AgentState:
    """
    Nœud critique d'analyse d'intention via Groq avec Structured Output.
    Garantit une extraction JSON stricte sans risque d'erreur de syntaxe.
    """
    categories_disponibles = ", ".join(CATEGORY_TAGS.keys())
    
    # 🎯 PERFECTIONNEMENT DU PROMPT : Règles de filtrage impitoyables pour l'intention 'report'
    prompt_system = f"""Tu es l'ingénieur en chef de l'analyse d'intentions de BelgoData.
Tu dois analyser la requête et retourner UNIQUEMENT un JSON avec ces champs :
- intent: "scrape" | "list" | "report" | "general"
- location: code postal belge (4 chiffres) OU nom de ville belge, sinon null
- category: une des catégories valides, sinon null
- company_name: nom de l'entreprise si intent=report, sinon null

Catégories valides : [{categories_disponibles}]

RÈGLES STRICTES :
- "scrape" = l'utilisateur veut TROUVER, CHERCHER, PROSPECTER, RECHERCHER des entreprises (ex: "trouve des bureaux à 2000", "prospecter des restaurants à Anvers", "cherche des cafés")
- "list" = l'utilisateur veut VOIR, MONTRER, LISTER des prospects déjà en base (ex: "montre-moi les cafés", "liste les prospects")
- "report" = l'utilisateur veut un BILAN, ANALYSE, RAPPORT sur une entreprise précise (ex: "fait bilan sur X", "analyse l'entreprise Y")
- "general" = tout le reste (salutation, question hors-sujet, conversation)

IMPORTANT : Si la requête contient un nom de ville belge (Anvers, Bruxelles, Gand, Liège, Namur, Bruges, Louvain...) sans code postal, convertis-le en code postal dans 'location' :
- Anvers → 2000
- Bruxelles → 1000
- Gand → 9000
- Liège → 4000
- Namur → 5000
- Bruges → 8000
- Louvain → 3000

Retourne UNIQUEMENT le JSON, rien d'autre.
"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt_system},
                {"role": "user", "content": state["user_query"]}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.0,  # Zéro absolu pour éliminer toute dérive créative
            response_format={"type": "json_object"}
        )

        donnees_extraites = json.loads(chat_completion.choices[0].message.content)
        
        # Validation via le schéma Pydantic
        intention_validee = ExtractionIntention(**donnees_extraites)

        # Synchronisation avec l'état global du graphe
        state["intent"] = intention_validee.intent
        state["category"] = intention_validee.category
        state["company_name"] = intention_validee.company_name
        state["postal_code"] = intention_validee.location

    except Exception as e:
        logger.error(f"⚠️ Erreur lors de l'extraction de l'intention : {e}")
        state["intent"] = "general"
        state["postal_code"] = None
        state["category"] = None
        state["company_name"] = None

    return state


def scrape_node(state: AgentState) -> AgentState:
    """
    Effectue le requêtage OSM (Overpass) et déclenche l'enrichissement local des leads.
    """
    postal_code = state.get("postal_code")
    category = state.get("category")

    if not postal_code or not category:
        missing = []
        if not postal_code:
            missing.append("une localisation/code postal belge (ex: 1000, Leuven, Bruges)")
        if not category:
            missing.append(f"une catégorie valide parmi ({', '.join(CATEGORY_TAGS.keys())})")
        
        state["response"] = (
            f"J'ai besoin de {' et '.join(missing)} pour lancer une recherche de prospection précise. "
            f"Exemple : \"Trouve des pâtisseries à Leuven\"."
        )
        state["suggested_actions"] = ["Restaurants à 1000 Bruxelles", "Cafés à 2000 Anvers"]
        return state

    bbox = get_bbox_from_location(postal_code)
    if bbox is None:
        state["response"] = f"Désolé, je n'ai pas pu géolocaliser la zone ou le code postal '{postal_code}' en Belgique."
        state["suggested_actions"] = []
        return state

    raw_results = query_overpass(bbox, category)
    total_osm_elements = len(raw_results.get("elements", []))
    prospects = normalize_osm_results(raw_results, postal_code)

    prospects_enrichis = []
    deep_scrape_count = 0
    max_deep_scrapes = 5

    for p in prospects:
        if p.get("website") and (not p.get("phone") or not p.get("email")) and deep_scrape_count < max_deep_scrapes:
            try:
                logger.info(f"Enrichissement Deep Scraping sur : {p['name']} ({p['website']})")
                infos_manquantes = deep_scraping_prospect(p["website"])
                
                if infos_manquantes and isinstance(infos_manquantes, dict):
                    if not p.get("phone") and infos_manquantes.get("phone"):
                        p["phone"] = infos_manquantes["phone"]
                    if not p.get("email") and infos_manquantes.get("email"):
                        p["email"] = infos_manquantes["email"]
            except Exception as e:
                logger.warning(f"Le Deep Scraping a échoué pour {p['name']} mais on continue : {e}")
            deep_scrape_count += 1

        prospects_enrichis.append(p)

    summary = insert_prospects(
        prospects_enrichis,
        user_id=state.get("user_id"),
        user_name=state.get("user_name"),
    )

    state["scraped_count"] = summary["inserted"]
    state["prospects_sample"] = prospects_enrichis[:5]
    state["response"] = (
        f"✅ Prospection terminée avec succès pour '{postal_code}' !\n"
        f"J'ai trouvé {total_osm_elements} éléments OSM dans la catégorie '{category}', dont {len(prospects_enrichis)} prospects exploitables.\n"
        f"• {summary['inserted']} nouveaux profils ajoutés à votre base de prospects.\n"
        f"• {summary['skipped']} profils déjà enregistrés mis à jour."
    )
    
    other_categories = [c for c in CATEGORY_TAGS.keys() if c != category]
    state["suggested_actions"] = [
        f"Chercher des {other_categories[0] if other_categories else 'entreprises'} à {postal_code}",
        "Changer de secteur de recherche"
    ]
    return state


def list_prospects_node(state: AgentState) -> AgentState:
    """
    Récupère et liste les prospects actuellement stockés dans MongoDB selon les filtres.
    """
    db = get_db()
    collection = db["prospects"]

    filter_query = {}
    location_desc = []
    
    if state.get("postal_code"):
        filter_query["address.postcode"] = state["postal_code"]
        location_desc.append(f"à {state['postal_code']}")
    if state.get("category"):
        filter_query["category"] = state["category"]
        location_desc.append(f"dans le secteur '{state['category']}'")

    results = list(collection.find(filter_query).limit(10))
    total = collection.count_documents(filter_query)

    results = mongo_to_json_safe(results)

    state["prospects_sample"] = results
    state["scraped_count"] = total
    
    location_text = " ".join(location_desc) if location_desc else "au total global"
    if total == 0:
        state["response"] = (
            f"Aucun prospect n'est actuellement enregistré en base de données {location_text}. "
            f"Souhaitez-vous lancer une extraction de données automatique ?"
        )
        state["suggested_actions"] = [
            f"Scraper {state.get('category', 'des entreprises')} à {state.get('postal_code', '1000')}"
        ]
    else:
        state["response"] = f"📋 Affichage de {len(results)}/{total} prospects trouvés en base {location_text}."
        state["suggested_actions"] = ["Exporter les résultats en CSV", "Affiner la recherche"]
    
    return state


def generate_report_node(state: AgentState) -> AgentState:
    """
    Génère un rapport B2B complet enrichi par le web avec scoring algorithmique.
    """
    db = get_db()
    collection = db["prospects"]

    company_name = state.get("company_name")
    if not company_name:
        state["response"] = "Veuillez me fournir le nom exact de l'entreprise pour laquelle vous souhaitez générer un rapport."
        state["suggested_actions"] = []
        return state

    # Utilisation d'une regex pour tolérer les fautes de frappes ou casses partielles
    prospect = collection.find_one({"name": {"$regex": company_name, "$options": "i"}})
    if not prospect:
        state["response"] = f"Je ne trouve pas l'entreprise '{company_name}' dans notre base locale de prospects. Pensez à lancer une recherche géolocalisée (Scraping) au préalable."
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
            "analyse": "L'analyse automatisée est momentanément indisponible.", 
            "forces": [], "faiblesses": [], "argumentaire": "",
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
        "requestedBy": {
            "userId": state.get("user_id"),
            "userName": state.get("user_name"),
        },
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }

    reports_collection = db["reports"]
    result = reports_collection.insert_one(report_doc)
    # Option C : répercute le score RAG sur le prospect
    collection.update_one(
        {"_id": prospect["_id"]},
        {"$set": {"score": analysis.get("score", 50)}}
    )
    report_doc["_id"] = str(result.inserted_id)

    state["report"] = report_doc
    state["response"] = (
        f"📊 **Bilan stratégique généré avec succès pour {prospect.get('name')}**\n\n"
        f"• **Score global** : {analysis.get('score')}/100\n"
        f"• **Présence digitale** : {analysis.get('presence_digitale')}\n"
        f"• **Analyse** : {analysis.get('analyse')}\n\n"
        f"💡 *Données consolidées avec {len(web_results)} source(s) externes du Web.*"
    )
    state["suggested_actions"] = []
    return state


def general_node(state: AgentState) -> AgentState:
    """
    Gère les conversations informelles et l'accueil des utilisateurs.
    """
    prompt = GENERAL_PROMPT.format(query=state["user_query"])
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    state["response"] = completion.choices[0].message.content.strip()
    state["suggested_actions"] = []
    return state


def clarify_node(state: AgentState) -> AgentState:
    """
    Nœud de secours si l'intention de l'utilisateur n'est pas claire.
    """
    state["response"] = (
        "Je n'ai pas bien compris les critères de votre recherche. Voici des exemples d'utilisation de la plateforme :\n"
        "• 🔍 **Lancer un Scraping** : \"Trouve des pâtisseries à Leuven\" ou \"Recherche des garages à Bruges\"\n"
        "• 📋 **Consulter la Base** : \"Montre-moi les cafés enregistrés à Anvers\"\n"
        "• 📊 **Générer un Bilan B2B** : \"Fait bilan sur The Bakers\" ou \"Analyse l'entreprise [Nom]\""
    )
    state["suggested_actions"] = [
        "Pâtisseries à Leuven",
        "Cafés à Anvers"
    ]
    return state