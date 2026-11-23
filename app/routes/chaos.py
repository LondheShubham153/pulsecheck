import asyncio
import os

from fastapi import APIRouter, HTTPException

from app import settings
from app.services import identity

router = APIRouter(prefix="/chaos")


@router.post("/crash")
async def crash():
    if not settings.CHAOS_ENABLED:
        raise HTTPException(404)
    asyncio.get_running_loop().call_later(0.2, os._exit, 1)
    return {"crashing": identity.info()["pod"]}
