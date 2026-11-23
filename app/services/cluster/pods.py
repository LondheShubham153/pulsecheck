import asyncio

from app.services.cluster import kube

SELECTOR = "app=pulsecheck"
DEPLOYMENT = "pulsecheck"
MAX_EVENTS = 10
CAUSAL_ORDER = ["SuccessfulDelete", "SuccessfulCreate", "Killing", "Scheduled", "Pulling", "Pulled", "Created", "Started"]


class NotFound(Exception):
    pass


def version(image):
    name = image.split("@")[0].rsplit("/", 1)[-1]
    return name.partition(":")[2] or "unknown"


def shape_pod(pod):
    meta = pod["metadata"]
    status = pod.get("status", {})
    conditions = {c["type"]: c["status"] == "True" for c in status.get("conditions", [])}
    containers = status.get("containerStatuses", [])
    waiting = next((c["state"]["waiting"].get("reason") for c in containers if "waiting" in c.get("state", {})), None)
    phase = "Terminating" if meta.get("deletionTimestamp") else waiting or status.get("phase", "Unknown")
    return {
        "name": meta["name"],
        "status": phase,
        "ready": conditions.get("Ready", False),
        "ready_count": sum(1 for c in containers if c.get("ready")),
        "container_count": len(pod["spec"]["containers"]),
        "node": pod["spec"].get("nodeName"),
        "ip": status.get("podIP"),
        "restarts": sum(c.get("restartCount", 0) for c in containers),
        "created": meta["creationTimestamp"],
        "version": version(pod["spec"]["containers"][0]["image"]),
    }


def event_time(event):
    return event.get("lastTimestamp") or event.get("eventTime") or event["metadata"]["creationTimestamp"]


def shape_event(event):
    source = event.get("source", {}).get("component") or event.get("reportingComponent") or ""
    return {
        "id": event["metadata"]["uid"],
        "time": event_time(event),
        "type": event.get("type", "Normal"),
        "reason": event.get("reason", ""),
        "component": source,
        "message": event.get("message", ""),
    }


def relevant(event):
    return event.get("involvedObject", {}).get("name", "").startswith(DEPLOYMENT)


def causal_rank(event):
    reason = event.get("reason", "")
    return CAUSAL_ORDER.index(reason) if reason in CAUSAL_ORDER else len(CAUSAL_ORDER)


def newest_first(events):
    return sorted(events, key=lambda e: (event_time(e), causal_rank(e)), reverse=True)


async def list_pods(ns):
    data = await kube.call("GET", f"/api/v1/namespaces/{ns}/pods", params={"labelSelector": SELECTOR})
    return sorted((shape_pod(p) for p in data["items"]), key=lambda p: p["created"])


async def snapshot():
    ns = kube.namespace()
    pods, deployment, events = await asyncio.gather(
        list_pods(ns),
        kube.call("GET", f"/apis/apps/v1/namespaces/{ns}/deployments/{DEPLOYMENT}"),
        kube.call("GET", f"/api/v1/namespaces/{ns}/events"),
    )
    recent = newest_first(e for e in events["items"] if relevant(e))[:MAX_EVENTS]
    return {
        "deployment": {
            "name": DEPLOYMENT,
            "desired": deployment["spec"]["replicas"],
            "ready": deployment["status"].get("readyReplicas", 0),
        },
        "pods": pods,
        "events": [shape_event(e) for e in recent],
    }


async def delete(name):
    ns = kube.namespace()
    if name not in {p["name"] for p in await list_pods(ns)}:
        raise NotFound(name)
    await kube.call("DELETE", f"/api/v1/namespaces/{ns}/pods/{name}")
