import { $ } from "./dom.js";
import { icon } from "./icons.js";

const KEY = "pulsecheck-theme";
const root = document.documentElement;

function save(value) {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
}

const current = () => root.dataset.theme || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

export function initTheme() {
  const button = $("theme");
  const sync = () => {
    const dark = current() === "dark";
    button.replaceChildren(icon(dark ? "sun" : "moon"));
    button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  };
  button.addEventListener("click", () => {
    const next = current() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    save(next);
    sync();
  });
  sync();
}
