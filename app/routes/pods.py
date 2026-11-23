import httpx
from fastapi import APIRouter, HTTPException, Request

from app import settings
from app.services import ratelimit
from app.services.cluster import kube, pods

router = APIRouter(prefix="/api/pods")


@router.get("")
async def list_pods():
    try:
        return await pods.snapshot()
    except kube.Unavailable:
        raise HTTPException(503, "Not running inside Kubernetes")
    except httpx.HTTPError:
        raise HTTPException(502, "Kubernetes API error")


@router.delete("/{name}", status_code=202)
async def delete_pod(name: str, request: Request):
    if not settings.CHAOS_ENABLED:
        raise HTTPException(404)
    if not ratelimit.allow(f"delete:{ratelimit.client(request)}"):
        raise HTTPException(429, "Too many requests, slow down")
    try:
        await pods.delete(name)
    except kube.Unavailable:
        raise HTTPException(503, "Not running inside Kubernetes")
    except pods.NotFound:
        raise HTTPException(404, "Pod not found")
    except httpx.HTTPError:
        raise HTTPException(502, "Kubernetes API error")
    return {"deleting": name}
