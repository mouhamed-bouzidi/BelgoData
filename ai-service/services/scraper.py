import requests
import os
import json
import urllib.request
import re
from datetime import datetime, timezone
import logging

OVERPASS_URL = os.getenv("OVERPASS_URL", "https://overpass-api.de/api/interpreter")
USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "BelgoData-Dev/1.0")

CATEGORY_TAGS = {
    # ==================== ALIMENTATION & RESTAURATION ====================
    "restaurant": '["amenity"="restaurant"]',
    "cafe": '["amenity"="cafe"]',
    "boulangerie": '["shop"="bakery"]',
    "supermarche": '["shop"="supermarket"]',
    "epicerie": '["shop"="convenience"]',
    "boucherie": '["shop"="butcher"]',
    "poissonerie": '["shop"="seafood"]',
    "patisserie": '["shop"="confectionery"]',
    "chocolatier": '["shop"="chocolate"]',
    "traiteur": '["shop"="deli"]',
    "bar": '["amenity"="bar"]',
    "fast_food": '["amenity"="fast_food"]',
    "pizzeria": '["amenity"="fast_food"]',

    # ==================== SANTÉ & BIEN-ÊTRE ====================
    "medecin": '["amenity"="doctors"]',
    "dentiste": '["amenity"="dentist"]',
    "pharmacie": '["amenity"="pharmacy"]',
    "hopital": '["amenity"="hospital"]',
    "clinique": '["amenity"="clinic"]',
    "veterinaire": '["amenity"="veterinary"]',
    "opticien": '["shop"="optician"]',
    "kinesitherapeute": '["healthcare"="physiotherapist"]',
    "psychologue": '["healthcare"="psychotherapist"]',
    "infirmier": '["healthcare"="nurse"]',

    # ==================== COMMERCE & RETAIL ====================
    "commerce": '["shop"]',
    "coiffeur": '["shop"="hairdresser"]',
    "beaute": '["shop"="beauty"]',
    "mode": '["shop"="clothes"]',
    "chaussures": '["shop"="shoes"]',
    "bijouterie": '["shop"="jewelry"]',
    "electromenager": '["shop"="appliance"]',
    "informatique": '["shop"="computer"]',
    "telephone": '["shop"="mobile_phone"]',
    "librairie": '["shop"="books"]',
    "papeterie": '["shop"="stationery"]',
    "sport": '["shop"="sports"]',
    "jouets": '["shop"="toys"]',
    "meubles": '["shop"="furniture"]',
    "decoration": '["shop"="interior_decoration"]',
    "fleuriste": '["shop"="florist"]',
    "jardinerie": '["shop"="garden_centre"]',
    "bricolage": '["shop"="doityourself"]',
    "materiel_medical": '["shop"="medical_supply"]',
    "animaux": '["shop"="pet"]',
    "photo": '["shop"="photo"]',
    "musique": '["shop"="music"]',
    "antiquite": '["shop"="antiques"]',
    "seconde_main": '["shop"="second_hand"]',

    # ==================== INDUSTRIE & PRODUCTION ====================
    "usine": '["industrial"="factory"]',
    "factory": '["industrial"="factory"]',
    "works": '["man_made"="works"]',
    "entrepot": '["industrial"="warehouse"]',
    "atelier": '["industrial"="workshop"]',
    "imprimerie": '["industrial"="printing"]',
    "brasserie": '["industrial"="brewery"]',
    "distillerie": '["industrial"="distillery"]',
    "agroalimentaire": '["industrial"="food_processing"]',
    "metallurgie": '["industrial"="metal"]',
    "chimie": '["industrial"="chemical"]',
    "menuiserie": '["craft"="carpenter"]',
    "soudure": '["craft"="metal_construction"]',
    "electricien": '["craft"="electrician"]',
    "plombier": '["craft"="plumber"]',
    "peintre": '["craft"="painter"]',
    "couvreur": '["craft"="roofer"]',
    "maçon": '["craft"="mason"]',
    "carreleur": '["craft"="tiler"]',
    "vitrier": '["craft"="glaziery"]',

    # ==================== TRANSPORT & LOGISTIQUE ====================
    "transport": '["office"="logistics"]',
    "taxi": '["amenity"="taxi"]',
    "location_voiture": '["amenity"="car_rental"]',
    "garage": '["shop"="car_repair"]',
    "concession": '["shop"="car"]',
    "station_essence": '["amenity"="fuel"]',
    "parking": '["amenity"="parking"]',
    "demenagement": '["office"="moving_company"]',

    # ==================== SERVICES PROFESSIONNELS ====================
    "bureau": '["office"]',
    "avocat": '["office"="lawyer"]',
    "notaire": '["office"="notary"]',
    "finance": '["office"="financial"]',
    "banque": '["amenity"="bank"]',
    "assurance": '["office"="insurance"]',
    "comptable": '["office"="accountant"]',
    "conseiller_fiscal": '["office"="tax_advisor"]',
    "consultant": '["office"="consulting"]',
    "agence_communication": '["office"="advertising_agency"]',
    "recrutement": '["office"="employment_agency"]',
    "securite": '["office"="security"]',
    "nettoyage": '["office"="cleaning"]',
    "immobilier": '["office"="estate_agent"]',
    "architecte": '["office"="architect"]',
    "geometre": '["office"="surveyor"]',
    "ingenieur": '["office"="engineer"]',
    "informatique_pro": '["office"="it"]',
    "telecom": '["office"="telecommunication"]',

    # ==================== ÉDUCATION & FORMATION ====================
    "ecole": '["amenity"="school"]',
    "universite": '["amenity"="university"]',
    "creche": '["amenity"="nursery"]',
    "college": '["amenity"="college"]',
    "formation": '["amenity"="training"]',
    "auto_ecole": '["amenity"="driving_school"]',
    "musique_ecole": '["amenity"="music_school"]',
    "sport_ecole": '["leisure"="sports_centre"]',

    # ==================== HÔTELLERIE & TOURISME ====================
    "hotel": '["tourism"="hotel"]',
    "auberge": '["tourism"="hostel"]',
    "camping": '["tourism"="camp_site"]',
    "gite": '["tourism"="guest_house"]',
    "agence_voyage": '["shop"="travel_agency"]',

    # ==================== CULTURE & LOISIRS ====================
    "musee": '["tourism"="museum"]',
    "theatre": '["amenity"="theatre"]',
    "cinema": '["amenity"="cinema"]',
    "galerie": '["tourism"="gallery"]',
    "salle_sport": '["leisure"="fitness_centre"]',
    "piscine": '["leisure"="swimming_pool"]',
    "bowling": '["leisure"="bowling_alley"]',
    "escape_game": '["leisure"="escape_game"]',

    # ==================== ADMINISTRATION & PUBLIC ====================
    "mairie": '["amenity"="townhall"]',
    "poste": '["amenity"="post_office"]',
    "ambassade": '["amenity"="embassy"]',
    "police": '["amenity"="police"]',
    "pompiers": '["amenity"="fire_station"]',
    "tribunal": '["amenity"="courthouse"]',

    # ==================== ASBL & ONG ====================
    "asbl": '["office"="ngo"]',
    "association": '["office"="association"]',
    "fondation": '["office"="foundation"]',
    "eglise": '["amenity"="place_of_worship"]',
    "mosquee": '["amenity"="place_of_worship"]',

    # ==================== ARTISANAT & CONSTRUCTION ====================
    # Plusieurs tags OSM par catégorie: le tagging réel varie beaucoup selon les contributeurs
    "construction": ['["craft"="builder"]', '["office"="construction_company"]', '["building"="construction"]'],
    "artisanat": '["craft"]',
    "plombier": '["craft"="plumber"]',
    "electricien": '["craft"="electrician"]',
    "menuiserie": '["craft"="carpenter"]',
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
                    city_name = item.get("french") or item.get("dutch") or item.get("scraped_name")
                    if cp and city_name and cp not in cls._cache_postcodes:
                        cls._cache_postcodes[cp] = city_name.strip()
                        
        except Exception as e:
            print(f"⚠️ Impossible de charger la base distante des codes postaux: {e}")
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
        
        city = fallback_city.strip() if fallback_city else ""
        if cp_clean in cls._cache_postcodes:
            city = cls._cache_postcodes[cp_clean]
        elif not city or city.lower() == "bruxelles":
            city = "Bruxelles" if cp_clean.startswith("10") else "Belgique"

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

    # Une catégorie peut être associée à un seul tag (str) ou plusieurs (list),
    # pour couvrir les différentes conventions de tagging OSM du même métier.
    tags = tag if isinstance(tag, list) else [tag]

    bbox_str = f"{bbox['south']},{bbox['west']},{bbox['north']},{bbox['east']}"

    clauses = "\n      ".join(
        f"node{t}({bbox_str});\n      way{t}({bbox_str});" for t in tags
    )

    query = f"""
    [out:json][timeout:25];
    (
      {clauses}
    );
    out center tags;
    """
    return query


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
            timeout=30,
        )
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


OSM_TAG_TO_GROUP = {
    # Horeca / Alimentation
    "restaurant": "Restauration & Café",
    "fast_food": "Restauration & Café",
    "bar": "Restauration & Café",
    "cafe": "Restauration & Café",
    "coffee": "Restauration & Café",
    "bakery": "Alimentation & Boulangerie",
    "supermarket": "Alimentation & Boulangerie",
    "convenience": "Alimentation & Boulangerie",
    "butcher": "Alimentation & Boulangerie",
    "seafood": "Alimentation & Boulangerie",

    # Industrie, Artisanat & Production
    "factory": "Industrie & Production",
    "works": "Industrie & Production",
    "warehouse": "Industrie & Production",
    "workshop": "Industrie & Production",
    "printing": "Industrie & Production",
    "brewery": "Industrie & Production",
    "carpenter": "Artisanat & Construction",
    "metal_construction": "Artisanat & Construction",
    "electrician": "Artisanat & Construction",
    "plumber": "Artisanat & Construction",
    "builder": "Artisanat & Construction",
    "construction_company": "Artisanat & Construction",
    "construction": "Artisanat & Construction",

    # Administration & Public
    "townhall": "Administration & Secteur Public",
    "post_office": "Administration & Secteur Public",
    "police": "Administration & Secteur Public",
    "diplomatic": "Administration & Secteur Public",
    "government": "Administration & Secteur Public",

    # Corporate / Services Professionnels
    "company": "Services aux Entreprises",
    "logistics": "Services aux Entreprises",
    "cleaning": "Services aux Entreprises",

    # Juridique & Finance
    "lawyer": "Finance & Juridique",
    "notary": "Finance & Juridique",
    "insurance": "Finance & Juridique",
    "tax_advisor": "Finance & Juridique",
    "accountant": "Finance & Juridique",
    "bank": "Finance & Juridique",

    # Immobilier
    "estate_agent": "Immobilier",
    "coworking": "Immobilier",

    # Tech & Médias
    "it": "Tech & Télécom",
    "telecommunication": "Tech & Télécom",

    # Non-Profit & Culture
    "association": "Asbl & ONG",
    "ngo": "Asbl & ONG",
    "foundation": "Asbl & ONG",
    "place_of_worship": "Asbl & ONG",
    "museum": "Culture & Loisirs",
    "theatre": "Culture & Loisirs",

    # Éducation & Recherche
    "school": "Éducation & Recherche",
    "university": "Éducation & Recherche",

    # Santé
    "doctors": "Santé",
    "dentist": "Santé",
    "pharmacy": "Santé",
}


def category_search_key_to_group(category: str) -> list[str]:
    """
    Convertit une clé de recherche brute (ex: 'construction', 'plombier', utilisée dans
    CATEGORY_TAGS / classify_intent_node) vers le ou les libellés groupés réellement stockés
    en base par clean_category(). Nécessaire car la base stocke des macro-catégories, pas
    les clés de recherche brutes.
    """
    tags = CATEGORY_TAGS.get(category)
    if tags is None:
        return []
    tags = tags if isinstance(tags, list) else [tags]

    groups = set()
    for tag_expr in tags:
        # tag_expr ressemble à '["craft"="plumber"]' -> on extrait la valeur "plumber"
        match = re.search(r'=\s*"([^"]+)"', tag_expr)
        if match:
            value = match.group(1)
            group = OSM_TAG_TO_GROUP.get(value)
            if group:
                groups.add(group)
    return list(groups)


def clean_category(tags: dict) -> str:
    """
    Regroupe les tags OSM bruts multi-clés en macro-catégories propres pour le Dashboard.
    """
    raw_category = (
        tags.get("amenity")
        or tags.get("shop")
        or tags.get("office")
        or tags.get("industrial")
        or tags.get("craft")
        or tags.get("tourism")
        or tags.get("leisure")
        or tags.get("building")
    )
    
    if not raw_category:
        return "Autre"
        
    raw_category = raw_category.lower().strip()

    return OSM_TAG_TO_GROUP.get(raw_category, "Autre")


def normalize_osm_element(element: dict, postal_code: str) -> dict | None:
    """
    Transforme un élément brut Overpass en document Prospect normalisé.
    """
    tags = element.get("tags", {})
    
    raw_category = (
        tags.get("amenity")
        or tags.get("shop")
        or tags.get("office")
    )

    name = (
        tags.get("name")
        or tags.get("brand")
        or tags.get("operator")
        or tags.get("official_name")
    )
    if not name:
        fallback_label = raw_category.replace("_", " ").capitalize() if raw_category else "Prospect"
        name = f"{fallback_label} {element.get('id', '')}".strip()

    if element["type"] == "way" and "center" in element:
        lat = element["center"].get("lat")
        lon = element["center"].get("lon")
    else:
        lat = element.get("lat")
        lon = element.get("lon")
    
    # Résolution croisée propre de la macro-catégorie sur l'entièreté des tags
    category = clean_category(tags)

    postcode_final = tags.get("addr:postcode", "").strip() or postal_code
    
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