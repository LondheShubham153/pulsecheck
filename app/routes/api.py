import asyncio

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.services import cache, catalog, identity, ratelimit, telemetry
from app.services.checks import guard, probe, state, statuspage

router = APIRouter(prefix="/api")


class CustomCheck(BaseModel):
    url: str


def served(result):
    return {**result, "served_by": identity.info()["pod"]}


def build(id, name, probe_result, official):
    result = {
        "id": id,
        "name": name,
        "state": state.overall(probe_result, official),
        "probe": probe_result,
        "official": official,
    }
    telemetry.CHECKS.labels(id, result["state"]).inc()
    return result


@router.get("/pod")
async def pod():
    return JSONResponse(identity.info(), headers={"Connection": "close", "Cache-Control": "no-store"})


@router.get("/services")
async def services():
    return [{"id": s["id"], "name": s["name"], "group": s["group"], "url": s["url"]} for s in catalog.load()]


@router.get("/check")
async def check(id: str):
    service = catalog.find(id)
    if not service:
        raise HTTPException(404, "Unknown service")
    cached = cache.get(f"svc:{id}")
    if cached:
        return served(cached)
    tasks = [probe.probe(service["url"])]
    if service.get("statuspage"):
        tasks.append(statuspage.fetch(service["statuspage"]))
    probe_result, *rest = await asyncio.gather(*tasks)
    result = build(id, service["name"], probe_result, rest[0] if rest else None)
    return served(cache.put(f"svc:{id}", result))


@router.post("/check")
async def check_custom(body: CustomCheck, request: Request):
    if not ratelimit.allow(ratelimit.client(request)):
        raise HTTPException(429, "Too many checks, slow down")
    cached = cache.get(f"url:{body.url}")
    if cached:
        return served(cached)
    try:
        await guard.validate(body.url)
    except guard.BlockedURL as exc:
        raise HTTPException(400, str(exc))
    result = build("custom", body.url, await probe.probe_custom(body.url), None)
    return served(cache.put(f"url:{body.url}", result))
