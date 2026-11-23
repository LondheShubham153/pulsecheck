import { $ } from "../dom.js";
import { api } from "../api.js";
import { hue } from "../chip.js";
import { toast } from "../toast.js";

let current = null;

export const servingPod = () => current;

function paint(id, text) {
  const el = $(id);
  el.textContent = text;
  el.style.setProperty("--hue", hue(text));
}

function flash(el) {
  el.classList.remove("flash");
  void el.offsetWidth;
  el.classList.add("flash");
}

export async function pollPod() {
  const pill = $("k8s");
  try {
    const pod = await api("/api/pod", { cache: "no-store" });
    paint("pod-name", pod.pod);
    $("pod-version").textContent = /^\d/.test(pod.version) ? `v${pod.version}` : pod.version;
    if (current !== null && current !== pod.pod) flash($("pod-name"));
    current = pod.pod;
    pill.dataset.state = "ok";
    $("k8s-note").hidden = true;
  } catch {
    pill.dataset.state = "down";
    $("k8s-note").hidden = false;
  }
}

export function initCrash() {
  const button = $("crash");
  const label = $("crash-label");
  let timer;

  const disarm = () => {
    clearTimeout(timer);
    delete button.dataset.armed;
    label.textContent = "Crash pod";
  };

  button.addEventListener("click", async () => {
    if (!button.dataset.armed) {
      button.dataset.armed = "true";
      label.textContent = "Confirm?";
      timer = setTimeout(disarm, 3000);
      return;
    }
    disarm();
    const result = await fetch("/chaos/crash", { method: "POST" })
      .then((res) => res.json())
      .catch(() => null);
    toast(result ? `${result.crashing} crashed. Kubernetes restarts the container.` : "Crash sent. Kubernetes restarts the container.");
  });
}
