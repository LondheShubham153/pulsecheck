import asyncio

import pytest

from app.services.cluster import kube, pods


@pytest.fixture
def outside_cluster(tmp_path, monkeypatch):
    monkeypatch.setattr(kube, "SERVICE_ACCOUNT", tmp_path / "missing")


def test_not_available_without_service_account(outside_cluster):
    assert not kube.available()


def test_namespace_raises_unavailable_outside_cluster(outside_cluster):
    with pytest.raises(kube.Unavailable):
        kube.namespace()


def test_snapshot_raises_unavailable_outside_cluster(outside_cluster):
    with pytest.raises(kube.Unavailable):
        asyncio.run(pods.snapshot())


def test_delete_raises_unavailable_outside_cluster(outside_cluster):
    with pytest.raises(kube.Unavailable):
        asyncio.run(pods.delete("anything"))


def test_namespace_read_inside_cluster(tmp_path, monkeypatch):
    (tmp_path / "token").write_text("t")
    (tmp_path / "namespace").write_text("pulsecheck\n")
    monkeypatch.setattr(kube, "SERVICE_ACCOUNT", tmp_path)
    assert kube.namespace() == "pulsecheck"
