import { $, h } from "../dom.js";
import { clock } from "../time.js";

const WHO = {
  "replicaset-controller": "ReplicaSet",
  "deployment-controller": "Deployment",
  "default-scheduler": "Scheduler",
  kubelet: "Kubelet",
};

const EXPLAIN = {
  SuccessfulCreate: "ReplicaSet creates a replacement pod",
  SuccessfulDelete: "ReplicaSet removes a pod",
  ScalingReplicaSet: "Deployment scales its ReplicaSet",
  Scheduled: "Scheduler assigns the pod to a node",
  Pulling: "Kubelet pulls the image",
  Pulled: "Kubelet has the image ready",
  Created: "Kubelet creates the container",
  Started: "The container is running",
  Killing: "Kubelet stops the container",
  Unhealthy: "A health probe failed",
  BackOff: "Kubelet waits before restarting",
};

const nodes = new Map();
let first = true;

function build(event, fresh) {
  const li = h("li", `event${fresh ? " fresh" : ""}${event.type === "Warning" ? " warn" : ""}`);
  const body = h("div");
  const line = h("div");
  line.append(h("span", "event-who", WHO[event.component] || event.component || "Cluster"), h("span", "event-reason", event.reason));
  body.append(line, h("p", "event-text", EXPLAIN[event.reason] || event.message));
  li.append(h("span", "event-time mono", clock(event.time)), body);
  return li;
}

export function renderEvents(events) {
  const list = $("events");
  const keep = new Set(events.map((e) => e.id));
  for (const [id, li] of nodes) {
    if (!keep.has(id)) {
      li.remove();
      nodes.delete(id);
    }
  }
  let added = 0;
  const ordered = events.map((event) => {
    if (!nodes.has(event.id)) {
      nodes.set(event.id, build(event, !first));
      if (!first) added += 1;
    }
    return nodes.get(event.id);
  });
  const current = [...list.children];
  if (ordered.length !== current.length || ordered.some((li, i) => li !== current[i])) list.replaceChildren(...ordered);
  first = false;
  return added;
}
