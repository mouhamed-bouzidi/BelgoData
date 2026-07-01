import os
import sys
sys.path.append("/app")

from pymongo import MongoClient

MONGO_URI = os.getenv("MONGO_URI", "mongodb://admin:changeme@mongo:27017/BelgoData?authSource=admin")

def compute_quick_score(prospect: dict) -> int:
    score = 0
    if prospect.get("phone"): score += 20
    if prospect.get("email"): score += 25
    if prospect.get("website"): score += 20
    if prospect.get("address", {}).get("street"): score += 15
    if prospect.get("address", {}).get("city"): score += 10
    if prospect.get("category") not in ["Autre", None, "autre"]: score += 7
    return score

def main():
    client = MongoClient(MONGO_URI)
    db = client["BelgoData"]
    collection = db["prospects"]

    prospects = list(collection.find({}))
    print(f"📊 {len(prospects)} prospects à traiter...")

    updated = 0
    for p in prospects:
        score = compute_quick_score(p)
        collection.update_one({"_id": p["_id"]}, {"$set": {"score": score}})
        updated += 1

    print(f"✅ {updated} prospects mis à jour avec leur score.")
    client.close()

if __name__ == "__main__":
    main()