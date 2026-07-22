import os
import json
import logging
import re
import hashlib
import time
from datetime import datetime, timezone, timedelta
from typing import Optional
from groq import Groq
from bson import ObjectId
from bson.errors import InvalidId

from agent.state import AgentState, ExtractionIntention
from services.geocoding import get_bbox_from_location
from services.scraper import query_overpass, normalize_osm_results, CATEGORY_TAGS, category_search_key_to_group
from services.db import insert_prospects, get_db, mongo_to_json_safe
from services.web_search import search_company_web, format_web_context
from services.deep_scraper import deep_scraping_prospect

# Configuration du Logger pour le monitoring Docker
logger = logging.getLogger(__name__)

# Initialisation du client Groq
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# =====================================================================
# SÉCURITÉ SUPPRESSION : constantes
# =====================================================================
# Durée de validité d'une confirmation de suppression avant expiration.
DELETE_CONFIRMATION_TTL_SECONDS = 180

# Aucune limite de volume pour une suppression via le chat : la confirmation
# explicite obligatoire (voir _create/_consume_pending_confirmation) reste la
# seule protection, quelle que soit la taille du lot concerné.

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
  "argumentaire": "<2-3 phrases suggérant comment approcher cette entreprise commercialement>",
  "temperature": "chaud" | "tiede" | "froid",
  "temperature_reason": "<1 phrase courte justifiant la température choisie>"
}}

Base le score sur: téléphone (+15), email (+10), site web (+15), adresse complète (+10), pertinence du secteur (+20 max), qualité/quantité des informations web trouvées (+30 max).
Si les informations web sont vides ou non pertinentes, base-toi uniquement sur les données internes et indique une présence digitale plus faible.

Détermine "temperature" (chaleur du prospect pour la prospection commerciale) ainsi :
- "chaud" : données de contact complètes (téléphone ET email OU site web) ET présence web positive/active récente.
- "tiede" : données de contact partielles OU présence web moyenne/mitigée.
- "froid" : données de contact quasi absentes ET aucune présence web pertinente trouvée.
"""

# =====================================================================
# NŒUDS DE L'AGENT LANGGRAPH
# =====================================================================

DELETE_VERBS = ("supprime", "supprimer", "efface", "effacer", "retire", "retirer", "enlève", "enleve", "nettoie", "nettoyer", "elimine", "élimine")

BELGIAN_CITY_TO_POSTCODE = {
    "anvers": "2000", "antwerpen": "2000", "antwerp": "2000",
    "bruxelles": "1000", "brussels": "1000", "brussel": "1000",
    "gand": "9000", "gent": "9000", "ghent": "9000",
    "liege": "4000", "liège": "4000", "luik": "4000",
    "namur": "5000",
    "bruges": "8000", "brugge": "8000",
    "louvain": "3000", "leuven": "3000",
    "mons": "7000",
    "charleroi": "6000",
    "kessel-lo": "3010",
}

# Synonymes -> clé CATEGORY_TAGS canonique, pour reconnaître une catégorie
# même avec des variantes d'accent/orthographe courantes côté utilisateur.
CATEGORY_SYNONYMS = {
    "café": "cafe", "cafés": "cafe", "cafes": "cafe",
    "resto": "restaurant", "restos": "restaurant", "restaurants": "restaurant",
    "boulangeries": "boulangerie",
    "plombiers": "plombier", "chauffagiste": "plombier", "chauffagistes": "plombier",
    "electriciens": "electricien", "électricien": "electricien", "électriciens": "electricien",
    "menuisier": "menuiserie", "menuisiers": "menuiserie", "charpentier": "menuiserie",
    "entrepreneur": "construction", "entrepreneurs": "construction", "batiment": "construction", "bâtiment": "construction", "renovation": "construction", "rénovation": "construction",
    "artisan": "artisanat", "artisans": "artisanat",
}


def _rule_based_delete_extraction(raw_query: str) -> Optional[dict]:
    """
    Détecte et extrait de façon 100% déterministe (regex/mots-clés, sans LLM)
    les critères d'une demande de suppression. Utilisé en remplacement de la
    classification LLM pour cette action précise : la suppression est
    l'action la plus critique de l'agent, elle ne doit jamais dépendre de la
    fiabilité (imparfaite) d'un modèle gratuit en mode "structured output".

    Retourne None si aucun verbe de suppression n'est détecté (le message
    n'est alors pas concerné, la classification LLM classique reprend la main).
    """
    q = raw_query.lower()

    is_confirmation_reply = bool(re.search(r"\boui\b.*\bconfirme\b|\bje confirme\b", q))
    if not any(re.search(rf"\b{v}\b", q) for v in DELETE_VERBS) and not is_confirmation_reply:
        return None

    result = {
        "intent": "delete",
        "category": None,
        "location": None,
        "has_email": None,
        "has_website": None,
        "delete_confirm": None,
        "delete_all_confirm": None,
    }

    # --- Confirmations explicites ---
    if re.search(r"\boui\b.*\bconfirme\b.*\btout\b|\bconfirme\b.*\btout\b.*\bsupprim", q) or "oui, supprime tout" in q or "oui supprime tout" in q:
        result["delete_all_confirm"] = True
        result["delete_confirm"] = True
    elif re.search(r"\boui\b.*\bconfirme\b|\bje confirme\b", q):
        result["delete_confirm"] = True

    # --- Code postal (4 chiffres) ---
    postcode_match = re.search(r"\b(\d{4})\b", q)
    if postcode_match:
        result["location"] = postcode_match.group(1)
    else:
        for city, postcode in BELGIAN_CITY_TO_POSTCODE.items():
            if re.search(rf"\b{re.escape(city)}\b", q):
                result["location"] = postcode
                break

    # --- Catégorie ---
    for key in CATEGORY_TAGS.keys():
        if re.search(rf"\b{re.escape(key)}s?\b", q):
            result["category"] = key
            break
    if result["category"] is None:
        for synonym, canonical in CATEGORY_SYNONYMS.items():
            if re.search(rf"\b{re.escape(synonym)}\b", q):
                result["category"] = canonical
                break

    # --- has_email ---
    if re.search(r"sans (adresse )?e?-?mail|pas d[e']\s*e?-?mail|n'ont pas de mail|n'ont pas d'email|aucun email|aucun mail", q):
        result["has_email"] = False
    elif re.search(r"(qui ont|avec|ayant) (un |une adresse )?e?-?mail", q):
        result["has_email"] = True

    # --- has_website ---
    if re.search(r"sans site ?(web|internet)?|pas de site ?(web|internet)?|n'ont pas de site", q):
        result["has_website"] = False
    elif re.search(r"(qui ont|avec|ayant) (un )?site ?(web|internet)?", q):
        result["has_website"] = True

    # --- delete_all : "tous les prospects"/"toute la base" SANS aucun autre filtre ---
    no_other_filter = (
        result["category"] is None
        and result["location"] is None
        and result["has_email"] is None
        and result["has_website"] is None
    )
    if no_other_filter and re.search(r"tout(e)?s? la base|tous les prospects\b(?!.*(de type|de la cat|à|a\s+\d))", q):
        result["intent"] = "delete_all"

    return result


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

    # -----------------------------------------------------------------
    # PRIORITÉ ABSOLUE : suppression = parseur déterministe, pas de LLM.
    # La suppression est l'action la plus critique de l'agent ; elle ne
    # doit jamais dépendre de la fiabilité (parfois imparfaite) d'un LLM
    # en mode "structured output" gratuit. Toute présence d'un verbe de
    # suppression court-circuite complètement l'appel au modèle.
    # -----------------------------------------------------------------
    rule_based = _rule_based_delete_extraction(clean_query)
    if rule_based is not None:
        state["intent"] = rule_based["intent"]
        state["category"] = rule_based["category"]
        state["postal_code"] = rule_based["location"]
        state["city"] = None
        state["company_name"] = None
        state["company_names"] = None
        state["search"] = None
        state["limit"] = None
        state["score_min"] = None
        state["score_max"] = None
        state["rank"] = None
        state["has_email"] = rule_based["has_email"]
        state["has_website"] = rule_based["has_website"]
        state["delete_confirm"] = rule_based["delete_confirm"]
        state["delete_all_confirm"] = rule_based["delete_all_confirm"]
        return state

    prompt_system = f"""Tu es l'ingénieur en chef de l'analyse d'intentions de BelgoData.
Tu dois analyser la requête de l'utilisateur et retourner UNIQUEMENT un JSON avec ces champs :
- intent: "scrape" | "search" | "list" | "best" | "count" | "delete" | "report" | "email" | "compare" | "general" | "clarify"
- location: code postal belge (4 chiffres) OU nom de ville belge, sinon null
- city: nom de la ville extraite si disponible, sinon null
- category: une des catégories valides répertoriées ci-dessous, sinon null
- company_name: nom de l'entreprise si intent=report OU intent=email, sinon null
- company_names: liste des noms d'entreprises si intent=compare (2 noms ou plus), sinon null
- search: terme libre de recherche pour la base ou la suppression, sinon null
- limit: nombre maximum d'éléments demandés pour un classement TOP N (ex: "les 5 meilleurs", "top 10") -> limit=N. Pour un singulier explicite ("le meilleur prospect", "un prospect") -> limit=1. NE PAS utiliser limit pour une demande de rang précis (voir 'rank' ci-dessous). Sinon null.
- rank: UNIQUEMENT si l'utilisateur demande un rang précis et unique dans le classement (ex: "le 2ème meilleur score" -> rank=2, "le 3ème meilleur prospect" -> rank=3, "le deuxième" -> rank=2). Ne PAS confondre avec limit : "les 2 meilleurs" -> limit=2 (rank=null), alors que "le 2ème meilleur" -> rank=2 (limit=null).
- score_min: filtre sur le score minimum, sinon null
- score_max: filtre sur le score maximum, sinon null
- has_email: true si l'utilisateur veut des prospects QUI ONT un email, false si l'utilisateur veut ceux SANS email/pas de mail, sinon null
- has_website: true si l'utilisateur veut des prospects QUI ONT un site web, false si l'utilisateur veut ceux SANS site web/pas de site, sinon null
- delete_confirm: true si l'utilisateur confirme expressément une suppression ciblée, sinon false ou null
- delete_all_confirm: true UNIQUEMENT si l'utilisateur confirme explicitement vouloir supprimer TOUTE la base ("oui supprime tout", "je confirme"), sinon null

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

RÈGLES D'INTENTION (CRITIQUE - LIRE ATTENTIVEMENT POUR ÉVITER LA CONFUSION) :
- "scrape" = c'est L'INTENTION PAR DÉFAUT dès qu'un secteur + une localisation sont mentionnés, quel que soit le verbe utilisé (chercher, trouver, rechercher, prospecter...).
  Exemples : "plombier a namur", "trouve des bureaux à 2000", "cherche des électriciens à Namur", "recherche des restaurants à 1000", "Chercher des restaurant à 5000".
- "search" = UNIQUEMENT si l'utilisateur fait une référence EXPLICITE à sa base/ses prospects existants (mots-clés : "ma base", "mes prospects", "prospects enregistrés", "déjà scrapé", "en base de données", "que j'ai trouvé"). 
  Exemples : "recherche dans mes prospects les restaurants de 1000", "trouve mes prospects de Namur", "dans ma base, montre les plombiers".
- RÈGLE DE DÉSAMBIGUÏSATION : en cas de doute entre "scrape" et "search", choisis TOUJOURS "scrape" — l'utilisateur préfère une vraie recherche terrain plutôt qu'un résultat vide silencieux sur une base non alimentée.
- "list" = l'utilisateur veut VOIR ou LISTER des prospects existants en base (ex: "montre-moi les plombiers de ma base")
- "best" = l'utilisateur veut voir les meilleurs prospects ou les plus hauts scores (ex: "montre-moi les meilleurs prospects", "top prospects score")
- "count" = l'utilisateur veut connaître le nombre de prospects correspondant à un filtre (ex: "combien de prospects à Namur", "nombre de restaurants")
- "delete" = l'utilisateur veut supprimer des prospects existants selon UN OU PLUSIEURS critères (localisation ET/OU catégorie ET/OU has_email/has_website ET/OU score), quel que soit le verbe employé (supprime, efface, retire, enlève, nettoie). Le critère peut être UNIQUEMENT un filtre sans lieu ni catégorie.
  Exemples : "supprime les prospects de 1000", "efface les prospects sans email", "supprime tous les prospects de type café", "efface les prospects de construction à Namur", "supprime les prospects sans site web" (has_website=false, aucun lieu/catégorie requis), "supprime les restaurants qui n'ont pas de mail à Namur", "retire les prospects avec un score inférieur à 30".
  RÈGLE CRITIQUE : dès qu'un verbe de suppression (supprime/efface/retire/enlève/nettoie) est présent, l'intent est TOUJOURS "delete" ou "delete_all" — JAMAIS "general", même si un seul critère (ou aucun lieu) est mentionné.
- "delete_all" = l'utilisateur veut supprimer TOUTE la base sans aucun critère (ex: "supprime toute la base de données", "efface tous les prospects"). N'attribue JAMAIS delete_all_confirm=true sauf confirmation explicite et sans ambiguïté dans le message lui-même.
- "report" = l'utilisateur veut un BILAN, ANALYSE, RAPPORT sur une entreprise précise (ex: "fait un bilan sur l'entreprise X")
- "email" = l'utilisateur veut un EMAIL/MESSAGE de prospection prêt à envoyer pour une entreprise précise (ex: "rédige un email pour l'entreprise X", "écris-moi un mail de prospection pour Y", "génère un message pour contacter Z")
- "compare" = l'utilisateur veut COMPARER plusieurs entreprises précises entre elles pour prioriser (ex: "compare X et Y", "compare ces 3 prospects : A, B et C", "lequel entre X, Y et Z est le plus prometteur")
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

    max_attempts = 2
    last_error = None

    for attempt in range(1, max_attempts + 1):
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
            state["company_names"] = intention_validee.company_names
            state["postal_code"] = intention_validee.location
            state["city"] = intention_validee.city
            state["search"] = intention_validee.search
            state["limit"] = intention_validee.limit
            state["score_min"] = intention_validee.score_min
            state["score_max"] = intention_validee.score_max
            state["rank"] = intention_validee.rank
            state["has_email"] = intention_validee.has_email
            state["has_website"] = intention_validee.has_website
            state["delete_confirm"] = intention_validee.delete_confirm
            state["delete_all_confirm"] = intention_validee.delete_all_confirm

            last_error = None
            break

        except Exception as e:
            last_error = e
            logger.warning(f"⚠️ Tentative {attempt}/{max_attempts} d'extraction d'intention échouée : {e}")

    if last_error is not None:
        logger.error(f"⚠️ Échec définitif de l'extraction de l'intention après {max_attempts} tentatives : {last_error}")
        # Le court-circuit de suppression en amont a déjà géré tout verbe de
        # suppression avant d'arriver ici : un échec à ce stade ne concerne
        # donc jamais une demande de suppression, "general" est un repli sûr.
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

    has_email_filter = state.get("has_email")
    has_website_filter = state.get("has_website")
    if has_email_filter is not None:
        prospects = [p for p in prospects if bool(p.get("email")) == has_email_filter]
    if has_website_filter is not None:
        prospects = [p for p in prospects if bool(p.get("website")) == has_website_filter]

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


def _build_db_filter(state: AgentState, scope_to_owner: bool = False) -> dict:
    """
    Construit le filtre Mongo à partir des critères extraits par le LLM.

    BelgoData est un outil d'équipe : Admin, les collaborateurs (ex: Saif,
    Ons Salmi) et les scrapes automatiques ("Système") partagent TOUS la
    même base de prospects. Par défaut (scope_to_owner=False), aucune
    restriction par propriétaire n'est appliquée : recherche, classement,
    comptage ET suppression portent sur l'ensemble de la base partagée,
    quel que soit qui a scrapé chaque prospect à l'origine.

    Le paramètre scope_to_owner reste disponible si un jour un usage
    "mes prospects à moi uniquement" doit être ajouté (ex: un futur
    filtre explicite demandé par l'utilisateur), mais n'est plus activé
    par défaut sur aucun des nœuds actuels.

    Les prospects déjà soft-deleted (deleted=True) sont systématiquement
    exclus des lectures et des futures suppressions.
    """
    filter_query = {}
    conditions = [{"deleted": {"$ne": True}}]

    if scope_to_owner:
        user_id = state.get("user_id")
        if not user_id:
            conditions.append({"_id": {"$exists": False}})
        else:
            try:
                owner_object_id = ObjectId(user_id)
            except (InvalidId, TypeError):
                conditions.append({"_id": {"$exists": False}})
            else:
                conditions.append({"createdBy.userId": owner_object_id})

    if state.get("postal_code"):
        conditions.append({"address.postcode": state["postal_code"]})
    if state.get("city"):
        conditions.append({"address.city": {"$regex": state["city"], "$options": "i"}})
    if state.get("category"):
        group_labels = category_search_key_to_group(state["category"])
        if group_labels:
            conditions.append({"category": {"$in": group_labels}})
        else:
            # Catégorie inconnue de CATEGORY_TAGS : on retombe sur une comparaison
            # souple au cas où l'utilisateur a tapé directement un libellé groupé.
            conditions.append({"category": {"$regex": state["category"], "$options": "i"}})
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

    has_email = state.get("has_email")
    if has_email is True:
        conditions.append({"email": {"$nin": [None, ""]}})
    elif has_email is False:
        conditions.append({"$or": [{"email": None}, {"email": ""}, {"email": {"$exists": False}}]})

    has_website = state.get("has_website")
    if has_website is True:
        conditions.append({"website": {"$nin": [None, ""]}})
    elif has_website is False:
        conditions.append({"$or": [{"website": None}, {"website": ""}, {"website": {"$exists": False}}]})

    if conditions:
        filter_query["$and"] = conditions

    return filter_query


# =====================================================================
# SÉCURITÉ SUPPRESSION : confirmation liée aux critères exacts
# =====================================================================

def _hash_filter(filter_query: dict, action: str) -> str:
    """
    Empreinte stable des critères de suppression. Sert à garantir qu'une
    confirmation ("oui, confirme") valide EXACTEMENT la suppression qui a
    été annoncée à l'utilisateur, et pas une autre requête de suppression
    qui aurait été reformulée entre-temps dans la conversation.
    """
    canonical = json.dumps(filter_query, sort_keys=True, default=str)
    raw = f"{action}:{canonical}"
    return hashlib.sha256(raw.encode()).hexdigest()


def _create_pending_confirmation(db, session_id: str, user_id: str, action: str,
                                  filter_query: dict, matched_count: int) -> None:
    """
    Enregistre une intention de suppression en attente de confirmation.
    Une confirmation antérieure pour la même session est écrasée (une seule
    suppression en attente à la fois par session).

    Le filtre lui-même est stocké tel quel (pas seulement son empreinte) :
    un message de confirmation ("oui, confirme la suppression") ne répète
    généralement aucun critère, donc on ne peut pas se contenter de
    reconstruire le filtre à partir de l'état de ce tour-là pour vérifier
    l'empreinte — il faut le filtre original sous la main.
    """
    db["delete_confirmations"].update_one(
        {"session_id": session_id, "user_id": user_id},
        {"$set": {
            "action": action,
            "filter_hash": _hash_filter(filter_query, action),
            "filter_query": filter_query,
            "matched_count": matched_count,
            "created_at": datetime.now(timezone.utc),
            "expires_at": datetime.now(timezone.utc) + timedelta(seconds=DELETE_CONFIRMATION_TTL_SECONDS),
        }},
        upsert=True,
    )


def _get_pending_confirmation(db, session_id: str, user_id: str, action: str) -> Optional[dict]:
    """
    Récupère la confirmation en attente (non expirée) pour cette session/compte/action,
    sans la consommer. Retourne None si absente ou expirée (et la nettoie si expirée).
    """
    doc = db["delete_confirmations"].find_one({"session_id": session_id, "user_id": user_id})
    if not doc:
        return None
    if doc.get("action") != action:
        return None
    if doc.get("expires_at") and doc["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        db["delete_confirmations"].delete_one({"_id": doc["_id"]})
        return None
    return doc


def _consume_pending_confirmation(db, session_id: str, user_id: str, action: str,
                                   filter_query: dict, current_matched_count: int) -> bool:
    """
    Vérifie qu'une confirmation valide et non expirée existe bien pour cette
    session/utilisateur/action et correspond au filtre fourni, puis la consomme
    (empêche le rejeu de la même confirmation).
    """
    doc = db["delete_confirmations"].find_one({"session_id": session_id, "user_id": user_id})
    if not doc:
        return False

    if doc.get("expires_at") and doc["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        db["delete_confirmations"].delete_one({"_id": doc["_id"]})
        return False

    if doc.get("action") != action:
        return False

    if doc.get("filter_hash") != _hash_filter(filter_query, action):
        return False

    if doc.get("matched_count") != current_matched_count:
        # La base a changé entre la demande et la confirmation : on invalide
        # par prudence plutôt que de supprimer un ensemble différent de celui annoncé.
        db["delete_confirmations"].delete_one({"_id": doc["_id"]})
        return False

    # Confirmation valide : on la consomme immédiatement (usage unique).
    db["delete_confirmations"].delete_one({"_id": doc["_id"]})
    return True


# =====================================================================
# AFFICHAGE : mise en forme enrichie des classements
# =====================================================================

RANK_ICONS = {1: "🥇", 2: "🥈", 3: "🥉"}


def _format_prospect_line(position: int, prospect: dict) -> str:
    """
    Ligne de présentation soignée pour un prospect dans un classement :
    médaille pour le top 3, nom en gras, catégorie en italique, score mis
    en valeur, ville avec pictogramme, indicateurs email/site.
    """
    icon = RANK_ICONS.get(position, f"**{position}.**")
    name = prospect.get("name") or "Entreprise sans nom"
    category = prospect.get("category")
    score = prospect.get("score")
    address = prospect.get("address") or {}
    city = address.get("city") or address.get("postcode") or ""
    has_email = "📧" if prospect.get("email") else "❌📧"
    has_website = "🌐" if prospect.get("website") else "❌🌐"

    parts = [f"{icon} **{name}**"]
    if category:
        parts.append(f"_{category}_")
    if score is not None:
        parts.append(f"⭐ **{score}/100**")
    if city:
        parts.append(f"📍 {city}")
    parts.append(f"{has_email} {has_website}")

    return " · ".join(parts)


def _format_prospect_ranking(results: list) -> str:
    lines = [_format_prospect_line(i + 1, p) for i, p in enumerate(results)]
    return "\n".join(lines)


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
    rank = _parse_int(state.get("rank"))

    if rank is not None and rank > 0:
        cursor = collection.find(filter_query).sort({"score": -1}).skip(rank - 1).limit(1)
        results = list(cursor)
        total = collection.count_documents(filter_query)
        results = mongo_to_json_safe(results)
        state["prospects_sample"] = results
        state["scraped_count"] = total

        if not results:
            state["response"] = (
                f"Il n'y a pas de prospect au rang {rank} — seulement {total} prospect(s) au total "
                f"correspondent à vos critères."
            )
            state["suggested_actions"] = ["Voir les meilleurs prospects", "Essayer un autre filtre"]
        else:
            top = results[0]
            nom = top.get("name") or "Entreprise sans nom"
            ville = (top.get("address") or {}).get("city") or (top.get("address") or {}).get("postcode") or ""
            lieu = f" à {ville}" if ville else ""
            state["response"] = (
                f"🏆 Le {rank}ème meilleur prospect est **{nom}**{lieu} "
                f"(score {top.get('score', '?')}). Total correspondant : {total}."
            )
            state["suggested_actions"] = ["Voir le rapport d'un prospect", "Compter les prospects restants"]
        return state

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
        criteres = " pour vos critères" if state.get("category") or state.get("postal_code") or state.get("search") else ""
        if len(results) == 1:
            top = results[0]
            nom = top.get("name") or "Entreprise sans nom"
            ville = (top.get("address") or {}).get("city") or (top.get("address") or {}).get("postcode") or ""
            lieu = f" à {ville}" if ville else ""
            state["response"] = (
                f"🏆 Le meilleur prospect{criteres} est **{nom}**{lieu} "
                f"(score {top.get('score', '?')}). Total correspondant : {total}."
            )
        else:
            state["response"] = (
                f"🏆 Voici les {len(results)} meilleurs prospects{criteres} "
                f"(total correspondant : {total}) :\n\n"
                f"{_format_prospect_ranking(results)}"
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
    Supprime des prospects en base selon des critères, avec confirmation
    obligatoire vérifiée cryptographiquement (voir _create/_consume_pending_confirmation).

    Le nettoyage de la base reste pleinement possible — c'est le but premier
    de ce node — mais chaque suppression passe par 2 messages utilisateur :
    1) la demande initiale -> l'agent affiche ce qui va être supprimé et enregistre
       une confirmation en attente liée EXACTEMENT à ces critères et à ce compte.
    2) la confirmation -> l'agent revérifie que rien n'a changé entre-temps,
       puis exécute un soft delete (récupérable) et journalise l'action.
    """
    db = get_db()
    collection = db["prospects"]
    user_id = state.get("user_id")
    session_id = state.get("session_id") or "no_session"

    if not user_id:
        state["response"] = "Impossible d'identifier votre compte pour cette action. Merci de vous reconnecter."
        state["suggested_actions"] = []
        return state

    filter_query = _build_db_filter(state)  # base partagée : aucun scope par propriétaire
    has_criteria = any(k not in ("owner_id", "deleted") for cond in filter_query.get("$and", []) for k in cond.keys())

    # Une réponse de confirmation ("oui, confirme la suppression") ne répète
    # généralement aucun critère : on récupère alors le filtre déjà annoncé et
    # stocké lors de la demande initiale, plutôt que d'exiger que l'utilisateur
    # reformule tous ses critères dans son message de confirmation.
    if state.get("delete_confirm") and not has_criteria:
        pending = _get_pending_confirmation(db, session_id, user_id, "delete")
        if pending is not None:
            filter_query = pending["filter_query"]
            has_criteria = True

    if not has_criteria:
        state["response"] = (
            "Je dois avoir des critères précis avant de supprimer des prospects. "
            "Par exemple : 'Supprime les prospects de 1000' ou 'Efface les prospects de construction à Namur'."
        )
        state["suggested_actions"] = ["Supprime les prospects de ma ville", "Supprime les prospects sans email"]
        return state

    total = collection.count_documents(filter_query)
    if total == 0:
        state["response"] = "Aucun prospect ne correspond aux critères de suppression indiqués (dans vos données)."
        state["suggested_actions"] = ["Affiche les prospects correspondants", "Essaye un autre filtre"]
        return state

    if not state.get("delete_confirm"):
        # Étape 1 : on annonce précisément ce qui sera supprimé et on enregistre
        # une confirmation en attente, liée à ces critères + ce compte + ce nombre.
        _create_pending_confirmation(db, session_id, user_id, "delete", filter_query, total)

        preview = list(collection.find(filter_query).limit(3))
        preview_names = ", ".join(p.get("name", "?") for p in preview)
        more = f" (et {total - len(preview)} autre(s))" if total > len(preview) else ""
        gros_volume = (
            f"\n⚠️ Volume important ({total} prospects) — vérifiez bien vos critères avant de confirmer."
            if total > 500 else ""
        )

        state["response"] = (
            f"⚠️ Cette action va supprimer **{total} prospect(s)**, par exemple : {preview_names}{more}.{gros_volume}\n"
            f"Action réversible sous 30 jours (archivage), mais retirée de vos résultats immédiatement.\n"
            f"Répondez **'oui, confirme la suppression'** dans les {DELETE_CONFIRMATION_TTL_SECONDS // 60} minutes pour valider."
        )
        state["suggested_actions"] = ["Oui, confirme la suppression", "Annuler"]
        return state

    # Étape 2 : l'utilisateur a répondu positivement. On revérifie que la
    # confirmation en attente correspond exactement à cette suppression.
    confirmed = _consume_pending_confirmation(db, session_id, user_id, "delete", filter_query, total)
    if not confirmed:
        state["response"] = (
            "❌ Je ne trouve pas de confirmation valide pour cette suppression précise "
            "(elle a peut-être expiré, ou les critères ont changé entre-temps). "
            "Relancez la demande de suppression pour recommencer."
        )
        state["suggested_actions"] = ["Relancer la suppression"]
        return state

    result = collection.update_many(
        filter_query,
        {"$set": {
            "deleted": True,
            "deleted_at": datetime.now(timezone.utc),
            "deleted_by": user_id,
        }}
    )

    db["audit_logs"].insert_one({
        "user_id": user_id,
        "action": "delete_prospects",
        "criteria": {k: state.get(k) for k in ("postal_code", "city", "category", "search", "score_min", "score_max", "has_email", "has_website")},
        "deleted_count": result.modified_count,
        "source": "ai-agent",
        "session_id": session_id,
        "created_at": datetime.now(timezone.utc),
    })

    state["prospects_sample"] = []
    state["scraped_count"] = result.modified_count
    state["response"] = (
        f"🗑️ Suppression effectuée : **{result.modified_count} prospect(s)** retiré(s) de votre base "
        f"(archivés 30 jours, récupérables si erreur)."
    )
    state["suggested_actions"] = ["Compter les prospects restants", "Trouver les meilleurs prospects"]
    return state


EMAIL_PROMPT = """Tu es un commercial B2B expérimenté en Belgique, spécialisé en prospection par email.

=== ENTREPRISE CIBLE ===
Nom: {name}
Catégorie: {category}
Adresse: {address}
Site web: {website}

=== ÉLÉMENTS D'ANALYSE DISPONIBLES ===
{analysis_context}

Rédige un email de prospection commerciale COURT, personnalisé et prêt à envoyer pour approcher cette entreprise.
Réponds au format JSON STRICT (rien d'autre, pas de markdown), avec cette structure exacte:
{{
  "subject": "<objet de l'email, court et accrocheur, sans emoji>",
  "body": "<corps de l'email en français, ton professionnel et chaleureux, 120-180 mots, avec formule de politesse d'ouverture et de clôture, SANS placeholder du type [Votre nom] à part une signature générique 'L'équipe BelgoData'>"
}}

Le mail doit s'appuyer sur les forces/l'argumentaire ci-dessus quand disponibles, rester concret et non générique, et donner une raison précise de contacter CETTE entreprise en particulier.
"""

COMPARE_PROMPT = """Tu es un expert en stratégie commerciale B2B en Belgique.

Voici plusieurs prospects à comparer pour aider un commercial à prioriser ses efforts de prospection :

{prospects_context}

Réponds au format JSON STRICT (rien d'autre, pas de markdown), avec cette structure exacte:
{{
  "ranking": ["<nom du prospect le plus prioritaire>", "<2ème>", "<3ème>", ...],
  "recommendation": "<3-4 phrases expliquant pourquoi cet ordre de priorité et par où commencer>"
}}
"""

TEMPERATURE_EMOJI = {"chaud": "🔥", "tiede": "🌤️", "froid": "❄️"}


def _fallback_temperature(prospect: dict, score: int, web_results: list) -> tuple[str, str]:
    """
    V1 heuristique de secours (aucune API tierce) utilisée quand le LLM ne
    renvoie pas de champ "temperature" exploitable. Combine la complétude
    des coordonnées de contact, le score déjà calculé et la présence
    d'informations web trouvées (proxy de l'activité/présence en ligne).
    """
    has_phone = bool(prospect.get("phone"))
    has_email = bool(prospect.get("email"))
    has_website = bool(prospect.get("website"))
    contact_points = sum([has_phone, has_email, has_website])
    web_signal = len(web_results or [])

    if contact_points >= 2 and (score >= 65 or web_signal >= 2):
        return "chaud", "Coordonnées complètes et bonne présence en ligne."
    if contact_points == 0 and web_signal == 0:
        return "froid", "Aucune coordonnée de contact ni présence web détectée."
    return "tiede", "Données de contact ou présence web partielles."


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

    score_value = analysis.get("score", 50)
    temperature = analysis.get("temperature")
    temperature_reason = analysis.get("temperature_reason")
    if temperature not in ("chaud", "tiede", "froid"):
        temperature, temperature_reason = _fallback_temperature(prospect, score_value, web_results)

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
        "temperature": temperature,
        "temperature_reason": temperature_reason,
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
        {"$set": {"score": score_value, "temperature": temperature}}
    )
    report_doc["_id"] = str(result.inserted_id)

    temp_emoji = TEMPERATURE_EMOJI.get(temperature, "")
    temp_label = {"chaud": "Chaud", "tiede": "Tiède", "froid": "Froid"}.get(temperature, temperature)
    state["report"] = report_doc
    state["response"] = (
        f"📊 **Bilan stratégique généré avec succès pour {prospect.get('name')}**\n\n"
        f"• **Score global** : {analysis.get('score')}/100\n"
        f"• **Température** : {temp_emoji} {temp_label} — {temperature_reason}\n"
        f"• **Présence digitale** : {analysis.get('presence_digitale')}\n"
        f"• **Analyse** : {analysis.get('analyse')}\n\n"
        f"💡 *Données consolidées avec {len(web_results)} source(s) externes du Web.*"
    )
    state["suggested_actions"] = []
    return state


def generate_email_node(state: AgentState) -> AgentState:
    """
    Génère un email de prospection prêt à envoyer pour une entreprise.
    Réutilise le dernier bilan (rapport) déjà généré s'il existe, pour
    s'appuyer sur un argumentaire déjà validé ; sinon effectue une recherche
    web légère pour ne pas partir d'une page blanche.
    """
    db = get_db()
    collection = db["prospects"]

    company_name = state.get("company_name")
    if not company_name:
        state["response"] = "Pour quelle entreprise dois-je rédiger un email de prospection ? Donnez-moi son nom exact."
        state["suggested_actions"] = []
        return state

    prospect = collection.find_one({"name": {"$regex": company_name, "$options": "i"}})
    if not prospect:
        state["response"] = f"Je ne trouve pas l'entreprise '{company_name}' dans notre base locale de prospects."
        state["suggested_actions"] = []
        return state

    address_str = ", ".join(filter(None, [
        prospect.get("address", {}).get("street"),
        prospect.get("address", {}).get("city"),
        prospect.get("address", {}).get("postcode"),
    ])) or "Non renseignée"

    latest_report = db["reports"].find_one(
        {"prospect_id": str(prospect["_id"])},
        sort=[("createdAt", -1)],
    )

    if latest_report:
        analysis_context = (
            f"Score: {latest_report.get('score')}/100 | Température: {latest_report.get('temperature', 'inconnue')}\n"
            f"Analyse: {latest_report.get('analyse', '')}\n"
            f"Forces: {', '.join(latest_report.get('forces', []) or [])}\n"
            f"Argumentaire commercial suggéré: {latest_report.get('argumentaire', '')}"
        )
    else:
        web_results = search_company_web(name=prospect.get("name"), city=prospect.get("address", {}).get("city"))
        analysis_context = (
            "(Aucun bilan préalable en base pour cette entreprise.)\n" + format_web_context(web_results)
        )

    prompt = EMAIL_PROMPT.format(
        name=prospect.get("name"),
        category=prospect.get("category"),
        address=address_str,
        website=prospect.get("website") or "Non renseigné",
        analysis_context=analysis_context,
    )

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.4,
    )

    raw = completion.choices[0].message.content.strip()
    try:
        email = json.loads(raw)
        subject = email.get("subject", f"Collaboration avec {prospect.get('name')}")
        body = email.get("body", "")
    except json.JSONDecodeError:
        subject = f"Collaboration avec {prospect.get('name')}"
        body = "La génération automatisée de l'email est momentanément indisponible, veuillez réessayer."

    state["email_draft"] = {"subject": subject, "body": body, "prospect_id": str(prospect["_id"])}
    state["response"] = (
        f"✉️ **Email de prospection prêt pour {prospect.get('name')}**\n\n"
        f"**Objet :** {subject}\n\n"
        f"{body}\n\n"
        f"💡 *Copiez-collez directement dans votre client mail.*"
        + ("" if latest_report else "\n\n_Astuce : générez d'abord un bilan complet sur cette entreprise pour un email encore plus personnalisé._")
    )
    state["suggested_actions"] = []
    return state


def compare_prospects_node(state: AgentState) -> AgentState:
    """
    Compare 2 entreprises (ou plus) nommées explicitement par l'utilisateur
    et propose un ordre de priorité de prospection argumenté.
    """
    db = get_db()
    collection = db["prospects"]

    names = state.get("company_names") or ([state.get("company_name")] if state.get("company_name") else [])
    names = [n for n in (names or []) if n]

    if len(names) < 2:
        state["response"] = (
            "Donnez-moi au moins deux noms d'entreprises à comparer, par exemple : "
            "\"compare Boulangerie Dupont et Café Central\"."
        )
        state["suggested_actions"] = []
        return state

    found = []
    not_found = []
    for name in names:
        prospect = collection.find_one({"name": {"$regex": re.escape(name), "$options": "i"}})
        if not prospect:
            not_found.append(name)
            continue
        latest_report = db["reports"].find_one(
            {"prospect_id": str(prospect["_id"])},
            sort=[("createdAt", -1)],
        )
        found.append({
            "name": prospect.get("name"),
            "category": prospect.get("category"),
            "score": (latest_report or {}).get("score", prospect.get("score")),
            "temperature": (latest_report or {}).get("temperature", prospect.get("temperature")),
            "presence_digitale": (latest_report or {}).get("presence_digitale"),
            "argumentaire": (latest_report or {}).get("argumentaire"),
        })

    if len(found) < 2:
        state["response"] = (
            "Je n'ai pas trouvé assez de ces entreprises dans la base pour les comparer"
            + (f" (introuvable(s) : {', '.join(not_found)})." if not_found else ".")
            + " Lancez d'abord un scraping ou vérifiez l'orthographe."
        )
        state["suggested_actions"] = []
        return state

    prospects_context = "\n\n".join(
        f"- {p['name']} ({p['category']}) : score={p['score'] if p['score'] is not None else 'inconnu'}/100, "
        f"température={p['temperature'] or 'inconnue'}, présence digitale={p['presence_digitale'] or 'inconnue'}"
        + (f", argumentaire existant: {p['argumentaire']}" if p['argumentaire'] else "")
        for p in found
    )

    prompt = COMPARE_PROMPT.format(prospects_context=prospects_context)
    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    raw = completion.choices[0].message.content.strip()
    try:
        result = json.loads(raw)
        ranking = result.get("ranking") or [p["name"] for p in sorted(found, key=lambda p: p["score"] or 0, reverse=True)]
        recommendation = result.get("recommendation", "")
    except json.JSONDecodeError:
        ranking = [p["name"] for p in sorted(found, key=lambda p: p["score"] or 0, reverse=True)]
        recommendation = "Classement basé uniquement sur le score disponible (analyse détaillée indisponible)."

    state["comparison"] = {"prospects": found, "ranking": ranking, "recommendation": recommendation}

    lines = [f"⚖️ **Comparaison de {len(found)} prospects**\n"]
    for i, name in enumerate(ranking, start=1):
        p = next((x for x in found if x["name"] == name), None)
        if not p:
            continue
        emoji = TEMPERATURE_EMOJI.get(p["temperature"], "")
        lines.append(f"{i}. **{name}** — score {p['score'] if p['score'] is not None else '?'}/100 {emoji}")
    lines.append(f"\n💡 {recommendation}")
    if not_found:
        lines.append(f"\n_Non trouvé(s) en base : {', '.join(not_found)}_")

    state["response"] = "\n".join(lines)
    state["suggested_actions"] = []
    return state


def delete_all_prospects_node(state: AgentState) -> AgentState:
    """
    Suppression de TOUTE la base de prospects PARTAGÉE (BelgoData est un outil
    d'équipe : Admin, collaborateurs et scrapes automatiques partagent la même
    base). Cette action supprime donc les prospects de TOUS les comptes, pas
    seulement ceux de la personne qui déclenche l'action. Action à très haut
    risque : confirmation vérifiée obligatoire, et identité du demandeur
    toujours journalisée dans audit_logs.
    """
    db = get_db()
    collection = db["prospects"]
    user_id = state.get("user_id")
    session_id = state.get("session_id") or "no_session"

    if not user_id:
        state["response"] = "Impossible d'identifier votre compte pour cette action. Merci de vous reconnecter."
        state["suggested_actions"] = []
        return state

    # Portée volontairement NON restreinte au demandeur : base partagée d'équipe.
    filter_query = _build_db_filter(state, scope_to_owner=False)
    total = collection.count_documents(filter_query)

    if total == 0:
        state["response"] = "La base de prospects partagée est déjà vide."
        state["suggested_actions"] = ["Lancer une prospection"]
        return state

    if not state.get("delete_all_confirm"):
        _create_pending_confirmation(db, session_id, user_id, "delete_all", filter_query, total)
        state["response"] = (
            f"⚠️ Vous êtes sur le point de supprimer **TOUTE la base de prospects partagée** "
            f"({total} prospect(s), tous comptes confondus — Admin, collaborateurs et scrapes automatiques — "
            f"archivage 30 jours). "
            f"Répondez explicitement **'oui, supprime tout'** dans les "
            f"{DELETE_CONFIRMATION_TTL_SECONDS // 60} minutes pour confirmer."
        )
        state["suggested_actions"] = ["Oui, supprime tout", "Annuler"]
        return state

    confirmed = _consume_pending_confirmation(db, session_id, user_id, "delete_all", filter_query, total)
    if not confirmed:
        state["response"] = (
            "❌ Je ne trouve pas de confirmation valide pour cette suppression totale "
            "(expirée, ou la base a changé entre-temps). Relancez la demande pour recommencer."
        )
        state["suggested_actions"] = ["Relancer la suppression totale"]
        return state

    result = collection.update_many(
        filter_query,
        {"$set": {"deleted": True, "deleted_at": datetime.now(timezone.utc), "deleted_by": user_id}}
    )

    db["audit_logs"].insert_one({
        "user_id": user_id,
        "action": "delete_all_prospects",
        "deleted_count": result.modified_count,
        "source": "ai-agent",
        "session_id": session_id,
        "created_at": datetime.now(timezone.utc),
    })

    state["prospects_sample"] = []
    state["scraped_count"] = result.modified_count
    state["response"] = f"🗑️ La base partagée a été vidée : **{result.modified_count} prospect(s)** archivé(s) (récupérables 30 jours)."
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