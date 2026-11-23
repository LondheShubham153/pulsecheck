import time
from collections import defaultdict, deque

from app import settings

MAX_KEYS = 1000
_hits = defaultdict(deque)


def client(request):
    return request.client.host if request.client else "unknown"


def prune(now):
    stale = [key for key, hits in _hits.items() if not hits or hits[-1] <= now - settings.RATE_WINDOW]
    for key in stale:
        del _hits[key]


def allow(key):
    now = time.monotonic()
    if len(_hits) > MAX_KEYS:
        prune(now)
    hits = _hits[key]
    while hits and hits[0] <= now - settings.RATE_WINDOW:
        hits.popleft()
    if len(hits) >= settings.RATE_LIMIT:
        return False
    hits.append(now)
    return True
