import os

from app import settings
from app.services import catalog


def write(path, ids):
    path.write_text("services:\n" + "".join(f"  - id: {i}\n    name: {i}\n    group: global\n    url: https://{i}.com\n" for i in ids))


def test_load_reuses_parsed_catalog_until_file_changes(tmp_path, monkeypatch):
    path = tmp_path / "catalog.yaml"
    write(path, ["a", "b"])
    monkeypatch.setattr(settings, "CATALOG_PATH", path)
    monkeypatch.setattr(catalog, "_loaded", (None, []))

    first = catalog.load()
    assert [s["id"] for s in first] == ["a", "b"]
    assert catalog.load() is first

    write(path, ["a"])
    stat = path.stat()
    os.utime(path, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1_000_000))
    assert [s["id"] for s in catalog.load()] == ["a"]


def test_find(tmp_path, monkeypatch):
    path = tmp_path / "catalog.yaml"
    write(path, ["a", "b"])
    monkeypatch.setattr(settings, "CATALOG_PATH", path)
    monkeypatch.setattr(catalog, "_loaded", (None, []))
    assert catalog.find("b")["name"] == "b"
    assert catalog.find("zzz") is None
