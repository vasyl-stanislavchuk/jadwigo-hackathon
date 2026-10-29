# Thin on purpose: every target calls turbo, bun, md or Postgres.app's tools. The gate is `make check`.
# .env.local (from .env.example) is read here, so check-all's integration tests see DATABASE_URL.
# A variable already in the environment wins over .env.local's (dl-5ssh.43): an included assignment
# would otherwise override it, so DATABASE_URL=… make migrate reset the database .env.local names.
ifneq (,$(wildcard .env.local))
ENV_LOCAL_KEPT := $(foreach v,$(shell sed -n 's/^\([A-Za-z_][A-Za-z0-9_]*\)=.*/\1/p' .env.local),$(if $(filter environment,$(origin $(v))),$(v)))
$(foreach v,$(ENV_LOCAL_KEPT),$(eval ENV_LOCAL_KEPT_$(v) := $$(value $(v))))
include .env.local
$(foreach v,$(ENV_LOCAL_KEPT),$(eval $(v) := $$(ENV_LOCAL_KEPT_$(v))))
export
endif
# The tools mise.toml pins (gitleaks for the fence test, terraform) on PATH even in a shell that never
# activated mise, such as the Stop hook's. Without mise, PATH is left as it is.
MISE_BIN_PATHS := $(shell command -v mise >/dev/null 2>&1 && mise bin-paths 2>/dev/null | tr '\n' ':')
export PATH := $(MISE_BIN_PATHS)$(PATH)
# pg_prove for `make pgtap`, when cpanm installed it into ~/perl5 (local::lib) rather than system Perl.
ifneq (,$(wildcard $(HOME)/perl5/bin/pg_prove))
export PATH := $(HOME)/perl5/bin:$(PATH)
export PERL5LIB := $(HOME)/perl5/lib/perl5$(if $(PERL5LIB),:$(PERL5LIB))
endif
.PHONY: check check-all dev db migrate pgtap db-reset db-seed api-dev api-bundle api-invoke db-push db-role skills drops

## check: lint, typecheck and test what changed since main (turbo --affected), uv's pytest
## included, then the repo-wide checks turbo cannot scope: knip, dependency-cruiser, no-bank, worklog,
## drops, research and workflows
check:
	bunx turbo run lint typecheck test --affected
	bun run lint:repo

## check-all: the same on every package, plus the migrations, the pgTAP tests and the integration
## tests (*.int.test.ts) against the DATABASE_URL in .env.local; run `make db` once first
check-all:
	@test -n "$$DATABASE_URL" || { echo "check-all: DATABASE_URL is unset. Run: cp .env.example .env.local && make db"; exit 1; }
	$(MAKE) migrate pgtap
	bunx turbo run lint typecheck test test:int
	bun run lint:repo

## dev: every app's dev server (ports from md's environment, tools/src/ports.ts)
dev:
	bunx turbo run dev

## skills: link the product AI workflows (workflows/jadwigo-*) into .claude/skills and .agents/skills,
## and the dev and marketing commands (.agents/skills/dev-*, mk-*) into .claude/skills. The links are committed;
## tools/src/check-workflows.ts checks them
skills:
	mkdir -p .claude/skills .agents/skills
	for d in workflows/jadwigo-*/; do [ -d "$$d" ] || continue; n=$$(basename "$$d"); ln -sfn "../../workflows/$$n" ".claude/skills/$$n"; ln -sfn "../../workflows/$$n" ".agents/skills/$$n"; done
	for d in .agents/skills/dev-*/ .agents/skills/mk-*/; do [ -d "$$d" ] || continue; n=$$(basename "$$d"); ln -sfn "../../.agents/skills/$$n" ".claude/skills/$$n"; done

## db: the two local databases on Postgres.app, jadwigo (dev) and jadwigo_test (integration tests).
## Idempotent; it only ever names jadwigo* databases. Shared by every worktree on this machine.
## PGPORT (5433 in .env.example) picks Postgres.app's 17 server, prod's major version.
db:
	for d in jadwigo jadwigo_test; do psql -lqt | cut -d'|' -f1 | grep -qw "$$d" || createdb "$$d"; done
	psql -lqt | cut -d'|' -f1 | grep -E '^ *jadwigo(_test)? *$$'

## migrate: reset the database DATABASE_URL names, then apply the Supabase shim and every migration
## in order, on plain Postgres with no Docker. It only ever resets a jadwigo* database.
migrate:
	@test -n "$$DATABASE_URL" || { echo "migrate: DATABASE_URL is unset. Run: cp .env.example .env.local && make db"; exit 1; }
	@case "$${DATABASE_URL##*/}" in jadwigo*) ;; *) echo "migrate: resets only a jadwigo* database, not $${DATABASE_URL##*/}"; exit 1;; esac
	psql "$(DATABASE_URL)" -q -v ON_ERROR_STOP=1 -c 'drop schema if exists public, app, auth cascade' -c 'create schema public'
	psql "$(DATABASE_URL)" -q -v ON_ERROR_STOP=1 -f supabase/tests/shim.sql
	for f in supabase/migrations/*.sql; do echo "$$f"; psql "$(DATABASE_URL)" -q -v ON_ERROR_STOP=1 -1 -f "$$f" || exit 1; done

## pgtap: the pgTAP tests in supabase/tests on the database `make migrate` built. Each test runs in
## a transaction it rolls back. Needs pg_prove (cpanm TAP::Parser::SourceHandler::pgTAP)
pgtap:
	psql "$(DATABASE_URL)" -q -v ON_ERROR_STOP=1 -c 'create extension if not exists pgtap'
	pg_prove --dbname "$(DATABASE_URL)" supabase/tests/*.test.sql

# The Supabase projects (decision 2026-10-27-jadwigo-runs-on-a-prod-and-a-dev-supabase-project-a-native-local),
# reached through the Supabase CLI mise.toml pins. Secrets live outside every checkout, in
# ~/.config/jadwigo/supabase.env (mode 600; SUPABASE_SECRETS names another file): SUPABASE_ACCESS_TOKEN,
# SUPABASE_DB_PASSWORD_DEV|PROD (postgres) and JADWIGO_API_DB_PASSWORD_DEV|PROD (jadwigo_api). Only these
# targets read it, inside their own shell, so no other target or test sees a secret. A value missing
# there comes from the macOS keychain: supabase-access-token, supabase-db-password-<env>,
# jadwigo-api-db-password-<env>. Never echoed. The steps are docs/runbooks/migrations.md.
SUPABASE_SECRETS ?= $(HOME)/.config/jadwigo/supabase.env
SUPABASE_REF_dev := jweuvslwntdimuwcvlzq
SUPABASE_REF_prod := xhzkmpainwzrfktxffjv
SUPABASE_REF := $(SUPABASE_REF_$(ENV))
ENV_UPPER = $(subst dev,DEV,$(subst prod,PROD,$(ENV)))
# Loads the secrets file, then links ENV's project with both secrets in the environment. Each recipe
# line using it is one shell.
SUPABASE_LINK = case "$(ENV)" in dev|prod) ;; *) echo "$@: ENV=dev or ENV=prod"; exit 1;; esac; \
	if [ -f "$(SUPABASE_SECRETS)" ]; then \
	  [ "$$(stat -f %Lp "$(SUPABASE_SECRETS)")" = 600 ] || { echo "$@: run chmod 600 $(SUPABASE_SECRETS) first"; exit 1; }; \
	  set -a; . "$(SUPABASE_SECRETS)"; set +a; \
	fi; \
	SUPABASE_ACCESS_TOKEN=$${SUPABASE_ACCESS_TOKEN:-$$(security find-generic-password -s supabase-access-token -w 2>/dev/null)}; \
	test -n "$$SUPABASE_ACCESS_TOKEN" || { echo "$@: set SUPABASE_ACCESS_TOKEN in $(SUPABASE_SECRETS), or add the keychain item supabase-access-token"; exit 1; }; \
	SUPABASE_DB_PASSWORD=$${SUPABASE_DB_PASSWORD_$(ENV_UPPER):-$$(security find-generic-password -s supabase-db-password-$(ENV) -w 2>/dev/null)}; \
	test -n "$$SUPABASE_DB_PASSWORD" || { echo "$@: set SUPABASE_DB_PASSWORD_$(ENV_UPPER) (jadwigo-$(ENV)'s postgres password) in $(SUPABASE_SECRETS), or add the keychain item supabase-db-password-$(ENV)"; exit 1; }; \
	export SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD; \
	supabase link --project-ref $(SUPABASE_REF) >/dev/null || exit 1
# Agents never touch prod (dl-e8ov.2.34). ENV=prod runs only at a terminal (stdin a tty) and only
# once someone types prod at the prompt, before anything links. CONFIRM never answers for prod,
# typed on the command line or exported. This gate stops a plain agent shell, not a determined one:
# a pty wrapper (script, expect, python's pty) gives it a terminal and can type prod. In Claude Code
# .claude/hooks/guard.ts denies that, and clearing CLAUDECODE (dl-5ssh.45); a Codex shell has no guard.
PROD_GATE = if [ "$(ENV)" = prod ]; then \
	  if [ -n "$$CLAUDECODE" ] || [ ! -t 0 ]; then echo "$@ ENV=prod: run it from your own terminal, where it asks you to type prod"; exit 1; fi; \
	  printf '%s on jadwigo-prod? Type prod to go on: ' "$@"; read answer; \
	  if [ "$$answer" != prod ]; then echo "$@: nothing done on jadwigo-prod"; exit 1; fi; \
	fi

# jadwigo_api's session pooler URL (port 5432) in url, from the pooler-url supabase link wrote, refused
# unless it names ENV's project.
API_SESSION_URL = test -s supabase/.temp/pooler-url || { echo "$@: supabase link wrote no supabase/.temp/pooler-url"; exit 1; }; \
	url=$$(sed 's/:6543\//:5432\//; s|://postgres\.|://jadwigo_api.|' supabase/.temp/pooler-url); \
	case "$$url" in *://jadwigo_api.$(SUPABASE_REF)@*:5432/*) ;; *) echo "$@: supabase/.temp/pooler-url is not postgres.$(SUPABASE_REF)@<pooler>:6543 (jadwigo-$(ENV))"; exit 1;; esac
# One login as jadwigo_api at url with API_PASSWORD, under env -i; exits 0 when it logs in.
API_LOGIN = env -i PATH="$$PATH" HOME="$$HOME" PGCONNECT_TIMEOUT=10 PGPASSWORD="$$API_PASSWORD" psql "$$url" -qXAt -c 'select 1'
# After db-role sets a new password, the Supabase pooler refuses it for a few minutes (28P01,
# dl-5ssh.58). db-seed retries that refusal every LOGIN_STEP seconds for up to LOGIN_WAIT.
LOGIN_WAIT ?= 120
LOGIN_STEP ?= 10

## db-reset: rebuild the local jadwigo database from nothing (the shim, every migration, the seed).
## ENV=dev resets jadwigo-dev instead (supabase db reset --linked, which asks first). Never prod.
db-reset:
ifeq ($(ENV),)
	$(MAKE) migrate db-seed DATABASE_URL=postgresql://localhost:$${PGPORT:-5433}/jadwigo
else
	@if [ "$(ENV)" != dev ]; then echo "db-reset: only ENV=dev; prod is never reset"; exit 1; fi
	@$(SUPABASE_LINK); supabase db reset --linked
endif

## db-seed: the featured lessons, by lesson import's seed script (dl-e8ov.2.32.5), into DATABASE_URL.
## ENV=dev|prod seeds that project instead, as jadwigo_api (the Store sets that role, and postgres
## on Supabase is not a member of it; run db-role first) through its session pooler (port 5432; the
## transaction pooler on 6543 cannot hold the seed's transactions), the password in PGPASSWORD only.
## ENV=prod runs only from your own terminal and asks you to type prod before it links. The seed runs
## under env -i: it sees PATH, HOME, USER, TMPDIR, PGPASSWORD and DATABASE_URL, no other secret. Safe to rerun:
## the same content publishes nothing new. It first waits up to LOGIN_WAIT seconds while the pooler
## still refuses a password db-role just set.
db-seed:
ifeq ($(ENV),)
	bun run --cwd packages/lesson-import seed
else
	@$(PROD_GATE)
	@$(SUPABASE_LINK); \
	API_PASSWORD=$${JADWIGO_API_DB_PASSWORD_$(ENV_UPPER):-$$(security find-generic-password -s jadwigo-api-db-password-$(ENV) -w 2>/dev/null)}; \
	test -n "$$API_PASSWORD" || { echo "db-seed: set JADWIGO_API_DB_PASSWORD_$(ENV_UPPER) in $(SUPABASE_SECRETS), or add the keychain item jadwigo-api-db-password-$(ENV)"; exit 1; }; \
	$(API_SESSION_URL); \
	waited=0; \
	until err=$$($(API_LOGIN) 2>&1 >/dev/null); do \
	  case "$$err" in *"password authentication failed"*) ;; *) printf '%s\n' "$$err"; exit 1;; esac; \
	  if [ "$$waited" -ge $(LOGIN_WAIT) ]; then echo "db-seed: jadwigo-$(ENV) still refuses jadwigo_api's password after $(LOGIN_WAIT)s (28P01). Check JADWIGO_API_DB_PASSWORD_$(ENV_UPPER), or run make db-role ENV=$(ENV)"; exit 1; fi; \
	  echo "db-seed: jadwigo-$(ENV) refuses jadwigo_api's password (28P01). Its pooler holds the old one for a few minutes after db-role sets it; retrying in $(LOGIN_STEP)s ($$waited of $(LOGIN_WAIT)s)"; \
	  sleep $(LOGIN_STEP); waited=$$((waited + $(LOGIN_STEP))); \
	done; \
	env -i PATH="$$PATH" HOME="$$HOME" USER="$$USER" TMPDIR="$${TMPDIR:-/tmp}" PGPASSWORD="$$API_PASSWORD" DATABASE_URL="$$url" \
	  bun run --cwd packages/lesson-import seed
endif

## api-dev ENV=dev: serve the local apps/api on jadwigo-dev, as the Lambda will reach a project: as
## jadwigo_api through its transaction pooler (port 6543), the password in PGPASSWORD only (run
## db-role first). The server runs under env -i: it sees PATH, HOME, USER, TMPDIR, PORT, PGPASSWORD
## and DATABASE_URL, no other secret. Only dev: prod's api runs in Lambda, never from a laptop.
api-dev:
	@if [ "$(ENV)" != dev ]; then echo "api-dev: only ENV=dev; prod's api runs in Lambda"; exit 1; fi
	@$(SUPABASE_LINK); \
	API_PASSWORD=$${JADWIGO_API_DB_PASSWORD_$(ENV_UPPER):-$$(security find-generic-password -s jadwigo-api-db-password-$(ENV) -w 2>/dev/null)}; \
	test -n "$$API_PASSWORD" || { echo "api-dev: set JADWIGO_API_DB_PASSWORD_$(ENV_UPPER) in $(SUPABASE_SECRETS), or add the keychain item jadwigo-api-db-password-$(ENV)"; exit 1; }; \
	test -s supabase/.temp/pooler-url || { echo "api-dev: supabase link wrote no supabase/.temp/pooler-url"; exit 1; }; \
	url=$$(sed 's/:5432\//:6543\//; s|://postgres\.|://jadwigo_api.|' supabase/.temp/pooler-url); \
	case "$$url" in *://jadwigo_api.*:6543/*) ;; *) echo "api-dev: supabase/.temp/pooler-url is not postgres.<ref>@<pooler>:<port>"; exit 1;; esac; \
	env -i PATH="$$PATH" HOME="$$HOME" USER="$$USER" TMPDIR="$${TMPDIR:-/tmp}" PORT="$${PORT:-8787}" PGPASSWORD="$$API_PASSWORD" DATABASE_URL="$$url" \
	  bun run --cwd apps/api dev

## db-push ENV=dev|prod: show the migrations ENV's project lacks (a dry run), then push them only when
## you type the ENV's name. For dev only, CONFIRM=dev on the command line answers where there is no
## keyboard (`!` in Claude Code); prod runs only from your own terminal (PROD_GATE asks first).
## DRY_RUN=1 stops after the dry run. One-way: a pushed migration stays.
db-push:
	@$(PROD_GATE)
	@$(SUPABASE_LINK); \
	supabase db push --linked --dry-run || exit 1; \
	if [ -n "$(DRY_RUN)" ]; then exit 0; fi; \
	answer=; if [ "$(ENV)" = dev ] && [ "$(origin CONFIRM)" = "command line" ]; then answer="$(CONFIRM)"; fi; \
	if [ -z "$$answer" ]; then printf 'Push these to jadwigo-%s? Type %s to push: ' "$(ENV)" "$(ENV)"; read answer; fi; \
	if [ "$$answer" != "$(ENV)" ]; then echo "db-push: nothing pushed"; exit 1; fi; \
	supabase db push --linked

## db-role ENV=dev|prod: give jadwigo_api (made by the migration, nologin) a login and its password
## (JADWIGO_API_DB_PASSWORD_<ENV>, or the keychain item jadwigo-api-db-password-<env>). Run it after the first db-push, and after a rotation.
## When jadwigo_api already logs in with that password it changes nothing, so rerunning the setup
## does not reset the password the pooler holds.
## ENV=prod runs only from your own terminal and asks you to type prod first.
db-role:
	@$(PROD_GATE)
	@$(SUPABASE_LINK); \
	API_PASSWORD=$${JADWIGO_API_DB_PASSWORD_$(ENV_UPPER):-$$(security find-generic-password -s jadwigo-api-db-password-$(ENV) -w 2>/dev/null)}; \
	test -n "$$API_PASSWORD" || { echo "db-role: set JADWIGO_API_DB_PASSWORD_$(ENV_UPPER) in $(SUPABASE_SECRETS), or add the keychain item jadwigo-api-db-password-$(ENV)"; exit 1; }; \
	export API_PASSWORD; \
	$(API_SESSION_URL); \
	if $(API_LOGIN) >/dev/null 2>&1; then echo "db-role: jadwigo_api already logs in on jadwigo-$(ENV) with this password; nothing changed"; exit 0; fi; \
	printf '%s\n' '\set pw `printenv API_PASSWORD`' "alter role jadwigo_api login password :'pw';" \
	  | PGPASSWORD=$$SUPABASE_DB_PASSWORD psql "$$(cat supabase/.temp/pooler-url)" -q -v ON_ERROR_STOP=1 \
	  && echo "db-role: jadwigo_api can log in on jadwigo-$(ENV). The pooler may refuse the new password for a few minutes; db-seed waits for it"

## api-bundle: apps/api's Lambda entry (src/index.ts, `index.handler`) as one ESM file for Node 24,
## apps/api/dist/index.mjs, which `make -C infra api-deploy` zips. bun's bundler, with a require()
## for pg's CommonJS. The AWS SDK is bundled, pinned, rather than taken from the runtime.
API_BUNDLE := apps/api/dist/index.mjs
api-bundle:
	rm -f $(API_BUNDLE)
	bun build apps/api/src/index.ts --target=node --format=esm --minify \
	  --banner='import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' \
	  --outfile $(API_BUNDLE)
	@printf 'api-bundle: %s, %s bytes\n' $(API_BUNDLE) "$$(wc -c < $(API_BUNDLE) | tr -d ' ')"

## api-invoke: the bundle, invoked in a fresh Node with an API Gateway v2 event for GET /api/health;
## prints the status and the cold start. No AWS: DATABASE_URL names the local database, and health
## never reaches it.
api-invoke: api-bundle
	DATABASE_URL=$${DATABASE_URL:-postgresql://localhost:$${PGPORT:-5433}/jadwigo} bun run --cwd apps/api invoke

## drops: md drops check on every drop under docs/drops/
drops:
	for d in docs/drops/*/; do [ -d "$$d" ] && md drops check "$$d"; done; true
