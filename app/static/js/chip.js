import { h } from "./dom.js";

export const hue = (text) => [...text].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 360, 7);

export function chip(text) {
  const el = h("span", "chip mono", text);
  el.style.setProperty("--hue", hue(text));
  return el;
}
