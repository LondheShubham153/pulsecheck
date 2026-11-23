import { $ } from "./dom.js";

const scrim = $("scrim");
const CLOSE_MS = 300;

export function createSheet(el, { modal = true } = {}) {
  let lastFocus = null;
  let timer = null;

  const isOpen = () => !el.hidden && !el.classList.contains("closing");

  function open(focusTarget) {
    if (isOpen()) return;
    clearTimeout(timer);
    el.classList.remove("closing");
    if (el.hidden) lastFocus = document.activeElement;
    el.hidden = false;
    if (modal) scrim.hidden = false;
    requestAnimationFrame(() => {
      el.classList.add("open");
      if (modal) scrim.classList.add("open");
    });
    if (focusTarget) focusTarget.focus({ preventScroll: true });
  }

  function close() {
    if (el.hidden) return;
    el.classList.remove("open");
    el.classList.add("closing");
    if (modal) scrim.classList.remove("open");
    clearTimeout(timer);
    timer = setTimeout(() => {
      el.hidden = true;
      el.classList.remove("closing");
      if (modal) scrim.hidden = true;
      const free = document.activeElement === document.body || el.contains(document.activeElement);
      if (free && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }, CLOSE_MS);
  }

  function trap(event) {
    const items = [...el.querySelectorAll("button, a[href], input, [tabindex]:not([tabindex='-1'])")].filter((n) => !n.disabled);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return { isOpen, open, close, trap };
}
