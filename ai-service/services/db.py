from pymongo import MongoClient
import os
from bson import ObjectId
from datetime import datetime, timezone
from typing import Optional
import uuid

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


def create_new_prospects_notification(db, user_id: Optional[str], category: str, postal_code: str, new_prospects: list[dict]) -> None:
    """
    Crée une notification "new_prospects" directement dans la collection Mongo
    utilisée par le backend Node (mêmes champs que le modèle Mongoose Notification).
    Source unique de notification, quel que soit le chemin de scraping
    (chat manuel via /agent/chat, appel direct /scrape/osm, ou watched search).
    """
    if not user_id or not new_prospects:
        return
    try:
        sample = [p.get("name") for p in new_prospects[:5] if p.get("name")]
        now = datetime.now(timezone.utc)
        db["notifications"].insert_one({
            "userId": ObjectId(user_id),
            "type": "new_prospects",
            "message": f"{len(new_prospects)} nouveau(x) prospect(s) ajouté(s) pour \"{category}\"",
            "meta": {
                "category": category,
                "postalCode": postal_code,
                "count": len(new_prospects),
                "sample": sample,
            },
            "read": False,
            "createdAt": now,
            "updatedAt": now,
        })
    except Exception as e:
        # Une notification ratée ne doit jamais faire échouer le scraping.
        print(f"⚠️ Échec de création de la notification: {e}")


def insert_prospects(prospects: list[dict], user_id: Optional[str] = None, user_name: Optional[str] = None) -> dict:
    """
    Insère les prospects, en évitant les doublons via osm_id.
    Ajoute le champ createdBy quand un utilisateur est fourni.
    Crée une notification "new_prospects" si des prospects ont réellement été ajoutés.
    Retourne un résumé: {inserted, skipped}.
    """
    if not prospects:
        return {"inserted": 0, "skipped": 0, "session_id": None}

    db = get_db()
    collection = db["prospects"]

    session_id = str(uuid.uuid4())

    inserted = 0
    skipped = 0
    new_prospects = []

    for p in prospects:
        existing = collection.find_one({"osm_id": p["osm_id"], "source": "osm"})
        if existing:
            skipped += 1
            continue
        p["sessionId"] = session_id
        if user_id or user_name:
            p["createdBy"] = {
                "userId": ObjectId(user_id) if user_id else None,
                "userName": user_name,
            }

        collection.insert_one(p)
        inserted += 1
        new_prospects.append({
            "name": p.get("name"),
            "category": p.get("category"),
            "city": (p.get("address") or {}).get("city"),
        })

        
    category = prospects[0].get("category") if prospects else "inconnu"
    postal_code = prospects[0].get("address", {}).get("postcode") if prospects else "inconnu"

    create_new_prospects_notification(db, user_id, category, postal_code, new_prospects)

    # Sauvegarde la session en base
    db["scrapingsessions"].insert_one({
        "sessionId": session_id,
        "userId": user_id,
        "userName": user_name,
        "category": prospects[0].get("category") if prospects else "inconnu",
        "postalCode": prospects[0].get("address", {}).get("postcode") if prospects else "inconnu",
        "totalFound": len(prospects),
        "inserted": inserted,
        "skipped": skipped,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    })

    return {"inserted": inserted, "skipped": skipped, "session_id": session_id, "new_prospects": new_prospects}