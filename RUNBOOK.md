# Runbook

One hour. Pods, Deployments, Services.

## Before the session

Do this the day before and again 30 minutes before.

```
make preflight
make up
kubectl get pods
```

You should see 3 pods. Open http://localhost:8888.

Open two terminals. Keep this running in the second one:

```
kubectl get pods -w
```

Bring a phone hotspot. The service cards need internet.

## Setup for attendees

Most people only watch. Setup is homework. The README says what to install.

To prepare a fresh Linux machine, run `bash scripts/install-linux.sh`. Log out, log back in, then run `make preflight up`. Try this once a day early.

## Plan

| Time | Topic |
|---|---|
| 0 to 7 | Why Kubernetes |
| 7 to 12 | The cluster |
| 12 to 20 | Pods |
| 20 to 35 | Deployments |
| 35 to 47 | Services |
| 47 to 55 | Bonus, skip if late |
| 55 to 60 | What is next, questions |

## 0 to 7: Why Kubernetes

A container runs one app. A real app needs many copies. Containers crash. You ship new versions. The copies must find each other.

Kubernetes does this work. You say what you want. It makes it true and keeps it true.

Open the app once so people see what we will run.

## 7 to 12: The cluster

The control plane is the brain. The nodes are the workers. Pods run on the nodes.

```
kubectl get nodes
```

One control plane and two workers. They are 3 Docker containers on this machine.

## 12 to 20: Pods

A pod is one or more containers that run together. It is the smallest thing you can run.

```
cat k8s/basics/pod.yaml
kubectl apply -f k8s/basics/pod.yaml
kubectl get pods
kubectl delete pod pulsecheck-basic
kubectl get pods
```

It is gone. Nobody brings it back. Ask the room: what if this was production?

## 20 to 35: Deployments

A Deployment says: keep 3 copies running.

```
cat k8s/basics/deployment.yaml
```

Point at three things: `replicas: 3`, the matching `app` label, and the `image`. The running app uses a longer file, `k8s/deployment.yaml`. It adds health checks and more. We skip those today.

```
kubectl get deployments
kubectl get pods -o wide
```

Open http://localhost:8888 and click the Pods tab on the right edge. Click the trash icon on a pod twice.

Watch the second terminal. The pod goes Terminating. A new one appears at 0/1, then 1/1. The dots in the panel refill.

You can do the same from the terminal. Copy a pod name from `kubectl get pods`:

```
kubectl delete pod <name>
```

Now open "What Kubernetes did" in the panel. Three helpers show up here, so name them now.

- ReplicaSet counts the pods and makes a new one.
- Scheduler picks a node.
- Kubelet starts the container.

## 35 to 47: Services

Every new pod gets a new IP. A Service gives one stable address and sends traffic to the pods behind it.

```
kubectl get svc
while true; do curl -s localhost:8888/api/pod; echo; sleep 0.5; done
```

The pod name changes from line to line. In the browser the pod chip at the bottom changes color. Press Ctrl+C when done.

Run the loop again and delete a pod. Watch the names.

## 47 to 55: Bonus

Skip this if you are late.

Crash or delete. Click "Crash pod" twice. This kills the app inside the pod. The pod stays and Kubernetes restarts the container.

```
kubectl get pods
```

RESTARTS is now 1. Delete gives you a new pod. Crash restarts the same pod.

Rolling update:

```
make build load VERSION=1.3.1
kubectl set image deploy/pulsecheck pulsecheck=trainwithshubham/pulsecheck:1.3.1
kubectl rollout status deploy/pulsecheck
kubectl rollout undo deploy/pulsecheck
```

The pods change one at a time. The undo command prints a long warning. It is safe to ignore.

## 55 to 60: What is next

We skipped ConfigMaps, health checks, Ingress and Helm. Say that these are next.

Homework: clone the repo, run `make preflight up`, and break things.

## If something breaks

- Cards show down: there is no internet. Carry on with the Pods tab.
- A pod is stuck Pending: run `kubectl describe pod <name>` and read the Events at the bottom.
- The page will not load: run `kubectl get pods`, then `kubectl rollout restart deploy/pulsecheck`.
- Port 8888 is busy: change `hostPort` in `k8s/kind/cluster.yaml` and the port in the Makefile.
- Start over: `make clean up`. It takes about 45 seconds.

## After

```
make clean
```
