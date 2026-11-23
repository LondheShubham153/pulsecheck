import httpx

from app.services.checks.client import client

MAX_COMPONENTS = 12


async def fetch(base_url):
    try:
        response = await client.get(f"{base_url}/api/v2/summary.json")
        response.raise_for_status()
        data = response.json()
        return {
            "indicator": data["status"]["indicator"],
            "description": data["status"]["description"],
            "components": [
                {"name": c["name"], "status": c["status"]}
                for c in data.get("components", [])
                if not c.get("group") and not c["name"].startswith("Visit ")
            ][:MAX_COMPONENTS],
        }
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return None
