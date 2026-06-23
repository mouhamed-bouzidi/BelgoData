import requests
import os
import time

NOMINATIM_URL = os.getenv("NOMINATIM_URL", "https://nominatim.openstreetmap.org/search")
USER_AGENT = os.getenv("NOMINATIM_USER_AGENT", "BelgoData-Dev/1.0")

# Cache simple en mémoire pour éviter de re-géocoder le même code postal
_bbox_cache = {}


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