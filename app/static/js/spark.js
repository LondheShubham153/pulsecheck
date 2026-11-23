const NS = "http://www.w3.org/2000/svg";
const PAD = 4;
const MIN_SLOTS = 8;
const MIN_SPREAD = 0.3;

function node(name, points) {
  const el = document.createElementNS(NS, name);
  el.setAttribute("points", points);
  return el;
}

export function sparkline(svg, points, width, height, area = false) {
  svg.replaceChildren();
  if (points.length < 2) return;
  const slots = Math.max(points.length, MIN_SLOTS);
  const hi = Math.max(...points);
  const lo = Math.min(...points);
  const span = Math.max(hi - lo, hi * MIN_SPREAD, 1);
  const base = (hi + lo) / 2 - span / 2;
  const step = width / (slots - 1);
  const offset = (slots - points.length) * step;
  const coords = points.map((value, i) => {
    const x = offset + i * step;
    const y = height - PAD - ((value - base) / span) * (height - PAD * 2);
    return [x.toFixed(1), y.toFixed(1)];
  });
  const line = coords.map((c) => c.join(",")).join(" ");
  if (area) svg.append(node("polygon", `${coords[0][0]},${height} ${line} ${coords.at(-1)[0]},${height}`));
  svg.append(node("polyline", line));
}
