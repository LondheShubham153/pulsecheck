import asyncio
import ssl
import time
from datetime import datetime, timezone
from urllib.parse import urljoin

import httpx

from app import settings
from app.services.checks import guard
from app.services.checks.client import client

ALIVE = {401, 403, 429}


def classify(status, latency_ms):
    if status is None or status >= 500:
        return "down"
    if status in ALIVE:
        return "up" if latency_ms <= settings.SLOW_MS else "degraded"
    if status >= 400 or latency_ms > settings.SLOW_MS:
        return "degraded"
    return "up"


def tls_days(response):
    try:
        cert = response.extensions["network_stream"].get_extra_info("ssl_object").getpeercert()
        return int((ssl.cert_time_to_seconds(cert["notAfter"]) - time.time()) // 86400)
    except Exception:
        return None


def result(status, started, days, error=None):
    latency = int((time.perf_counter() - started) * 1000)
    return {
        "state": classify(status, latency),
        "status": status,
        "latency_ms": latency,
        "tls_days": days,
        "error": error,
        "checked_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }


async def probe(url):
    started = time.perf_counter()
    try:
        async with client.stream("GET", url) as response:
            return result(response.status_code, started, tls_days(response))
    except httpx.HTTPError as exc:
        return result(None, started, None, type(exc).__name__)


async def follow(url, started):
    for _ in range(settings.MAX_REDIRECTS + 1):
        target = await guard.validate(url)
        async with client.stream(
            "GET",
            target.pinned_url,
            headers={"Host": target.host_header},
            extensions={"sni_hostname": target.host},
            follow_redirects=False,
        ) as response:
            location = response.headers.get("location")
            if response.is_redirect and location:
                url = urljoin(url, location)
                continue
            return result(response.status_code, started, tls_days(response))
    return result(None, started, None, "TooManyRedirects")


async def probe_custom(url):
    started = time.perf_counter()
    try:
        async with asyncio.timeout(settings.PROBE_TIMEOUT * 2):
            return await follow(url, started)
    except (httpx.HTTPError, guard.BlockedURL, TimeoutError) as exc:
        return result(None, started, None, type(exc).__name__)
