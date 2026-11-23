import { $ } from "./dom.js";
import { api } from "./api.js";
import { HISTORY, POD_POLL_MS, POLL_MS } from "./config.js";
import { hydrateIcons, icon } from "./icons.js";
import { applyFilter, buildCard, hostOf, initSpotlight, paintCard } from "./cards.js";
import { openDrawer, sheet as detail } from "./drawer.js";
import { initCrash, pollPod } from "./pods/serving.js";
import { closePods, initPods, openPods, sheet as podsSheet } from "./pods/panel.js";
import { renderSummary, renderUpdated } from "./summary.js";
import { initTheme } from "./theme.js";

const state = { services: [], filter: "all", openId: null, updatedAt: null, pendingHash: location.hash.slice(1) };
const customHistory = new Map();
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");

const push = (points, value) => [...(points || []), value].slice(-HISTORY);

function showService(service) {
  if (!service.last) return;
  closePods();
  state.openId = service.id;
  history.replaceState(null, "", `#${service.id}`);
  openDrawer({
    name: service.name,
    host: hostOf(service.url),
    logo: `/static/logos/${service.id}.svg`,
    result: service.last,
    points: service.points || [],
  });
}

function dismiss() {
  state.openId = null;
  history.replaceState(null, "", location.pathname);
  detail.close();
}

function repaint() {
  renderSummary(state.services);
  applyFilter(state.filter);
}

async function refresh(service) {
  try {
    const result = await api(`/api/check?id=${encodeURIComponent(service.id)}`);
    service.last = result;
    service.points = push(service.points, result.probe.latency_ms);
    state.updatedAt = Date.now();
  } catch {}
  paintCard(service);
  repaint();
  if (state.openId === service.id || state.pendingHash === service.id) {
    state.pendingHash = "";
    showService(service);
  }
}

const refreshAll = () => Promise.all(state.services.map(refresh));

function moveInk() {
  const active = document.querySelector("#tabs [aria-pressed='true']");
  if (!active) return;
  const ink = $("ink");
  ink.style.setProperty("--x", `${active.offsetLeft}px`);
  ink.style.setProperty("--w", `${active.offsetWidth}px`);
}

function setFilter(buttons, next) {
  const apply = () => {
    state.filter = next;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === next)));
    applyFilter(next);
    moveInk();
  };
  if (document.startViewTransition && !reduceMotion.matches) document.startViewTransition(apply);
  else apply();
}

function initTabs() {
  const buttons = [...document.querySelectorAll("[data-filter]")];
  buttons.forEach((button) => button.addEventListener("click", () => setFilter(buttons, button.dataset.filter)));
  addEventListener("resize", moveInk);
  document.fonts.ready.then(moveInk);
  moveInk();
}

function initCustomCheck() {
  const form = $("check-form");
  const input = $("url");
  const button = $("check-btn");
  const error = $("form-error");
  const idle = () => button.replaceChildren(icon("arrow"));
  idle();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.hidden = true;
    let url = input.value.trim();
    if (!url) return;
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) url = `https://${url}`;
    let host;
    try {
      host = new URL(url).hostname;
    } catch {
      error.textContent = "Enter a valid website address.";
      error.hidden = false;
      return;
    }
    button.disabled = true;
    button.replaceChildren(icon("loading", "icon spin"));
    try {
      const result = await api("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const points = push(customHistory.get(url), result.probe.latency_ms);
      customHistory.set(url, points);
      closePods();
      state.openId = "custom";
      history.replaceState(null, "", location.pathname);
      openDrawer({ name: host, host: url, logo: "", result, points });
    } catch (err) {
      error.textContent = err.message;
      error.hidden = false;
    } finally {
      button.disabled = false;
      idle();
    }
  });

  document.addEventListener("keydown", (event) => {
    const typing = ["INPUT", "TEXTAREA"].includes(document.activeElement.tagName);
    if (event.key === "/" && !typing && !detail.isOpen()) {
      event.preventDefault();
      input.focus();
    }
  });
}

function initSheets() {
  $("close").replaceChildren(icon("close"));
  $("close").addEventListener("click", dismiss);
  $("scrim").addEventListener("click", dismiss);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (detail.isOpen()) dismiss();
      else if (podsSheet.isOpen()) closePods();
    }
    if (event.key === "Tab" && detail.isOpen()) detail.trap(event);
  });
}

async function start() {
  hydrateIcons();
  initTheme();
  initTabs();
  initCustomCheck();
  initSheets();
  initCrash();
  initSpotlight();

  state.services = await api("/api/services");
  state.services.forEach((service, index) => buildCard(service, showService, index));
  repaint();
  refreshAll();

  setInterval(() => {
    if (!document.hidden) refreshAll();
  }, POLL_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && Date.now() - state.updatedAt > POLL_MS) refreshAll();
  });
  setInterval(() => renderUpdated(state.updatedAt), 1000);

  pollPod();
  setInterval(() => {
    if (!document.hidden) pollPod();
  }, POD_POLL_MS);
  initPods();
  if (state.pendingHash === "pods") {
    state.pendingHash = "";
    openPods();
  }
}

start();
