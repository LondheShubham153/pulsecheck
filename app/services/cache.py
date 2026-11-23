import time

from app import settings

MAX_ENTRIES = 500
_store = {}


def get(key):
    entry = _store.get(key)
    if entry and entry[0] > time.monotonic():
        return entry[1]
    _store.pop(key, None)
    return None


def put(key, value):
    if len(_store) >= MAX_ENTRIES:
        _store.clear()
    _store[key] = (time.monotonic() + settings.CACHE_TTL, value)
    return value
