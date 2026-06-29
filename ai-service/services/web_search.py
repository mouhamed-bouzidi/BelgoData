import os
import requests

TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")
TAVILY_URL = "https://api.tavily.com/search"


def search_company_web(name: str, city: str | None = None, max_results: int = 4) -> list[dict]:
    if not TAVILY_API_KEY:
        print("⚠️ TAVILY_API_KEY non configurée")
        return []

    query = f"{name} {city or ''} Belgique entreprise avis".strip()

    try:
        response = requests.post(
            TAVILY_URL,
            json={
                "api_key": TAVILY_API_KEY,
                "query": query,
                "max_results": max_results,
                "search_depth": "basic",
            },
            timeout=10,
        )
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"⚠️ Recherche web échouée: {e}")
        return []

    return [
        {
            "title": r.get("title", ""),
            "snippet": r.get("content", "")[:300],
            "url": r.get("url", ""),
        }
        for r in data.get("results", [])
    ]


def format_web_context(results: list[dict]) -> str:
    if not results:
        return "(Aucune information complémentaire trouvée sur le web — analyse basée uniquement sur les données internes)"
    blocks = [f"- {r['title']}: {r['snippet']}" for r in results]
    return "\n".join(blocks)