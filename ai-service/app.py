from flask import Flask, jsonify, request
from dotenv import load_dotenv
import os
from services.geocoding import get_bbox_from_postal_code
from services.scraper import query_overpass, normalize_osm_results
from services.db import insert_prospects
from agent.graph import agent_graph


load_dotenv()

app = Flask(__name__)


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
    summary = insert_prospects(prospects)

    return jsonify({
        "postal_code": postal_code,
        "category": category,
        "total_found": len(prospects),
        "inserted": summary["inserted"],
        "skipped_duplicates": summary["skipped"],
    }), 200

@app.route("/agent/chat", methods=["POST"])
def agent_chat():
    body = request.get_json(silent=True) or {}
    user_query = body.get("message")

    if not user_query:
        return jsonify({"error": "Le champ 'message' est requis"}), 400

    initial_state = {
        "user_query": user_query,
        "intent": None,
        "postal_code": None,
        "category": None,
        "company_name": None,
        "scraped_count": None,
        "prospects_sample": None,
        "response": None,
        "suggested_actions": None,
    }

    result = agent_graph.invoke(initial_state)

    return jsonify({
        "response": result.get("response"),
        "intent": result.get("intent"),
        "suggested_actions": result.get("suggested_actions", []),
        "prospects_sample": result.get("prospects_sample", []),
        "scraped_count": result.get("scraped_count"),
    }), 200



if __name__ == "__main__":
    port = int(os.getenv("PORT_AI", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)