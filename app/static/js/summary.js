import { $ } from "./dom.js";
import { ago } from "./time.js";
import { normalize } from "./status.js";

export function renderSummary(services) {
  const counts = { up: 0, degraded: 0, down: 0 };
  for (const service of services) {
    if (service.last) counts[normalize(service.last.state)] += 1;
  }
  const checked = counts.up + counts.degraded + counts.down;
  const plural = (n) => (n === 1 ? "service is" : "services are");

  let state = "up";
  let title = "All systems operational";
  if (checked === 0) {
    state = "unknown";
    title = "Checking services";
  } else if (counts.down > 0) {
    state = "down";
    title = `${counts.down} ${plural(counts.down)} down`;
  } else if (counts.degraded > 0) {
    state = "degraded";
    title = `${counts.degraded} ${plural(counts.degraded)} degraded`;
  }

  const parts = checked ? [`${counts.up} of ${services.length} operational`] : [];
  if (counts.degraded) parts.push(`${counts.degraded} degraded`);
  if (counts.down) parts.push(`${counts.down} down`);

  const issues = counts.degraded + counts.down;
  $("summary").dataset.state = state;
  $("summary-title").textContent = title;
  $("summary-sub").textContent = parts.join(" · ");
  $("issues-count").textContent = issues;
  $("issues-count").hidden = issues === 0;
}

export function renderUpdated(updatedAt) {
  if (!updatedAt) return;
  const elapsed = ago(new Date(updatedAt).toISOString());
  $("updated").textContent = elapsed === "just now" ? "Updated just now" : `Updated ${elapsed} ago`;
}
