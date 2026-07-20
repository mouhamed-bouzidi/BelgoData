import os
import json
import logging
import re
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
    Garantit une extraction JSON stricte et un mapping sémantique rigoureux pour la Belgique.
    """
    categories_disponibles = ", ".join(CATEGORY_TAGS.keys())
    
    # Nettoyage de sécurité pour contrer les fautes de frappe courantes (ex: "anamur" -> "namur")
    clean_query = state["user_query"].lower()
    clean_query = re.sub(r'\banamur\b', 'namur', clean_query)
    clean_query = re.sub(r'\bantoine\b', 'anvers', clean_query)

    prompt_system = f"""Tu es l'ingénieur en chef de l'analyse d'intentions de BelgoData.
Tu dois analyser la requête de l'utilisateur et retourner UNIQUEMENT un JSON avec ces champs :
- intent: "scrape" | "search" | "list" | "best" | "count" | "delete" | "report" | "general" | "clarify"
- location: code postal belge (4 chiffres) OU nom de ville belge, sinon null
- city: nom de la ville extraite si disponible, sinon null
- category: une des catégories valides répertoriées ci-dessous, sinon null
- company_name: nom de l'entreprise si intent=report, sinon null
- search: terme libre de recherche pour la base ou la suppression, sinon null
- limit: nombre maximum d'éléments demandés, sinon null
- score_min: filtre sur le score minimum, sinon null
- score_max: filtre sur le score maximum, sinon null
- delete_confirm: true si l'utilisateur confirme expressément une suppression, sinon false ou null

RÈGLES CRITIQUES DE MAPPING POUR LES MÉTIERS ET L'ARTISANAT :
- Si l'utilisateur mentionne un artisan du bâtiment ('plombier', 'chauffagiste', 'electricien', 'menuisier'), associe-le STRICTEMENT à sa clé respective.
- Si l'utilisateur mentionne 'construction', 'entrepreneur', 'renovation', ou 'batiment', associe-le à 'construction'.
- Si l'utilisateur mentionne 'artisanat' ou 'artisan' de manière générale, associe-le à 'artisanat'.
- Ne redirige JAMAIS une demande de construction ou d'artisanat vers la catégorie 'usine' ou 'entrepot'.

Exemples de correspondance sémantique :
- 'usine', 'manufacture', 'fabrique' → 'usine'
- 'entrepôt', 'stock', 'logistique' → 'entrepot'
- 'atelier', 'artisanat', 'artisan' → 'artisanat'
- 'menuisier', 'charpentier' → 'menuiserie'
- 'électricien', 'électricité' → 'electricien'
- 'plombier', 'plomberie', 'chauffagiste' → 'plombier'
- 'construction', 'entrepreneur', 'bâtiment' → 'construction'
- 'gym', 'fitness' → 'salle_sport'
- 'hôtel', 'hébergement' → 'hotel'

Catégories valides autorisées : [{categories_disponibles}]

RÈGLES D'INTENTION :
- "scrape" = l'utilisateur veut TROUVER, CHERCHER, PROSPECTER, RECHERCHER de nouvelles structures (ex: "plombier a namur", "trouve des bureaux à 2000", "cherche des électriciens")
- "search" = l'utilisateur veut rechercher dans la base de prospects existante, souvent avec des critères ou un terme (ex: "recherche des restaurants à 1000", "trouve mes prospects de Namur")
- "list" = l'utilisateur veut VOIR ou LISTER des prospects existants en base (ex: "montre-moi les plombiers de ma base")
- "best" = l'utilisateur veut voir les meilleurs prospects ou les plus hauts scores (ex: "montre-moi les meilleurs prospects", "top prospects score")
- "count" = l'utilisateur veut connaître le nombre de prospects correspondant à un filtre (ex: "combien de prospects à Namur", "nombre de restaurants")
- "delete" = l'utilisateur veut supprimer des prospects existants selon des critères (ex: "supprime les prospects de 1000", "efface les prospects sans email")
- "report" = l'utilisateur veut un BILAN, ANALYSE, RAPPORT sur une entreprise précise (ex: "fait un bilan sur l'entreprise X")
- "general" = tout le reste (salutations, questions générales, météo)

IMPORTANT : Si la requête contient une ville belge principale, traduis-la immédiatement en code postal valide :
- Anvers / Antwerpen → 2000
- Bruxelles / Brussels → 1000
- Gand / Gent → 9000
- Liège / Luik → 4000
- Namur → 5000
- Bruges / Brugge → 8000
- Louvain / Leuven → 3000

Retourne UNIQUEMENT le JSON, aucun texte superflu autour.
"""

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": prompt_system},
                {"role": "user", "content": clean_query}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.0,  # Strict déterminisme pour production
            response_format={"type": "json_object"}
        )

        donnees_extraites = json.loads(chat_completion.choices[0].message.content)
        
        # Validation structurée via Pydantic
        intention_validee = ExtractionIntention(**donnees_extraites)

        state["intent"] = intention_validee.intent
        state["category"] = intention_validee.category
        state["company_name"] = intention_validee.company_name
        state["postal_code"] = intention_validee.location
        state["city"] = intention_validee.city
        state["search"] = intention_validee.search
        state["limit"] = intention_validee.limit
        state["score_min"] = intention_validee.score_min
        state["score_max"] = intention_validee.score_max
        state["delete_confirm"] = intention_validee.delete_confirm

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
            missing.append("une localisation/code postal belge (ex: 5000, Namur, 1000)")
        if not category:
            missing.append(f"une catégorie valide parmi ({', '.join(CATEGORY_TAGS.keys())})")
        
        state["response"] = (
            f"J'ai besoin de {' et '.join(missing)} pour lancer une recherche de prospection précise. "
            f"Exemple : \"Trouve des plombiers à Namur\"."
        )
        state["suggested_actions"] = ["Plombiers à 5000 Namur", "Construction à 1000 Bruxelles"]
        return state

    bbox = get_bbox_from_location(postal_code)
    if bbox is None:
        state["response"] = f"Désolé, je n'ai pas pu géolocaliser la zone ou le code postal '{postal_code}' en Belgique."
        state["suggested_actions"] = []
        return state

    logger.info(f"🚀 Lancement du scraping OpenStreetMap - BBox: {bbox} | Catégorie: {category}")
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
    state["session_id"] = summary.get("session_id")

    state["scraped_count"] = summary["inserted"]
    state["prospects_sample"] = prospects_enrichis[:5]
    
    if len(prospects_enrichis) == 0:
        state["response"] = (
            f"✅ Connexion établie avec OpenStreetMap pour '{postal_code}'.\n"
            f"Malheureusement, 0 établissement n'est actuellement référencé publiquement sous le tag '{category}' dans cette zone géographique précise.\n"
            f"Conseil : Essayez d'élargir votre recherche avec un secteur parent (ex: 'artisanat' au lieu de 'plombier')."
        )
    else:
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


def _parse_int(value, default=None):
    if value is None:
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        return default


def _build_db_filter(state: AgentState) -> dict:
    filter_query = {}
    conditions = []

    if state.get("postal_code"):
        conditions.append({"address.postcode": state["postal_code"]})
    if state.get("city"):
        conditions.append({"address.city": {"$regex": state["city"], "$options": "i"}})
    if state.get("category"):
        conditions.append({"category": state["category"]})
    if state.get("company_name"):
        conditions.append({"name": {"$regex": state["company_name"], "$options": "i"}})
    if state.get("search"):
        conditions.append({
            "$or": [
                {"name": {"$regex": state["search"], "$options": "i"}},
                {"address.city": {"$regex": state["search"], "$options": "i"}},
                {"category": {"$regex": state["search"], "$options": "i"}},
            ]
        })

    score_min = _parse_int(state.get("score_min"))
    score_max = _parse_int(state.get("score_max"))
    if score_min is not None or score_max is not None:
        range_query = {}
        if score_min is not None:
            range_query["$gte"] = score_min
        if score_max is not None:
            range_query["$lte"] = score_max
        conditions.append({"score": range_query})

    if conditions:
        filter_query["$and"] = conditions

    return filter_query


def search_prospects_node(state: AgentState) -> AgentState:
    """
    Recherche et affiche les prospects stockés en base selon les critères extraits.
    """
    db = get_db()
    collection = db["prospects"]

    filter_query = _build_db_filter(state)
    limit = _parse_int(state.get("limit"), default=10)

    results = list(collection.find(filter_query).limit(limit).sort({"createdAt": -1}))
    total = collection.count_documents(filter_query)

    results = mongo_to_json_safe(results)

    state["prospects_sample"] = results
    state["scraped_count"] = total

    if total == 0:
        state["response"] = (
            "Aucun prospect ne correspond à votre recherche en base de données. "
            "Vous pouvez essayer un autre critère ou lancer une prospection OSM."
        )
        state["suggested_actions"] = [
            "Trouve des prospects à Namur",
            "Cherche les meilleurs prospects"
        ]
    else:
        criteria_text = []
        if state.get("postal_code"):
            criteria_text.append(f"à {state['postal_code']}")
        if state.get("category"):
            criteria_text.append(f"dans le secteur '{state['category']}'")
        if state.get("search"):
            criteria_text.append(f"pour '{state['search']}'")

        criteria_label = " ".join(criteria_text) if criteria_text else ""
        state["response"] = f"📋 {total} prospect(s) trouvé(s) {criteria_label}. Affichage des {len(results)} premiers résultats."
        state["suggested_actions"] = ["Exporter les résultats en CSV", "Affiner la recherche"]

    return state


def best_prospects_node(state: AgentState) -> AgentState:
    """
    Retourne les meilleurs prospects par score dans la base.
    """
    db = get_db()
    collection = db["prospects"]

    filter_query = _build_db_filter(state)
    limit = _parse_int(state.get("limit"), default=10)

    cursor = collection.find(filter_query).sort({"score": -1}).limit(limit)
    results = list(cursor)
    total = collection.count_documents(filter_query)

    results = mongo_to_json_safe(results)

    state["prospects_sample"] = results
    state["scraped_count"] = total

    if total == 0:
        state["response"] = (
            "Aucun prospect de score disponible ne correspond à vos critères. "
            "Essayez un filtre plus large ou lancez une nouvelle prospection."
        )
        state["suggested_actions"] = ["Trouve des prospects à Bruxelles", "Cherche les meilleurs prospects d'un secteur"]
    else:
        state["response"] = (
            f"🏆 Voici les {len(results)} meilleurs prospects { 'pour vos critères' if state.get('category') or state.get('postal_code') or state.get('search') else ''}. "
            f"Total correspondant : {total}."
        )
        state["suggested_actions"] = ["Voir le rapport d'un prospect", "Compter les prospects restants"]

    return state


def count_prospects_node(state: AgentState) -> AgentState:
    """
    Compte le nombre de prospects correspondant aux critères fournis.
    """
    db = get_db()
    collection = db["prospects"]

    filter_query = _build_db_filter(state)
    total = collection.count_documents(filter_query)

    state["prospects_sample"] = []
    state["scraped_count"] = total

    criteria_text = []
    if state.get("postal_code"):
        criteria_text.append(f"à {state['postal_code']}")
    if state.get("category"):
        criteria_text.append(f"dans le secteur '{state['category']}'")
    if state.get("search"):
        criteria_text.append(f"pour '{state['search']}'")

    criteria_label = " ".join(criteria_text) if criteria_text else ""
    state["response"] = f"🔢 Il y a {total} prospect(s) {criteria_label}."
    state["suggested_actions"] = ["Afficher les prospects", "Trouver les meilleurs prospects"]
    return state


def delete_prospects_node(state: AgentState) -> AgentState:
    """
    Supprime des prospects en base selon des critères de recherche sécurisés.
    """
    db = get_db()
    collection = db["prospects"]

    filter_query = _build_db_filter(state)
    if not filter_query:
        state["response"] = (
            "Je dois avoir des critères précis avant de supprimer des prospects. "
            "Par exemple : 'Supprime les prospects de 1000' ou 'Efface les prospects de construction à Namur'."
        )
        state["suggested_actions"] = ["Supprime les prospects de ma ville", "Supprime les prospects sans email"]
        return state

    total = collection.count_documents(filter_query)
    if total == 0:
        state["response"] = "Aucun prospect ne correspond aux critères de suppression indiqués."
        state["suggested_actions"] = ["Affiche les prospects correspondants", "Essaye un autre filtre"]
        return state

    result = collection.delete_many(filter_query)
    state["prospects_sample"] = []
    state["scraped_count"] = result.deleted_count
    state["response"] = (
        f"🗑️ Suppression effectuée : {result.deleted_count} prospect(s) supprimé(s) de la base."
    )
    state["suggested_actions"] = ["Compter les prospects restants", "Trouver les meilleurs prospects"]
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
        "• 🔍 **Lancer un Scraping** : \"Trouve des électriciens à Namur\" ou \"Recherche la construction à Bruxelles\"\n"
        "• 📋 **Consulter la Base** : \"Montre-moi les artisans enregistrés à Namur\"\n"
        "• 📊 **Générer un Bilan B2B** : \"Fait un bilan sur l'entreprise [Nom]\""
    )
    state["suggested_actions"] = [
        "Artisans à Namur",
        "Construction à Bruxelles"
    ]
    return state