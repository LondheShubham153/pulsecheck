from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.routes import api, chaos, health, metrics, pods

STATIC = "app/static"

app = FastAPI(title="PulseCheck", docs_url=None, redoc_url=None)
app.include_router(api.router)
app.include_router(pods.router)
app.include_router(health.router)
app.include_router(chaos.router)
app.include_router(metrics.router)
app.mount("/static", StaticFiles(directory=STATIC), name="static")


@app.get("/", include_in_schema=False)
async def index():
    return FileResponse(f"{STATIC}/index.html")
