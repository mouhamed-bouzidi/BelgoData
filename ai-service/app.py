from flask import Flask, jsonify
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "ai-service"}), 200

if __name__ == "__main__":
    port = int(os.getenv("PORT_AI", 5001))
    app.run(host="0.0.0.0", port=port, debug=True)
    