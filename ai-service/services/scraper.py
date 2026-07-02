import requests
import os
import json
import urllib.request
import re
from datetime import datetime, timezone
import logging
import requests

OVERPASS_URL = os.getenv("OVERPASS_URL", "https://overpass-api.de/api/interpreter")
USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "BelgoData-Dev/1.0")  # même UA, réutilisé

CATEGORY_TAGS = {
    "boulangerie": 'shop=bakery',
    "restaurant": 'amenity=restaurant',
    "bureau": 'office',
    "commerce": 'shop',
    "cafe": 'amenity=cafe',
    "coiffeur": 'shop=hairdresser',
    "pharmacie": 'amenity=pharmacy',
    "finance": 'office=financial',
    "banque": 'amenity=bank',
    "ecole": 'amenity=school',
    "universite": 'amenity=university',
    "asbl": 'office=ngo',
    "avocat": 'office=lawyer',
    "notaire": 'office=notary',
    "immobilier": 'office=estate_agent',
    "medecin": 'amenity=doctors',
    "dentiste": 'amenity=dentist',
    "hotel": 'tourism=hotel',
    "supermarche": 'shop=supermarket',
    "garage": 'shop=car_repair',
    "assurance": 'office=insurance',
}


class BelgianPostcodeResolver:
    """
    Chargeur et résolveur dynamique de tous les codes postaux officiels de Belgique.
    Élimine les conflits de villes et résout les communes de manière transparente.
    """
    _cache_postcodes = {}

    @classmethod
    def _initialize_belgian_data(cls):
        """Télécharge et indexe en mémoire le référentiel complet des codes postaux belges"""
        if cls._cache_postcodes:
            return
        
        try:
            url = "https://raw.githubusercontent.com/m69/belgian-postcodes/master/postcodes.json"
            req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode('utf-8'))
                
                for item in data:
                    cp = str(item.get("postcode")).strip()
                    # Priorité linguistique : Français si disponible, sinon Néerlandais, sinon nom brut
                    city_name = item.get("french") or item.get("dutch") or item.get("scraped_name")
                    if cp and city_name and cp not in cls._cache_postcodes:
                        cls._cache_postcodes[cp] = city_name.strip()
                        
        except Exception as e:
            print(f"⚠️ Impossible de charger la base distante des codes postaux: {e}")
            # Registre de secours pour assurer le fonctionnement en mode dégradé
            cls._cache_postcodes = {
                "1000": "Bruxelles", "1020": "Laeken", "1030": "Schaerbeek", "1050": "Ixelles",
                "2000": "Anvers", "3000": "Leuven", "3001": "Heverlee", "3010": "Kessel-Lo", 
                "4000": "Liège", "5000": "Namur", "6000": "Charleroi", "7000": "Mons", 
                "8000": "Bruges", "9000": "Gand", "9100": "Saint-Nicolas"
            }

    @classmethod
    def resolve_city_and_province(cls, postcode: str, fallback_city: str | None) -> tuple[str, str]:
        """Retourne un tuple (vrai_nom_de_ville, nom_de_province) pour toute la Belgique"""
        cls._initialize_belgian_data()
        cp_clean = str(postcode).strip()
        
        # 1. Résolution de la ville
        city = fallback_city.strip() if fallback_city else ""
        if cp_clean in cls._cache_postcodes:
            city = cls._cache_postcodes[cp_clean]
        elif not city or city.lower() == "bruxelles":
            city = "Bruxelles" if cp_clean.startswith("10") else "Belgique"

        # 2. Résolution de la province par tranche officielle
        province = "Belgique"
        if cp_clean.isdigit() and len(cp_clean) == 4:
            prefix = int(cp_clean[:2])
            if 10 <= prefix <= 12:
                province = "Région de Bruxelles-Capitale"
            elif 13 <= prefix <= 14:
                province = "Brabant Wallon"
            elif 15 <= prefix <= 19:
                province = "Brabant Flamand"
            elif 20 <= prefix <= 29:
                province = "Province d'Anvers"
            elif 30 <= prefix <= 34:
                province = "Brabant Flamand"
            elif 35 <= prefix <= 39:
                province = "Province de Limbourg"
            elif 40 <= prefix <= 49:
                province = "Province de Liège"
            elif 50 <= prefix <= 59:
                province = "Province de Namur"
            elif 60 <= prefix <= 65:
                province = "Province de Hainaut"
            elif 66 <= prefix <= 69:
                province = "Province de Luxembourg"
            elif 70 <= prefix <= 79:
                province = "Province de Hainaut"
            elif 80 <= prefix <= 89:
                province = "Province de Flandre-Occidentale"
            elif 90 <= prefix <= 99:
                province = "Province de Flandre-Orientale"

        return city, province


def build_overpass_query(bbox: dict, category: str) -> str:
    tag = CATEGORY_TAGS.get(category)
    if tag is None:
        raise ValueError(f"Catégorie inconnue: {category}")

    bbox_str = f"{bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']}"

    query = f"""
    [out:json][timeout:25];
    (
      node[{tag}]({bbox_str});
      way[{tag}]({bbox_str});
    );
    out center tags;
    """
    return query


# Configuration d'un logger pour voir les alertes dans les logs Docker
logger = logging.getLogger(__name__)

def query_overpass(bbox: dict, category: str) -> dict:
    query = build_overpass_query(bbox, category)
    headers = {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    }
    
    try:
        response = requests.post(
            OVERPASS_URL,
            data={"data": query},
            headers=headers,
            timeout=30,  # Conserve le timeout de 30s
        )
        # Lève une exception si le statut HTTP est une erreur (ex: 504, 500, 404)
        response.raise_for_status()
        return response.json()

    except requests.exceptions.Timeout:
        logger.error(f"⏳ Timeout de 30s dépassé pour Overpass API (Catégorie: {category})")
        return {"elements": []}

    except requests.exceptions.HTTPError as http_err:
        logger.error(f"❌ Erreur HTTP Overpass ({response.status_code}) : {http_err}")
        return {"elements": []}

    except requests.exceptions.RequestException as req_err:
        logger.error(f"⚠️ Erreur réseau globale lors de la requête Overpass : {req_err}")
        return {"elements": []}

def clean_category(raw_category: str | None) -> str:
    """
    Regroupe les tags OSM bruts en catégories macro propres pour le Dashboard.
    """
    if not raw_category:
        return "Autre"
        
    raw_category = raw_category.lower().strip()
    
    mapping = {
        # Horeca / Alimentation
        "restaurant": "Restauration & Café",
        "fast_food": "Restauration & Café",
        "bar": "Restauration & Café",
        "cafe": "Restauration & Café",
        "coffee": "Restauration & Café",
        "bakery": "Alimentation & Boulangerie",
        
        # Administration & Public
        "diplomatic": "Administration & Secteur Public",
        "government": "Administration & Secteur Public",
        "police": "Administration & Secteur Public",
        "quango": "Administration & Secteur Public",
        "military": "Administration & Secteur Public",
        
        # Corporate / Services Professionnels
        "company": "Services aux Entreprises",
        "construction_company": "Services aux Entreprises",
        "demolition_company": "Services aux Entreprises",
        "cleaning": "Services aux Entreprises",
        "surveillance": "Services aux Entreprises",
        "property_management": "Services aux Entreprises",
        
        # Juridique & Finance
        "lawyer": "Finance & Juridique",
        "notary": "Finance & Juridique",
        "insurance": "Finance & Juridique",
        "tax_advisor": "Finance & Juridique",
        "financial_advisor": "Finance & Juridique",
        "financial": "Finance & Juridique",
        "financial_advice": "Finance & Juridique",
        "mortgage": "Finance & Juridique",
        "bank": "Finance & Juridique",
        "money_lender": "Finance & Juridique",
        "accountant": "Finance & Juridique",
        
        # Immobilier
        "estate_agent": "Immobilier",
        "coworking": "Immobilier",
        
        # Tech & Médias
        "it": "Tech & Télécom",
        "telecommunication": "Tech & Télécom",
        "broadcaster": "Tech & Télécom",
        "publisher": "Tech & Télécom",
        "newspaper": "Tech & Télécom",
        
        # Non-Profit & Politique
        "association": "Asbl & ONG",
        "ngo": "Asbl & ONG",
        "charity": "Asbl & ONG",
        "foundation": "Asbl & ONG",
        "union": "Asbl & ONG",
        "political_party": "Asbl & ONG",
        "chamber": "Asbl & ONG",
        "community_centre": "Asbl & ONG",
        "social_facility": "Asbl & ONG",
        "social_centre": "Asbl & ONG",
        "religion": "Asbl & ONG",
        "parish": "Asbl & ONG",
        
        # Éducation & Recherche
        "research": "Éducation & Recherche",
        "research_institute": "Éducation & Recherche",
        "educational_institution": "Éducation & Recherche",
        "education": "Éducation & Recherche",
        "university": "Éducation & Recherche",
        "tutoring": "Éducation & Recherche",
        "coaching": "Éducation & Recherche",
        "library": "Éducation & Recherche",
        "archive": "Éducation & Recherche",
        
        # Santé
        "therapist": "Santé",
        "physician": "Santé",
    }
    
    return mapping.get(raw_category, "Autre")


def normalize_osm_element(element: dict, postal_code: str) -> dict | None:
    """
    Transforme un élément brut Overpass en document Prospect normalisé.
    Retourne None si l'élément n'a pas de nom (inutilisable comme prospect).
    """
    tags = element.get("tags", {})
    name = tags.get("name")
    if not name:
        return None

    # Pour les "way", la position est dans un sous-objet "center"
    if element["type"] == "way" and "center" in element:
        lat = element["center"].get("lat")
        lon = element["center"].get("lon")
    else:
        lat = element.get("lat")
        lon = element.get("lon")

    # Récupération du tag brut original
    raw_category = (
        tags.get("amenity")
        or tags.get("shop")
        or tags.get("office")
    )
    
    # Unification de la catégorie
    category = clean_category(raw_category)

    # Récupération et nettoyage strict du code postal
    postcode_final = tags.get("addr:postcode", "").strip() or postal_code
    
    # Résolution croisée et sans faille de la Ville et de la Province Belge
    resolved_city, resolved_province = BelgianPostcodeResolver.resolve_city_and_province(
        postcode=postcode_final, 
        fallback_city=tags.get("addr:city")
    )

    return {
        "name": name,
        "category": category,
        "address": {
            "street": tags.get("addr:street"),
            "housenumber": tags.get("addr:housenumber"),
            "city": resolved_city,
            "postcode": postcode_final,
            "province": resolved_province,
            "country": "Belgium",
        },
        "location": {
            "type": "Point",
            "coordinates": [lon, lat] if lon is not None and lat is not None else None,
        },
        "phone": tags.get("phone") or tags.get("contact:phone"),
        "email": tags.get("email") or tags.get("contact:email"),
        "website": tags.get("website") or tags.get("contact:website"),
        "rating": None,
        "source": "osm",
        "score": None,
        "osm_id": element.get("id"),
        "osm_type": element.get("type"),
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }


def normalize_osm_results(osm_json: dict, postal_code: str) -> list[dict]:
    elements = osm_json.get("elements", [])
    prospects = []
    for element in elements:
        normalized = normalize_osm_element(element, postal_code)
        if normalized is not None:
            prospects.append(normalized)
    return prospects