DOCKER_DIR := zarf/docker
COMPOSE   := docker compose -f $(DOCKER_DIR)/docker-compose.yml

APPS      := host explore decide checkout
PORTS     := 4200 4201 4202 4203

# ── Help ──────────────────────────────────────────────────────────────────────

.PHONY: help
help: ## Print this help
	@grep -Eh '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-22s\033[0m %s\n", $$1, $$2}'

# ── Docker Compose lifecycle ──────────────────────────────────────────────────

.PHONY: up
up: ## Start all containers in background
	$(COMPOSE) up -d

.PHONY: down
down: ## Stop and remove all containers
	$(COMPOSE) down

.PHONY: rebuild
rebuild: ## Rebuild all images and start containers
	$(COMPOSE) up -d --build

.PHONY: restart
restart: down up ## Restart all containers

.PHONY: clean
clean: ## Stop containers and remove volumes, orphans, and images
	$(COMPOSE) down -v --remove-orphans

.PHONY: ps
ps: ## Show running containers
	$(COMPOSE) ps

.PHONY: logs
logs: ## Tail logs from all services
	$(COMPOSE) logs -f

# ── Per-service logs ──────────────────────────────────────────────────────────

.PHONY: logs-host logs-explore logs-decide logs-checkout logs-cdn
logs-host:    ; $(COMPOSE) logs -f host
logs-explore: ; $(COMPOSE) logs -f explore
logs-decide:  ; $(COMPOSE) logs -f decide
logs-checkout:; $(COMPOSE) logs -f checkout
logs-cdn:     ; $(COMPOSE) logs -f cdn

# ── Per-service shell ─────────────────────────────────────────────────────────

.PHONY: shell-host shell-explore shell-decide shell-checkout shell-cdn
shell-host:    ; $(COMPOSE) exec host    /bin/sh
shell-explore: ; $(COMPOSE) exec explore /bin/sh
shell-decide:  ; $(COMPOSE) exec decide  /bin/sh
shell-checkout:; $(COMPOSE) exec checkout /bin/sh
shell-cdn:     ; $(COMPOSE) exec cdn     /bin/sh

# ── Docker image builds (individual, via compose) ─────────────────────────────

.PHONY: build build-host build-explore build-decide build-checkout
build: build-host build-explore build-decide build-checkout ## Build all images

build-host:    ; $(COMPOSE) build host
build-explore: ; $(COMPOSE) build explore
build-decide:  ; $(COMPOSE) build decide
build-checkout:; $(COMPOSE) build checkout

# ── Local (non-Docker) development ────────────────────────────────────────────

.PHONY: dev
dev: ## Start all apps locally via pnpm (no Docker)
	pnpm start:all

.PHONY: test
test: ## Run tests for all projects
	for app in $(APPS); do \
		pnpm ng test $$app --watch=false || exit 1; \
	done

.PHONY: install
install: ## Install dependencies
	pnpm install

# ── Utility ───────────────────────────────────────────────────────────────────

.PHONY: prune
prune: ## Stop everything and prune Docker system (images, cache)
	$(COMPOSE) down -v --remove-orphans
	docker system prune -f
