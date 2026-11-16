# Makefile
COMPOSE      := docker compose -p nailsalon_dev -f docker-compose.yml
COMPOSE_TEST := docker compose -p nailsalon_test -f docker-compose.test.yml

.PHONY: help up down nuke psql migrate seed dev-setup \
        test test-build build-test-image

help:            ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-15s %s\n", $$1, $$2}'

up:              ## Start the dev database (detached)
	$(COMPOSE) up -d db

down:            ## Stop and remove the dev stack (keep data)
	$(COMPOSE) down

nuke:            ## Stop and remove the dev stack AND its data volume
	$(COMPOSE) down -v --remove-orphans

psql:            ## Open a psql shell on the dev database
	$(COMPOSE) exec db psql -U myuser -d nailsalon

migrate:         ## Apply pending migrations to the dev database (via dbmate)
	$(COMPOSE) run --rm migrate

seed:            ## Apply seeds/baseline.sql to the dev database
	$(COMPOSE) exec -T db psql -v ON_ERROR_STOP=1 --single-transaction \
	  -U myuser -d nailsalon -f /seeds/baseline.sql

dev-setup: up migrate seed   ## One-shot dev bootstrap: start db, migrate, seed

build-test-image: ## Build the pgTAP-enabled test image standalone
	docker build -f docker/postgres-test.Dockerfile -t nailsalon-postgres-test:17.11 .

test-build:      ## Build only (no run) — useful for warming the build cache
	$(COMPOSE_TEST) build

test:            ## Run the full test suite from a clean stack (CI target)
	-$(COMPOSE_TEST) down --remove-orphans
	-$(COMPOSE_TEST) rm -f
	$(COMPOSE_TEST) up \
	  --build \
	  --force-recreate \
	  --always-recreate-deps \
	  --abort-on-container-exit \
	  --exit-code-from tests
	-$(COMPOSE_TEST) down --remove-orphans