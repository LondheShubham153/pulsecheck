from fastapi import APIRouter, Response

from app.services import telemetry

router = APIRouter()


@router.get("/metrics")
async def metrics():
    body, content_type = telemetry.render()
    return Response(body, media_type=content_type)
