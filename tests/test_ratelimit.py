from types import SimpleNamespace

from app import settings
from app.services import ratelimit


def setup_function():
    ratelimit._hits.clear()


def test_blocks_after_limit():
    for _ in range(settings.RATE_LIMIT):
        assert ratelimit.allow("a")
    assert not ratelimit.allow("a")
    assert ratelimit.allow("b")


def test_stale_keys_are_pruned_when_table_is_large(monkeypatch):
    monkeypatch.setattr(ratelimit, "MAX_KEYS", 5)
    monkeypatch.setattr(settings, "RATE_WINDOW", 0)
    for i in range(20):
        ratelimit.allow(f"ip-{i}")
    assert len(ratelimit._hits) <= 7


def test_client_handles_missing_peer():
    assert ratelimit.client(SimpleNamespace(client=None)) == "unknown"
    assert ratelimit.client(SimpleNamespace(client=SimpleNamespace(host="1.2.3.4"))) == "1.2.3.4"
