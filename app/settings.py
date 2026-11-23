import os
from pathlib import Path

APP_VERSION = os.getenv("APP_VERSION", "dev")
CATALOG_PATH = Path(os.getenv("CATALOG_PATH", Path(__file__).parent / "catalog.yaml"))
CHAOS_ENABLED = os.getenv("CHAOS_ENABLED", "false") == "true"
CACHE_TTL = int(os.getenv("CACHE_TTL", "15"))
PROBE_TIMEOUT = float(os.getenv("PROBE_TIMEOUT", "5"))
SLOW_MS = int(os.getenv("SLOW_MS", "2000"))
MAX_REDIRECTS = 3
MAX_URL_LENGTH = 2048
ALLOWED_PORTS = {80, 443, 8080, 8443}
RATE_LIMIT = int(os.getenv("RATE_LIMIT", "20"))
RATE_WINDOW = 60
