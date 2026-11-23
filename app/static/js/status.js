import { h } from "./dom.js";
import { icon } from "./icons.js";

export const STATE = {
  up: { label: "Operational", icon: "check" },
  degraded: { label: "Degraded", icon: "warn" },
  down: { label: "Down", icon: "down" },
  unknown: { label: "Checking", icon: "loading" },
};

const COMPONENT = {
  operational: "up",
  degraded_performance: "degraded",
  partial_outage: "degraded",
  under_maintenance: "degraded",
  major_outage: "down",
};

const INDICATOR = { none: "up", minor: "degraded", maintenance: "degraded", major: "down", critical: "down" };

export const normalize = (state) => (STATE[state] ? state : "unknown");
export const componentState = (status) => COMPONENT[status] || "unknown";
export const indicatorState = (indicator) => INDICATOR[indicator] || "unknown";

export function badge(state, label) {
  const key = normalize(state);
  const el = h("span", `status ${key}`);
  el.append(icon(STATE[key].icon), h("span", "", label || STATE[key].label));
  return el;
}
