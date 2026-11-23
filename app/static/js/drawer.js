import { $, h } from "./dom.js";
import { POLL_MS } from "./config.js";
import { icon } from "./icons.js";
import { badge, componentState, indicatorState } from "./status.js";
import { sparkline } from "./spark.js";
import { chip } from "./chip.js";
import { createSheet } from "./sheet.js";
import { disclosure } from "./collapse.js";

export const sheet = createSheet($("drawer"));
let componentsOpen = false;

function metric(label, value, sub, state) {
  const el = h("div", `metric ${state || ""}`);
  el.append(h("span", "metric-label", label), h("span", "metric-value mono", String(value)), h("span", "metric-sub", sub));
  return el;
}

function renderHead(view) {
  const logo = $("drawer-logo");
  logo.replaceChildren();
  if (view.logo) {
    const img = h("img");
    img.src = view.logo;
    img.alt = "";
    logo.append(img);
  } else {
    logo.append(icon("globe", "icon"));
  }
  $("drawer-name").textContent = view.name;
  $("drawer-host").textContent = view.host;
  $("drawer-state").replaceChildren(badge(view.result.state));
}

function renderMetrics(probe) {
  const tls = probe.tls_days;
  const tlsTone = tls != null && tls < 14 ? "degraded" : "";
  $("metrics").replaceChildren(
    metric("HTTP", probe.status ?? "none", probe.error ?? "response code", probe.state),
    metric("Latency", probe.latency_ms != null ? `${probe.latency_ms} ms` : "none", "time to respond", probe.state),
    metric("TLS", tls != null ? `${tls} d` : "n/a", tls != null ? "until expiry" : "no certificate", tlsTone),
  );
}

function renderChart(points) {
  const enough = points.length >= 2;
  $("chart").toggleAttribute("hidden", !enough);
  $("chart-empty").hidden = enough;
  $("chart-empty").textContent = `Collecting data. A new check lands every ${POLL_MS / 1000} seconds.`;
  sparkline($("chart"), points, 300, 96, true);
  if (!points.length) {
    $("chart-stats").textContent = "";
    return;
  }
  const avg = Math.round(points.reduce((sum, p) => sum + p, 0) / points.length);
  $("chart-stats").textContent = `min ${Math.min(...points)} / avg ${avg} / max ${Math.max(...points)} ms`;
}

function renderServed(view) {
  const time = new Date(view.result.probe.checked_at).toLocaleTimeString();
  $("served").replaceChildren(h("span", "", "Checked by"), chip(view.result.served_by), h("span", "", `at ${time}`));
}

function renderOfficial(official) {
  const box = $("official");
  box.replaceChildren();
  if (!official) {
    box.append(h("h3", "section-title", "Official status"), h("p", "muted", "No public status feed. Showing PulseCheck's own probe only."));
    return;
  }
  const head = h("div", "official-head");
  head.append(h("h3", "section-title", "Official status"), badge(indicatorState(official.indicator)));
  const list = h("ul", "components");
  for (const component of official.components) {
    const item = h("li");
    item.append(h("span", "", component.name), badge(componentState(component.status), component.status.replaceAll("_", " ")));
    list.append(item);
  }
  const [toggle, panel] = disclosure(`Components (${official.components.length})`, list, {
    open: componentsOpen,
    onToggle: (open) => (componentsOpen = open),
  });
  box.append(head, h("p", "muted", official.description), toggle, panel);
}

export function openDrawer(view) {
  renderHead(view);
  renderMetrics(view.result.probe);
  renderChart(view.points);
  renderServed(view);
  renderOfficial(view.result.official);
  sheet.open($("close"));
}
