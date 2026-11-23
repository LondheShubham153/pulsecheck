import yaml

from app import settings

_loaded = (None, [])


def load():
    global _loaded
    mtime = settings.CATALOG_PATH.stat().st_mtime_ns
    if _loaded[0] != mtime:
        with open(settings.CATALOG_PATH) as file:
            _loaded = (mtime, yaml.safe_load(file)["services"])
    return _loaded[1]


def find(service_id):
    return next((s for s in load() if s["id"] == service_id), None)
