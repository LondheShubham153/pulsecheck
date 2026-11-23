import { $, h } from "../dom.js";
import { api } from "../api.js";
import { PODS_FAST_MS, PODS_SLOW_MS } from "../config.js";
import { chip } from "../chip.js";
import { bind } from "../collapse.js";
import { icon } from "../icons.js";
import { ago } from "../time.js";
import { createSheet } from "../sheet.js";
import { renderEvents } from "./events.js";
import { servingPod } from "./serving.js";
import { toast } from "../toast.js";

export const sheet = createSheet($("pods"), { modal: false });

const rows = new Map();
let first = true;
let unread = 0;
let timer;

function renderSlots(desired, ready) {
  const slots = $("slots");
  while (slots.children.length < desired) slots.append(h("span", "slot"));
  while (slots.children.length > desired) slots.lastChild.remove();
  [...slots.children].forEach((slot, i) => (slot.dataset.on = String(i < ready)));
}

function buildRow(pod, fresh) {
  const li = h("li", `pod-row${fresh ? " new" : ""}`);
  const meta = h("div", "pod-meta mono");
  meta.append(h("span", "pod-state"), h("span", "pod-rest"));
  const del = h("button", "pod-del");
  del.type = "button";
  del.setAttribute("aria-label", `Delete pod ${pod.name}`);
  del.append(icon("trash"), h("span", "pod-del-label", "Delete?"));
  li.append(chip(pod.name), meta, del);
  del.addEventListener("click", () => onDelete(pod.name, del));
  return li;
}

function updateRow(li, pod) {
  const terminating = pod.status === "Terminating";
  li.dataset.state = terminating ? "terminating" : pod.ready ? "ready" : "starting";
  li.classList.toggle("serving", pod.name === servingPod());
  li.querySelector(".pod-state").textContent = `${pod.ready_count}/${pod.container_count} ${pod.status}`;
  const node = pod.node ? pod.node.replace(/^pulsecheck-/, "") : "unscheduled";
  const restarts = pod.restarts ? ` · ${pod.restarts} restart${pod.restarts === 1 ? "" : "s"}` : "";
  li.querySelector(".pod-rest").textContent = ` · ${node} · ${ago(pod.created)}${restarts}`;
  li.querySelector(".pod-del").disabled = terminating;
}

function leave(li) {
  li.classList.add("leaving");
  li.addEventListener("animationend", () => li.remove(), { once: true });
}

function renderPods(pods) {
  const names = new Set(pods.map((p) => p.name));
  for (const [name, li] of rows) {
    if (!names.has(name)) {
      leave(li);
      rows.delete(name);
    }
  }
  for (const pod of pods) {
    if (!rows.has(pod.name)) {
      const li = buildRow(pod, !first);
      rows.set(pod.name, li);
      $("pod-list").append(li);
    }
    updateRow(rows.get(pod.name), pod);
  }
  first = false;
}

function render(data) {
  const { desired, ready } = data.deployment;
  $("rep-ready").textContent = ready;
  $("rep-desired").textContent = desired;
  $("pods-count").textContent = `${ready}/${desired}`;
  $("pods-tab").dataset.state = ready < desired ? "healing" : "ok";
  renderSlots(desired, ready);
  renderPods(data.pods);
  const added = renderEvents(data.events);
  if (added && $("events-panel").dataset.open !== "true") {
    unread += added;
    $("events-new").textContent = `${unread} new`;
    $("events-new").hidden = false;
  }
}

async function onDelete(name, button) {
  if (!button.dataset.armed) {
    button.dataset.armed = "true";
    setTimeout(() => delete button.dataset.armed, 3000);
    return;
  }
  delete button.dataset.armed;
  button.disabled = true;
  try {
    await api(`/api/pods/${encodeURIComponent(name)}`, { method: "DELETE" });
    poll();
  } catch (err) {
    button.disabled = false;
    toast(err.message);
  }
}

async function poll() {
  clearTimeout(timer);
  if (!document.hidden) {
    try {
      render(await api("/api/pods", { cache: "no-store" }));
      $("pods-tab").hidden = false;
    } catch (err) {
      if (err.status === 503) return;
    }
  }
  timer = setTimeout(poll, sheet.isOpen() ? PODS_FAST_MS : PODS_SLOW_MS);
}

export function openPods() {
  sheet.open($("pods-close"));
  $("pods-tab").classList.add("away");
  history.replaceState(null, "", "#pods");
  poll();
}

export function closePods() {
  if (!sheet.isOpen()) return;
  sheet.close();
  $("pods-tab").classList.remove("away");
  history.replaceState(null, "", location.pathname);
}

export function initPods() {
  $("pods-close").replaceChildren(icon("close"));
  $("pods-close").addEventListener("click", closePods);
  $("pods-tab").addEventListener("click", openPods);
  bind($("events-toggle"), $("events-panel"), {
    onToggle: (open) => {
      if (!open) return;
      unread = 0;
      $("events-new").hidden = true;
    },
  });
  poll();
}
