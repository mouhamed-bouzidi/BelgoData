import requests
import os
from datetime import datetime, timezone


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
}


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


def query_overpass(bbox: dict, category: str) -> dict:
    query = build_overpass_query(bbox, category)
    headers = {
        "User-Agent": USER_AGENT,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
    }
    response = requests.post(
        OVERPASS_URL,
        data={"data": query},
        headers=headers,
        timeout=30,
    )
    response.raise_for_status()
    return response.json()  


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

    category = (
        tags.get("amenity")
        or tags.get("shop")
        or tags.get("office")
        or "autre"
    )

    return {
        "name": name,
        "category": category,
        "address": {
            "street": tags.get("addr:street"),
            "housenumber": tags.get("addr:housenumber"),
            "city": tags.get("addr:city"),
            "postcode": tags.get("addr:postcode") or postal_code,
            "province": None,  # à enrichir plus tard si besoin
            "country": "Belgium",
        },
        "location": {
            "type": "Point",
            "coordinates": [lon, lat] if lon is not None and lat is not None else None,
        },
        "phone": tags.get("phone") or tags.get("contact:phone"),
        "email": tags.get("email") or tags.get("contact:email"),
        "website": tags.get("website") or tags.get("contact:website"),
        "rating": None,  # OSM n'a pas de système d'avis natif
        "source": "osm",
        "score": None,  # calculé plus tard par le RAG
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
