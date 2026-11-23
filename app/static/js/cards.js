import { $, h } from "./dom.js";
import { badge, normalize, STATE } from "./status.js";
import { sparkline } from "./spark.js";

const NS = "http://www.w3.org/2000/svg";
const MAX_STAGGER = 20;
const cards = new Map();

export const hostOf = (url) => new URL(url).hostname.replace(/^www\./, "");

export function buildCard(service, onOpen, index) {
  const card = h("button", "card loading enter");
  card.type = "button";
  card.dataset.group = service.group;
  card.dataset.state = "unknown";
  card.style.setProperty("--i", Math.min(index, MAX_STAGGER));
  card.style.viewTransitionName = `card-${service.id}`;
  card.setAttribute("aria-label", `${service.name}, checking`);
  card.addEventListener("animationend", () => card.classList.remove("enter"), { once: true });

  const logo = h("span", "logo");
  const img = h("img");
  img.src = `/static/logos/${service.id}.svg`;
  img.alt = "";
  logo.append(img);

  const top = h("div", "card-top");
  top.append(logo, badge("unknown"));

  const spark = document.createElementNS(NS, "svg");
  spark.setAttribute("class", "spark");
  spark.setAttribute("viewBox", "0 0 72 22");
  spark.setAttribute("aria-hidden", "true");

  const foot = h("div", "card-foot");
  foot.append(h("span", "latency mono", "-- ms"), spark);

  card.append(top, h("span", "card-name", service.name), h("span", "card-host mono", hostOf(service.url)), foot);
  card.addEventListener("click", () => onOpen(service));
  cards.set(service.id, card);
  $("grid").append(card);
}

export function paintCard(service) {
  const card = cards.get(service.id);
  const result = service.last;
  const state = normalize(result && result.state);
  const probe = result && result.probe;

  card.classList.remove("loading");
  card.dataset.state = state;
  card.setAttribute("aria-label", `${service.name}, ${STATE[state].label}`);
  card.querySelector(".status").replaceWith(badge(state));
  card.querySelector(".latency").textContent = probe && probe.latency_ms != null ? `${probe.latency_ms} ms` : "no data";
  sparkline(card.querySelector(".spark"), service.points || [], 72, 22);
}

export function applyFilter(filter) {
  let visible = 0;
  for (const card of cards.values()) {
    const issue = card.dataset.state === "degraded" || card.dataset.state === "down";
    const show = filter === "all" || card.dataset.group === filter || (filter === "issues" && issue);
    card.hidden = !show;
    if (show) visible += 1;
  }
  $("empty").hidden = visible > 0;
}

export function initSpotlight() {
  $("grid").addEventListener("pointermove", (event) => {
    const card = event.target.closest(".card");
    if (!card) return;
    const box = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${event.clientX - box.left}px`);
    card.style.setProperty("--my", `${event.clientY - box.top}px`);
  });
}
