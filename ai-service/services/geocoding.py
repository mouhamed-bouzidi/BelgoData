import requests
import os
import time

NOMINATIM_URL = os.getenv("NOMINATIM_URL", "https://nominatim.openstreetmap.org/search")
USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "BelgoData-Dev/1.0")

# Cache simple en mémoire pour éviter de re-géocoder le même code postal
_bbox_cache = {}

# Mapping des villes belges principales aux codes postaux (non exhaustif, pour aide)
BELGIUM_CITIES = {
    "bruxelles": "1000",
    "brussels": "1000",
    "anvers": "2000",
    "antwerp": "2000",
    "louvain": "3000",
    "leuven": "3000",
    "malines": "3000",
    "namur": "5000",
    "charleroi": "6000",
    "liège": "4000",
    "liege": "4000",
    "bruges": "8000",
    "brugge": "8000",
    "gand": "9000",
    "gent": "9000",
    "verviers": "4800",
    "arlon": "6700",
    "spa": "4900",
    "mons": "7000",
    "tournai": "7500",
}


def get_bbox_from_location(location: str, country: str = "Belgium"):
    """
    Géocode un code postal OU un nom de ville belge.
    """
    cache_key = f"{location}_{country}"
    if cache_key in _bbox_cache:
        return _bbox_cache[cache_key]

    # Si c'est un code postal (4 chiffres), on utilise le paramètre dédié
    is_postal_code = location.strip().isdigit() and len(location.strip()) == 4

    params = {
        "country": country,
        "format": "json",
        "limit": 1,
    }
    if is_postal_code:
        params["postalcode"] = location
    else:
        params["city"] = location

    headers = {"User-Agent": USER_AGENT}
    response = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=10)
    response.raise_for_status()

    data = response.json()
    if not data:
        return None

    raw_bbox = data[0]["boundingbox"]
    bbox = {
        "south": float(raw_bbox[0]),
        "north": float(raw_bbox[1]),
        "west": float(raw_bbox[2]),
        "east": float(raw_bbox[3]),
    }

    _bbox_cache[cache_key] = bbox
    time.sleep(1)
    return bbox

def get_postal_code_from_city(city_name: str) -> str | None:
    """
    Essaie de trouver le code postal à partir du nom de la ville.
    Retourne le code postal ou None.
    """
    normalized = city_name.lower().strip()
    return BELGIUM_CITIES.get(normalized)


def get_bbox_from_postal_code(postal_code: str, country: str = "Belgium"):
    """
    Convertit un code postal belge en bounding box (south, west, north, east).
    Utilise un cache mémoire pour éviter les appels répétés.
    """
    cache_key = f"{postal_code}_{country}"
    if cache_key in _bbox_cache:
        return _bbox_cache[cache_key]

    params = {
        "postalcode": postal_code,
        "country": country,
        "format": "json",
        "limit": 1,
    }
    headers = {"User-Agent": USER_AGENT}

    response = requests.get(NOMINATIM_URL, params=params, headers=headers, timeout=10)
    response.raise_for_status()

    data = response.json()
    if not data:
        return None

    raw_bbox = data[0]["boundingbox"]  # format Nominatim: [south, north, west, east] en string
    bbox = {
        "south": float(raw_bbox[0]),
        "north": float(raw_bbox[1]),
        "west": float(raw_bbox[2]),
        "east": float(raw_bbox[3]),
    }

    _bbox_cache[cache_key] = bbox

    # Respect du rate limit Nominatim : 1 req/sec max
    time.sleep(1)
    

    
    return bbox