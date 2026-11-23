CLUSTER := pulsecheck
NS := pulsecheck
IMAGE ?= trainwithshubham/pulsecheck
VERSION ?= 1.1.0

.PHONY: preflight up dev cluster build push load config deploy test run clean

preflight:
	bash scripts/preflight.sh

up: cluster deploy

dev: cluster build load deploy

cluster:
	kind create cluster --config k8s/kind/cluster.yaml
	kubectl wait --for=condition=Ready node --all --timeout=180s

build:
	docker build --build-arg APP_VERSION=$(VERSION) -t $(IMAGE):$(VERSION) .

push:
	docker buildx build --platform linux/amd64,linux/arm64 --build-arg APP_VERSION=$(VERSION) -t $(IMAGE):$(VERSION) -t $(IMAGE):latest --push .

load:
	kind load docker-image $(IMAGE):$(VERSION) --name $(CLUSTER)

config:
	kubectl -n $(NS) create configmap pulsecheck-catalog --from-file=app/catalog.yaml --dry-run=client -o yaml | kubectl apply -f -

deploy:
	kubectl apply -f k8s/namespace.yaml
	$(MAKE) config
	kubectl apply -f k8s/rbac.yaml -f k8s/deployment.yaml -f k8s/service.yaml
	kubectl config set-context --current --namespace=$(NS)
	kubectl rollout status deploy/pulsecheck

test:
	python3 -m pytest tests

run:
	python3 -m uvicorn app.main:app --port 8888

clean:
	kind delete cluster --name $(CLUSTER)
