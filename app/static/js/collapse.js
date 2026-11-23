import { h } from "./dom.js";
import { icon } from "./icons.js";

export function bind(button, panel, { open = false, onToggle } = {}) {
  const set = (value) => {
    button.setAttribute("aria-expanded", String(value));
    panel.dataset.open = String(value);
    if (onToggle) onToggle(value);
  };
  button.addEventListener("click", () => set(button.getAttribute("aria-expanded") !== "true"));
  set(open);
}

export function disclosure(label, content, options) {
  const button = h("button", "disclose");
  button.type = "button";
  button.append(h("span", "", label), icon("chevron"));
  const panel = h("div", "collapse");
  const inner = h("div");
  inner.append(content);
  panel.append(inner);
  bind(button, panel, options);
  return [button, panel];
}
