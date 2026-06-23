import requests
import os

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