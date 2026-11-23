# PulseCheck

Stateless FastAPI uptime monitor used in a 1-hour beginner Kubernetes masterclass: Why Kubernetes, Pods, Deployments, Services, self-healing.

## Layout
- `app/routes` HTTP endpoints. `app/services/checks/` probes, SSRF guard, status pages. `app/services/cluster/` Kubernetes API and pods. `app/services/` also holds small shared helpers. `app/catalog.yaml` is the service list
- `app/static` dashboard: `css/` tokens, base, components; `js/` small ES modules wired by `app.js`, pods panel in `js/pods/`; `fonts/` self-hosted; `logos/`
- UI rules: tokens via `light-dark()` in `css/tokens.css`, status always icon + text (never color alone), no build step, no CDN
- `k8s/kind/cluster.yaml` 1 control-plane + 2 workers, host port 8888 to NodePort 30080
- `k8s/` namespace, rbac, deployment, service. The ConfigMap is generated from `app/catalog.yaml` by `make config`
- `k8s/basics/` `pod.yaml` is applied live in the talk. `deployment.yaml` is a read-only teaching copy. `make deploy` applies neither
- `scripts/preflight.sh` checks Docker, kind, kubectl, memory, port 8888 and internet. `scripts/install-linux.sh` installs them on a fresh Linux box
- `RUNBOOK.md` the 60 minute talk track
- `tests/` pytest for the SSRF guard, rate limiter, catalog and pod/event shaping

## Commands
- `make preflight` then `make up` bring everything up. `up` = cluster + deploy, and kind pulls `trainwithshubham/pulsecheck` from Docker Hub
- `make dev` = cluster + build + load + deploy, for working on the app without Docker Hub
- `make push` builds amd64 and arm64 and pushes `VERSION` and `latest`. Always multi-arch: this Mac is arm64 and Killercoda is amd64
- Make is for setup only. The talk teaches raw `kubectl`, so keep demo targets out of the Makefile
- `make deploy` sets the default namespace to `pulsecheck`, so commands skip `-n`
- `make test`, `make run` local test and run
- `make clean` delete the cluster

## Pods panel
- `app/services/kube.py` talks to the Kubernetes API with the pod's ServiceAccount; `pods.py` shapes pods and events; `routes/pods.py` exposes `GET /api/pods` and `DELETE /api/pods/{name}`
- Delete only works on pods labelled `app=pulsecheck` and is gated by `CHAOS_ENABLED` (off by default, set to `"true"` in `k8s/deployment.yaml`)
- `k8s/rbac.yaml` grants only: get/list/delete pods, list events, get deployments, in the `pulsecheck` namespace
- Outside a cluster `/api/pods` returns 503 and the UI hides the pods tab
- `preStop: sleep 3` keeps a deleted pod visibly Terminating and drains traffic

## Rules
- No code comments
- Small single-purpose files, no unnecessary abstractions
- App stays stateless: no history or sessions on the server
- Never weaken `app/services/guard.py`; custom URL checks must stay SSRF-safe
- Never widen `k8s/rbac.yaml` beyond the pulsecheck namespace
- Keep `whenUnsatisfiable: DoNotSchedule` with `maxSurge: 0`. Soft spread stacks all pods on one node
- `make cluster` must wait for all nodes Ready, or the spread rule only sees one worker
- Runbook and README use plain English, no dashes, no filler
- Teach three words first: Pod, Deployment, Service. Name ReplicaSet, Scheduler and Kubelet only at the events feed
- Manifests use the Docker Hub image name. Change it with `IMAGE=` and the three `image:` lines
- Footer credit stays subtle: transparent `app/static/tws.png`, muted at rest, color and tooltip on hover and focus. Hover styles live only inside `@media (hover: hover)` so one tap works on phones
- Version comes from the image build arg `APP_VERSION`, not from manifests
- Cluster must fit a t3.medium (2 vCPU, 4 GB)
