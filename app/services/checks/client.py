import httpx

from app import settings

client = httpx.AsyncClient(
    timeout=settings.PROBE_TIMEOUT,
    follow_redirects=True,
    headers={"User-Agent": "PulseCheck/1.0"},
)
