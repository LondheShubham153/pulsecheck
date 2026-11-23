import ssl
from pathlib import Path

import httpx

SERVICE_ACCOUNT = Path("/var/run/secrets/kubernetes.io/serviceaccount")
API = "https://kubernetes.default.svc"

_client = None


class Unavailable(Exception):
    pass


def available():
    return (SERVICE_ACCOUNT / "token").exists()


def namespace():
    if not available():
        raise Unavailable()
    return (SERVICE_ACCOUNT / "namespace").read_text().strip()


def client():
    global _client
    if _client is None:
        context = ssl.create_default_context(cafile=str(SERVICE_ACCOUNT / "ca.crt"))
        _client = httpx.AsyncClient(base_url=API, verify=context, timeout=5)
    return _client


async def call(method, path, **kwargs):
    if not available():
        raise Unavailable()
    token = (SERVICE_ACCOUNT / "token").read_text().strip()
    response = await client().request(method, path, headers={"Authorization": f"Bearer {token}"}, **kwargs)
    response.raise_for_status()
    return response.json()
