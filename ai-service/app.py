from flask import Flask, jsonify
from dotenv import load_dotenv
import os
from services.geocoding import get_bbox_from_postal_code
from services.scraper import query_overpass
from services.scraper import build_overpass_query





load_dotenv()

app = Flask(__name__)

@app.route("/debug/overpass-query/<postal_code>/<category>", methods=["GET"])
def debug_overpass_query(postal_code, category):
    bbox = get_bbox_from_postal_code(postal_code)
    if bbox is None:
        return jsonify({"error": "Code postal non trouvé"}), 404
    query = build_overpass_query(bbox, category)
    return jsonify({"query": query}), 200

@app.route("/test/overpass/<postal_code>/<category>", methods=["GET"])
def test_overpass(postal_code, category):
    bbox = get_bbox_from_postal_code(postal_code)
    if bbox is None:
        return jsonify({"error": "Code postal non trouvé"}), 404

    results = query_overpass(bbox, category)
    return jsonify({
        "postal_code": postal_code,
        "category": category,
        "bbox": bbox,
        "total_elements": len(results.get("elements", [])),
        "raw_sample": results.get("elements", [])[:3]  # juste les 3 premiers pour vérifier
    }), 200

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "ai-service"}), 200

@app.route("/test/geocode/<postal_code>", methods=["GET"])
def test_geocode(postal_code):
    bbox = get_bbox_from_postal_code(postal_code)
    if bbox is None:
        return jsonify({"error": "Code postal non trouvé"}), 404
    return jsonify({"postal_code": postal_code, "bbox": bbox}), 200

@app.route("/debug/env", methods=["GET"])
def debug_env():
    return jsonify({
        "user_agent": os.getenv("NOMINATIM_USER_AGENT"),
        "nominatim_url": os.getenv("NOMINATIM_URL"),
    }), 200

@app.route("/debug/test-nominatim", methods=["GET"])
def debug_test_nominatim():
    import requests
    headers = {"User-Agent": os.getenv("NOMINATIM_USER_AGENT")}
    params = {"postalcode": "1000", "country": "Belgium", "format": "json", "limit": 1}
    r = requests.get(os.getenv("NOMINATIM_URL"), params=params, headers=headers, timeout=10)
    return jsonify({
        "status_code": r.status_code,
        "headers_sent": headers,
        "response_text": r.text[:500]
    }), 200

if __name__ == "__main__":
    port = int(os.getenv("PORT_AI", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)


