from pymongo import MongoClient
import os
from bson import ObjectId
from datetime import datetime


_client = None
_db = None

def mongo_to_json_safe(obj):
    """
    Convertit récursivement un document Mongo (dict/list) en structure
    100% JSON-sérialisable, en remplaçant ObjectId et datetime par des strings.
    """
    if isinstance(obj, dict):
        return {k: mongo_to_json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [mongo_to_json_safe(item) for item in obj]
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj


def get_db():
    global _client, _db
    if _db is None:
        mongo_uri = os.getenv("MONGO_URI", "mongodb://mongo:27017/BelgoData")
        _client = MongoClient(mongo_uri)
        _db = _client.get_default_database()
    return _db


def insert_prospects(prospects: list[dict]) -> dict:
    """
    Insère les prospects, en évitant les doublons via osm_id.
    Retourne un résumé: {inserted, skipped}.
    """
    if not prospects:
        return {"inserted": 0, "skipped": 0}

    db = get_db()
    collection = db["prospects"]

    inserted = 0
    skipped = 0

    for p in prospects:
        existing = collection.find_one({"osm_id": p["osm_id"], "source": "osm"})
        if existing:
            skipped += 1
            continue
        collection.insert_one(p)
        inserted += 1

    return {"inserted": inserted, "skipped": skipped}