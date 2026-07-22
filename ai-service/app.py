from flask import Flask, jsonify, request
from dotenv import load_dotenv
import os
from services.geocoding import get_bbox_from_postal_code
from services.scraper import query_overpass, normalize_osm_results
from services.db import insert_prospects
from agent.graph import agent_graph
from flask_cors import CORS

load_dotenv()

app = Flask(__name__)
# Configure CORS to allow requests from frontend
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000", "http://localhost:*", "http://127.0.0.1:*"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "ai-service"}), 200


@app.route("/scrape/osm", methods=["POST"])
def scrape_osm():
    body = request.get_json(silent=True) or {}
    postal_code = body.get("postal_code")
    category = body.get("category")

    if not postal_code or not category:
        return jsonify({"error": "postal_code et category sont requis"}), 400

    bbox = get_bbox_from_postal_code(postal_code)
    if bbox is None:
        return jsonify({"error": "Code postal non trouvé"}), 404

    try:
        raw_results = query_overpass(bbox, category)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    prospects = normalize_osm_results(raw_results, postal_code)
    summary = insert_prospects(
        prospects,
        user_id=body.get("userId"),
        user_name=body.get("userName"),
    )

    return jsonify({
        "postal_code": postal_code,
        "category": category,
        "total_found": len(prospects),
        "inserted": summary["inserted"],
        "skipped_duplicates": summary["skipped"],
        "new_prospects": summary.get("new_prospects", []),
    }), 200

# ... (le reste de tes imports et routes reste inchangé)

def serialize_mongo_data(obj):
    """Convertit récursivement les ObjectId en string pour éviter le crash JSON."""
    if isinstance(obj, list):
        return [serialize_mongo_data(item) for item in obj]
    if isinstance(obj, dict):
        return {k: (str(v) if k == "_id" or v.__class__.__name__ == "ObjectId" else serialize_mongo_data(v)) for k, v in obj.items()}
    return obj

@app.route("/agent/chat", methods=["POST"])
def agent_chat():
    body = request.get_json(silent=True) or {}
    user_query = body.get("message")
    history = body.get("history", [])
    user_id = body.get("userId")
    user_name = body.get("userName")

    if not user_query:
        return jsonify({"error": "Le champ 'message' est requis"}), 400

    initial_state = {
        "user_query": user_query,
        "history": history,
        "intent": None,
        "postal_code": None,
        "category": None,
        "company_name": None,
        "company_names": None,
        "user_id": user_id,
        "user_name": user_name,
        "scraped_count": None,
        "prospects_sample": None,
        "response": None,
        "suggested_actions": None,
        "report": None,
        "email_draft": None,
        "comparison": None,
    }

    try:
        result = agent_graph.invoke(initial_state)
    except Exception as exc:
        return jsonify({
            "response": "Le service IA est momentanément indisponible. Votre demande n'a pas pu être traitée, mais vous pouvez réessayer dans quelques instants.",
            "intent": "general",
            "suggested_actions": [],
            "prospects_sample": [],
            "scraped_count": None,
            "report": None,
            "session_id": None,
            "email_draft": None,
            "comparison": None,
            "error": str(exc),
        }), 200

    # Nettoyage des prospects_sample pour convertir les ObjectId avant le jsonify
    prospects_sample = serialize_mongo_data(result.get("prospects_sample", []))

    return jsonify({
        "response": result.get("response"),
        "intent": result.get("intent"),
        "suggested_actions": result.get("suggested_actions", []),
        "prospects_sample": prospects_sample, # Utilise la version sérialisée ici !
        "scraped_count": result.get("scraped_count"),
        "report": result.get("report"),
        "session_id": result.get("session_id"),
        "email_draft": result.get("email_draft"),
        "comparison": result.get("comparison"),
    }), 200

if __name__ == "__main__":
    port = int(os.getenv("PORT_AI", 5001))
    debug_mode = os.getenv("FLASK_ENV", "production") == "development"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)