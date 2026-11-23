#!/usr/bin/env bash
fail=0

ok() { printf "ok    %s\n" "$1"; }
bad() { printf "FAIL  %s\n" "$1"; fail=1; }
warn() { printf "warn  %s\n" "$1"; }

if command -v docker >/dev/null && docker info >/dev/null 2>&1; then
  ok "docker is running"
  memory=$(docker info --format '{{.MemTotal}}')
  if [ "$memory" -ge 3500000000 ]; then ok "docker has $((memory / 1000000000)) GB of memory"; else bad "docker needs at least 4 GB of memory"; fi
  if [ -n "$(docker images -q kindest/node)" ]; then ok "kind node image is cached"; else warn "kind node image not cached, first cluster downloads about 1 GB"; fi
else
  bad "docker is not running"
fi

if command -v kind >/dev/null; then ok "kind $(kind version | cut -d' ' -f2)"; else bad "kind is missing"; fi
if command -v kubectl >/dev/null; then ok "kubectl is installed"; else bad "kubectl is missing"; fi

if command -v kind >/dev/null && kind get clusters 2>/dev/null | grep -qx pulsecheck; then
  ok "cluster pulsecheck already exists"
elif (exec 3<>/dev/tcp/127.0.0.1/8888) 2>/dev/null; then
  bad "port 8888 is busy"
else
  ok "port 8888 is free"
fi

if curl -sf -m 5 -o /dev/null https://www.githubstatus.com; then ok "internet works"; else warn "no internet, service cards will show down"; fi

if [ "$(curl -s -m 5 -o /dev/null -w '%{http_code}' https://registry-1.docker.io/v2/)" != "000" ]; then ok "docker hub is reachable"; else bad "docker hub is not reachable, make up cannot pull the image"; fi

exit $fail
