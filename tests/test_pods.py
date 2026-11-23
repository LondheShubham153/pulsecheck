from app.services.cluster import pods


def pod(**overrides):
    base = {
        "metadata": {"name": "pulsecheck-abc", "creationTimestamp": "2026-11-23T10:00:00Z"},
        "spec": {"nodeName": "worker", "containers": [{"image": "pulsecheck:1.0.0"}]},
        "status": {
            "phase": "Running",
            "podIP": "10.0.0.5",
            "conditions": [{"type": "Ready", "status": "True"}],
            "containerStatuses": [{"ready": True, "restartCount": 2, "state": {"running": {}}}],
        },
    }
    for key, value in overrides.items():
        base[key].update(value)
    return base


def test_version_from_image_reference():
    assert pods.version("pulsecheck:1.0.1") == "1.0.1"
    assert pods.version("ghcr.io/acme/pulsecheck:2.0.0") == "2.0.0"
    assert pods.version("localhost:5000/pulsecheck") == "unknown"
    assert pods.version("pulsecheck@sha256:abc123") == "unknown"
    assert pods.version("pulsecheck:1.0.0@sha256:abc123") == "1.0.0"


def test_running_pod():
    shaped = pods.shape_pod(pod())
    assert shaped["status"] == "Running"
    assert shaped["ready"] is True
    assert shaped["restarts"] == 2
    assert shaped["version"] == "1.0.0"
    assert shaped["ready_count"] == 1


def test_terminating_wins_over_running():
    shaped = pods.shape_pod(pod(metadata={"deletionTimestamp": "2026-11-23T10:05:00Z"}))
    assert shaped["status"] == "Terminating"


def test_container_creating_from_waiting_reason():
    status = {
        "phase": "Pending",
        "conditions": [],
        "containerStatuses": [{"ready": False, "state": {"waiting": {"reason": "ContainerCreating"}}}],
    }
    shaped = pods.shape_pod(pod(status=status))
    assert shaped["status"] == "ContainerCreating"
    assert shaped["ready"] is False


def test_unscheduled_pending_pod_has_no_status_block():
    raw = pod()
    raw["status"] = {"phase": "Pending"}
    raw["spec"].pop("nodeName")
    shaped = pods.shape_pod(raw)
    assert shaped["status"] == "Pending"
    assert shaped["node"] is None


def test_event_time_fallbacks():
    meta = {"uid": "u1", "creationTimestamp": "2026-11-23T10:00:00Z"}
    assert pods.event_time({"metadata": meta, "lastTimestamp": "2026-11-23T10:01:00Z"}) == "2026-11-23T10:01:00Z"
    assert pods.event_time({"metadata": meta, "eventTime": "2026-11-23T10:02:00Z"}) == "2026-11-23T10:02:00Z"
    assert pods.event_time({"metadata": meta}) == "2026-11-23T10:00:00Z"


def test_event_component_fallback():
    meta = {"uid": "u1", "creationTimestamp": "2026-11-23T10:00:00Z"}
    assert pods.shape_event({"metadata": meta, "source": {"component": "kubelet"}})["component"] == "kubelet"
    assert pods.shape_event({"metadata": meta, "reportingComponent": "default-scheduler"})["component"] == "default-scheduler"


def test_same_second_events_follow_causal_order_newest_first():
    stamp = "2026-11-23T10:00:00Z"
    events = [{"metadata": {}, "lastTimestamp": stamp, "reason": r} for r in ["Started", "Scheduled", "Created", "Pulled"]]
    assert [e["reason"] for e in pods.newest_first(events)] == ["Started", "Created", "Pulled", "Scheduled"]


def test_newer_events_come_first():
    events = [
        {"metadata": {}, "lastTimestamp": "2026-11-23T10:00:00Z", "reason": "Started"},
        {"metadata": {}, "lastTimestamp": "2026-11-23T10:00:05Z", "reason": "Killing"},
    ]
    assert pods.newest_first(events)[0]["reason"] == "Killing"


def test_relevant_filters_by_object_name():
    assert pods.relevant({"involvedObject": {"name": "pulsecheck-abc"}})
    assert not pods.relevant({"involvedObject": {"name": "coredns"}})
