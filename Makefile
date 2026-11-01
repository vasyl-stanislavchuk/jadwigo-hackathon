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
.PHONY: check check-all dev db pgmq migrate pgtap db-reset db-seed lesson-import api-dev api-bundle api-invoke db-push db-role release skills drops icons builder runner-bundle db-runner-role step-probe step-probe-local engine-smoke

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

## The one local database for dev and imports: `jadwigo` on Postgres.app (PGPORT, 5433 in
## .env.example). `.env.local`'s DATABASE_URL names `jadwigo_test`, which the integration tests own
## and re-seed, so `make dev`, `make db-reset` and `make lesson-import` never read it (dl-5ssh.112).
## LOCAL_DB_GATE refuses anything but a localhost jadwigo* database, so an override cannot point
## a dev server or an import at a remote.
LOCAL_DATABASE_URL ?= postgresql://localhost:$(or $(PGPORT),5433)/jadwigo
LOCAL_DB_GATE = printf '%s\n' "$(LOCAL_DATABASE_URL)" | grep -Eq '^postgres(ql)?://([A-Za-z0-9._~%+=:-]+@)?(localhost|127\.0\.0\.1)(:[0-9]+)?/jadwigo[A-Za-z0-9_]*$$' || { echo "$@: LOCAL_DATABASE_URL is not postgresql://[user[:password]@]localhost[:port]/jadwigo…"; exit 1; }

## dev: every app's dev server, on md's ports (tools/src/ports.ts) and the local jadwigo database.
## Turbo's strict env mode passes a task only the variables turbo.json names, which would drop
## WEB_PORT, API_PORT and the worktree's name, so dev runs loose: it is never cached, so nothing
## hashes its environment (dl-5ssh.98).
dev:
	@$(LOCAL_DB_GATE)
	DATABASE_URL=$(LOCAL_DATABASE_URL) bunx turbo run dev --env-mode=loose

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

## pgmq: install pgmq into the extension directory of the Postgres DATABASE_URL names, as Supabase
## has it, so a migration can `create extension pgmq` (dl-z5ja.4). pgmq is pure SQL, nothing
## compiled: the control file and one script. Pinned to the version Supabase's Postgres 17 image
## ships (supabase/postgres nix/ext/versions.json), checked by sha256. Once per machine; CI runs it
## with SUDO=sudo.
PGMQ_VERSION := 1.5.1
PGMQ_SHA256 := a435fec34a8d3b3e6ace928e24889b5549a83369b1e479ab6747ac076246085c
pgmq:
	@test -n "$$DATABASE_URL" || { echo "pgmq: DATABASE_URL is unset. Run: cp .env.example .env.local && make db"; exit 1; }
	@dir="$$(psql "$(DATABASE_URL)" -Atc "select setting from pg_config where name = 'SHAREDIR'")/extension"; \
	if [ -f "$$dir/pgmq--$(PGMQ_VERSION).sql" ]; then echo "pgmq $(PGMQ_VERSION) is already in $$dir"; exit 0; fi; \
	tmp="$$(mktemp -d)"; trap 'rm -rf "$$tmp"' EXIT; src="$$tmp/pgmq-$(PGMQ_VERSION)/pgmq-extension"; \
	curl -fsSL -o "$$tmp/pgmq.tar.gz" "https://github.com/pgmq/pgmq/archive/refs/tags/v$(PGMQ_VERSION).tar.gz" || exit 1; \
	echo "$(PGMQ_SHA256)  $$tmp/pgmq.tar.gz" | shasum -a 256 -c - >/dev/null || { echo "pgmq: the tarball's sha256 is not $(PGMQ_SHA256)"; exit 1; }; \
	tar -xzf "$$tmp/pgmq.tar.gz" -C "$$tmp" || exit 1; \
	$(SUDO) install -m 644 "$$src/pgmq.control" "$$dir/pgmq.control" && \
	$(SUDO) install -m 644 "$$src/sql/pgmq.sql" "$$dir/pgmq--$(PGMQ_VERSION).sql" && \
	echo "pgmq $(PGMQ_VERSION) installed in $$dir"

## migrate: reset the database DATABASE_URL names, then apply the Supabase shim and every migration
## in order, on plain Postgres with no Docker. It only ever resets a jadwigo* database.
migrate:
	@test -n "$$DATABASE_URL" || { echo "migrate: DATABASE_URL is unset. Run: cp .env.example .env.local && make db"; exit 1; }
	@case "$${DATABASE_URL##*/}" in jadwigo*) ;; *) echo "migrate: resets only a jadwigo* database, not $${DATABASE_URL##*/}"; exit 1;; esac
	psql "$(DATABASE_URL)" -q -v ON_ERROR_STOP=1 -c 'drop extension if exists pgmq cascade' -c 'drop schema if exists public, app, auth, realtime, realtime_join, muse_ledger cascade' -c 'create schema public'
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
# `make release` asks for prod once and then sets JW_RELEASE_CONFIRMED=prod for its steps
# (dl-5ssh.34.67), which skips only the typed word: the terminal and CLAUDECODE checks still run
# first, so it gives an agent's shell nothing. Nothing else sets it, and the guard denies a session that does.
PROD_GATE = if [ "$(ENV)" = prod ]; then \
	  if [ -n "$$CLAUDECODE" ] || [ ! -t 0 ]; then echo "$@ ENV=prod: run it from your own terminal, where it asks you to type prod"; exit 1; fi; \
	  if [ "$${JW_RELEASE_CONFIRMED:-}" = prod ]; then echo "$@ ENV=prod: confirmed once by make release"; else \
	  printf '%s on jadwigo-prod? Type prod to go on: ' "$@"; read answer; \
	  if [ "$$answer" != prod ]; then echo "$@: nothing done on jadwigo-prod"; exit 1; fi; \
	  fi; \
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
# ENV's project as jadwigo_api through its session pooler, for db-seed and lesson-import: links it,
# reads jadwigo_api's password into API_PASSWORD and the URL into url, and waits out the pooler's
# 28P01 for up to LOGIN_WAIT seconds. AS_API then runs a command under env -i with only PATH, HOME,
# USER, TMPDIR, PGPASSWORD and DATABASE_URL, so it sees no other secret.
API_SESSION = $(SUPABASE_LINK); \
	API_PASSWORD=$${JADWIGO_API_DB_PASSWORD_$(ENV_UPPER):-$$(security find-generic-password -s jadwigo-api-db-password-$(ENV) -w 2>/dev/null)}; \
	test -n "$$API_PASSWORD" || { echo "$@: set JADWIGO_API_DB_PASSWORD_$(ENV_UPPER) in $(SUPABASE_SECRETS), or add the keychain item jadwigo-api-db-password-$(ENV)"; exit 1; }; \
	$(API_SESSION_URL); \
	waited=0; \
	until err=$$($(API_LOGIN) 2>&1 >/dev/null); do \
	  case "$$err" in *"password authentication failed"*) ;; *) printf '%s\n' "$$err"; exit 1;; esac; \
	  if [ "$$waited" -ge $(LOGIN_WAIT) ]; then echo "$@: jadwigo-$(ENV) still refuses jadwigo_api's password after $(LOGIN_WAIT)s (28P01). Check JADWIGO_API_DB_PASSWORD_$(ENV_UPPER), or run make db-role ENV=$(ENV)"; exit 1; fi; \
	  echo "$@: jadwigo-$(ENV) refuses jadwigo_api's password (28P01). Its pooler holds the old one for a few minutes after db-role sets it; retrying in $(LOGIN_STEP)s ($$waited of $(LOGIN_WAIT)s)"; \
	  sleep $(LOGIN_STEP); waited=$$((waited + $(LOGIN_STEP))); \
	done
AS_API = env -i PATH="$$PATH" HOME="$$HOME" USER="$$USER" TMPDIR="$${TMPDIR:-/tmp}" PGPASSWORD="$$API_PASSWORD" DATABASE_URL="$$url"

## db-reset: rebuild the local jadwigo database from nothing (the shim, every migration, the seed).
## ENV=dev resets jadwigo-dev instead (supabase db reset --linked, which asks first). Never prod.
db-reset:
ifeq ($(ENV),)
	@$(LOCAL_DB_GATE)
	$(MAKE) migrate db-seed DATABASE_URL=$(LOCAL_DATABASE_URL)
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
	@$(API_SESSION); \
	$(AS_API) bun run --cwd packages/lesson-import seed
endif

## lesson-import FILE=<path> [JSON=1] [FEATURED=1]: one lesson file into the local jadwigo
## database, the one `make dev` serves, printing its /play/<assignment> path (dl-e8ov.5.38.3), or
## with JSON=1 one JSON object (jw's lesson_publish reads it, dl-a38n wave 3); check it first with
## `bun run --cwd packages/lesson-import check <path>`. By default the lesson lands in the drafts
## pod: it plays at its path but never joins the featured list (dl-e8ov.2.59). FEATURED=1 imports
## into the featured pod as an open anyone-assignment instead, so the featured list shows it at once
## (dl-e8ov.2.97). ENV=dev|prod imports into that project instead, as jadwigo_api the way db-seed
## does. ENV=prod runs only from the owner's own terminal and asks them to type prod first
## (PROD_GATE); the guard refuses it to agents. Running ENV=prod FEATURED=1 is the owner's approval
## of a featured lesson (docs/runbooks/lesson-import.md, dl-9t2o.9). Safe to rerun: the same content
## publishes nothing new.
LESSON_IMPORT_FLAGS = $(if $(JSON),--json) $(if $(FEATURED),--featured)
lesson-import:
	@test -n "$(FILE)" || { echo "lesson-import: FILE=<lesson file> is required"; exit 1; }
ifeq ($(ENV),)
	@$(LOCAL_DB_GATE)
	DATABASE_URL=$(LOCAL_DATABASE_URL) bun run --cwd packages/lesson-import import "$(abspath $(FILE))" $(LESSON_IMPORT_FLAGS)
else
	@if [ "$(ENV)" != dev ] && [ "$(ENV)" != prod ]; then echo "lesson-import: ENV is dev or prod"; exit 1; fi
	@$(PROD_GATE)
	@$(API_SESSION); \
	$(AS_API) bun run --cwd packages/lesson-import import "$(abspath $(FILE))" $(LESSON_IMPORT_FLAGS)
endif

## dream LEARNER=<id> [ENV=local]: the dream on demand (decision jadwigo-hackathon 2026-10-30, the
## dream runs on demand), on the database DATABASE_URL names (the environment's, else .env.local's,
## as make migrate reads it), or the local jadwigo database when it is unset; a URL that is not a
## localhost jadwigo* database is refused (dl-e8ov.5.65). apps/api/src/dream.ts works out a report for
## the learner, code's digest with a null narrative, and prints it. The report also lands in
## DREAM_DIR, and the last line says to run /jadwigo-report-write on it. Only ENV=local: this wave
## the dream never runs on jadwigo-dev or prod, and the narrative only on a throwaway learner.
## dream-save LEARNER=<id> FILE=<narrative.json>: the narrative that workflow wrote, checked against
## the digest and saved once, by the same script's --narrative.
.PHONY: dream dream-save
DREAM_DIR ?= $(or $(TMPDIR),/tmp)/jadwigo-dream
DREAM = case "$(LEARNER)" in lrn_*[!0-9a-z]*|lrn_) echo "$@: LEARNER is lrn_ and lowercase letters and digits"; exit 1;; lrn_*) ;; *) echo "$@: LEARNER=<learner id, lrn_…> is required"; exit 1;; esac; \
	case "$(or $(ENV),local)" in local) ;; *) echo "$@: only ENV=local; the dream does not run on jadwigo-$(ENV) in this wave"; exit 1;; esac; \
	db_url="$${DATABASE_URL:-postgresql://localhost:$${PGPORT:-5433}/jadwigo}"; \
	case "$$db_url" in postgres://*|postgresql://*) ;; *) echo "$@: DATABASE_URL is not a postgres:// URL"; exit 1;; esac; \
	case "$$db_url" in *[?\#]*) echo "$@: DATABASE_URL has a query string or a fragment, which can name another host; give a plain URL"; exit 1;; esac; \
	rest="$${db_url\#*://}"; host="$${rest%%/*}"; host="$${host\#\#*@}"; host="$${host%%:*}"; \
	case "$$host" in localhost|127.0.0.1) ;; '') echo "$@: DATABASE_URL names no host, so pg would read PGHOST; name localhost"; exit 1;; *) echo "$@: DATABASE_URL names $$host; the dream runs only on a localhost database"; exit 1;; esac; \
	db="$${rest\#*/}"; db="$${db%%\?*}"; \
	case "$$rest" in */*) ;; *) db=;; esac; \
	case "$$db" in */*) db=;; esac; \
	case "$$db" in jadwigo*) ;; *) echo "$@: DATABASE_URL names database '$$db'; the dream runs only on a jadwigo* database"; exit 1;; esac; \
	printf '%s\n' "$$db_url" | grep -Eq '^postgres(ql)?://([A-Za-z0-9._~%+=:-]+@)?(localhost|127\.0\.0\.1)(:[0-9]+)?/jadwigo[A-Za-z0-9_]*$$' || { echo "$@: DATABASE_URL is not postgresql://[user[:password]@]localhost[:port]/jadwigo…"; exit 1; }; \
	export DATABASE_URL="$$db_url"; echo "$@: on the local database $$db" >&2; \
	test -f apps/api/src/dream.ts || { echo "$@: apps/api/src/dream.ts is not here yet (dl-e8ov.5.44)"; exit 1; }
dream:
	@$(DREAM); \
	mkdir -p "$(DREAM_DIR)"; out="$(DREAM_DIR)/$(LEARNER)-$$(date -u +%Y%m%dT%H%M%SZ).json"; \
	bun apps/api/src/dream.ts "$(LEARNER)" > "$$out" || { rm -f "$$out"; exit 1; }; \
	cat "$$out"; echo; \
	echo "dream: the report is in $$out"; \
	echo "dream: next, in Claude Code, run /jadwigo-report-write on $$out"
dream-save:
	@test -n "$(FILE)" || { echo "dream-save: FILE=<narrative.json> is required"; exit 1; }
	@$(DREAM); \
	bun apps/api/src/dream.ts "$(LEARNER)" --narrative "$(abspath $(FILE))"

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

## release: origin/main to prod, asking once (infra/release.sh, dl-5ssh.34.67). It previews the
## migrations, a saved Terraform plan and prod-status, asks you to type prod, then pushes the
## migrations, checks jadwigo_api's login, seeds, applies the saved plan and deploys the api, the web,
## the site and the docs. It stops before asking when the plan destroys or replaces anything. Your own
## terminal only; the guard denies it from a session, and `make -n release` shows the one command.
release:
	@sh infra/release.sh

## db-push ENV=dev|prod: show the migrations ENV's project lacks (a dry run), then push them only when
## you type the ENV's name. For dev only, CONFIRM=dev on the command line answers where there is no
## keyboard (`!` in Claude Code); prod runs only from your own terminal (PROD_GATE asks first), and
## under `make release` the one prod typed there answers both prompts.
## DRY_RUN=1 stops after the dry run. One-way: a pushed migration stays.
db-push:
	@$(PROD_GATE)
	@$(SUPABASE_LINK); \
	supabase db push --linked --dry-run || exit 1; \
	if [ -n "$(DRY_RUN)" ]; then exit 0; fi; \
	answer=; if [ "$(ENV)" = dev ] && [ "$(origin CONFIRM)" = "command line" ]; then answer="$(CONFIRM)"; fi; \
	if [ "$(ENV)" = prod ] && [ "$${JW_RELEASE_CONFIRMED:-}" = prod ]; then answer=prod; fi; \
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
## `--target=node` pins no Node version: `make api-invoke` checks the Node that runs it instead.
API_BUNDLE := apps/api/dist/index.mjs
# The Lambda's Node major and architecture, read from its Terraform so they are written once.
LAMBDA_TF := infra/terraform/modules/app/api.tf
LAMBDA_NODE := $(shell sed -n 's/.*runtime *= *"nodejs\([0-9]*\)\.x".*/\1/p' $(LAMBDA_TF))
LAMBDA_ARCH := $(shell sed -n 's/.*architectures *= *\["\([a-z0-9_]*\)"\].*/\1/p' $(LAMBDA_TF))
api-bundle:
	rm -f $(API_BUNDLE)
	bun build apps/api/src/index.ts --target=node --format=esm --minify \
	  --banner='import { createRequire } from "node:module"; const require = createRequire(import.meta.url);' \
	  --outfile $(API_BUNDLE)
	@printf 'api-bundle: %s, %s bytes\n' $(API_BUNDLE) "$$(wc -c < $(API_BUNDLE) | tr -d ' ')"

## api-invoke: the bundle, invoked in a fresh Node with an API Gateway v2 event for GET /api/health;
## prints the status and the cold start. No AWS: DATABASE_URL names the local database, and health
## never reaches it. Fails first unless that Node is the Lambda's: Node 24 on arm64, from $(LAMBDA_TF).
api-invoke: api-bundle
	@test -n "$(LAMBDA_NODE)" -a -n "$(LAMBDA_ARCH)" || { echo "api-invoke: no runtime or architectures found in $(LAMBDA_TF)"; exit 1; }
	@# The $$( ) sends this line through sh: macOS make 3.81 runs a line with no shell character
	@# itself and finds `node` on its own PATH, not the one above with mise's bin paths first.
	@v=$$(node -p 'process.versions.node.split(".")[0] + " on " + process.arch'); \
	  test "$$v" = "$(LAMBDA_NODE) on $(LAMBDA_ARCH)" || { echo "api-invoke: the Lambda runs Node $(LAMBDA_NODE) on $(LAMBDA_ARCH) ($(LAMBDA_TF)); this node is $$v"; exit 1; }
	DATABASE_URL=$${DATABASE_URL:-postgresql://localhost:$${PGPORT:-5433}/jadwigo} bun run --cwd apps/api invoke

## runner-bundle: apps/runner's entries as one ESM file each, with bun's bundler as api-bundle does:
## apps/runner/dist/index.mjs, the step host's Lambda (`index.handler`, dl-z5ja.20), which
## `make -C infra runner-deploy` zips; apps/runner/dist/probe-lambda.mjs, the probe's (dl-z5ja.5); and
## supabase/functions/agent-step/probe.bundle.mjs, which the Edge Function's index.ts serves. Deno has
## no Buffer, process or global as globals, so the Edge banner sets them from node:buffer and
## node:process. None of them is committed.
RUNNER_HOST := apps/runner/dist/index.mjs
RUNNER_LAMBDA := apps/runner/dist/probe-lambda.mjs
RUNNER_EDGE := supabase/functions/agent-step/probe.bundle.mjs
NODE_BANNER := import { createRequire } from "node:module"; const require = createRequire(import.meta.url);
EDGE_BANNER := $(NODE_BANNER) import { Buffer as __Buffer } from "node:buffer"; import __process from "node:process"; globalThis.Buffer ??= __Buffer; globalThis.process ??= __process; globalThis.global ??= globalThis;
runner-bundle:
	rm -f $(RUNNER_HOST) $(RUNNER_LAMBDA) $(RUNNER_EDGE)
	bun build apps/runner/src/index.ts --target=node --format=esm --minify --banner='$(NODE_BANNER)' --outfile $(RUNNER_HOST)
	bun build apps/runner/src/probe-lambda.ts --target=node --format=esm --minify --banner='$(NODE_BANNER)' --outfile $(RUNNER_LAMBDA)
	bun build apps/runner/src/probe-edge.ts --target=node --format=esm --minify --banner='$(EDGE_BANNER)' --outfile $(RUNNER_EDGE)
	@printf 'runner-bundle: %s, %s bytes\n' $(RUNNER_HOST) "$$(wc -c < $(RUNNER_HOST) | tr -d ' ')"
	@printf 'runner-bundle: %s, %s bytes; %s, %s bytes\n' $(RUNNER_LAMBDA) "$$(wc -c < $(RUNNER_LAMBDA) | tr -d ' ')" $(RUNNER_EDGE) "$$(wc -c < $(RUNNER_EDGE) | tr -d ' ')"

## step-probe-local [LOCAL_DATABASE_URL=…]: the step-host probe's dry run (dl-z5ja.5) on a local
## jadwigo* database `make migrate` built: one scripted turn, cold then warm, in the Lambda bundle
## under Node and in the Edge bundle under Deno with its network limited to Postgres. No AWS, no
## Supabase, no paid call. Prints a comparison row per host.
step-probe-local: runner-bundle
	@$(LOCAL_DB_GATE)
	DATABASE_URL=$(LOCAL_DATABASE_URL) sh apps/runner/scripts/step-probe.sh local

## db-runner-role ENV=dev|prod: give jadwigo_runner (made by the migration, nologin) a login and its
## password (JADWIGO_RUNNER_DB_PASSWORD_<ENV>, or the keychain item jadwigo-runner-db-password-<env>),
## as db-role does for jadwigo_api. The step host logs in as it. ENV=prod runs only from your own
## terminal and asks you to type prod first.
db-runner-role:
	@$(PROD_GATE)
	@$(SUPABASE_LINK); \
	RUNNER_PASSWORD=$${JADWIGO_RUNNER_DB_PASSWORD_$(ENV_UPPER):-$$(security find-generic-password -s jadwigo-runner-db-password-$(ENV) -w 2>/dev/null)}; \
	test -n "$$RUNNER_PASSWORD" || { echo "db-runner-role: set JADWIGO_RUNNER_DB_PASSWORD_$(ENV_UPPER) in $(SUPABASE_SECRETS), or add the keychain item jadwigo-runner-db-password-$(ENV)"; exit 1; }; \
	export RUNNER_PASSWORD; \
	printf '%s\n' '\set pw `printenv RUNNER_PASSWORD`' "alter role jadwigo_runner login password :'pw';" \
	  | PGPASSWORD=$$SUPABASE_DB_PASSWORD psql "$$(cat supabase/.temp/pooler-url)" -q -v ON_ERROR_STOP=1 \
	  && echo "db-runner-role: jadwigo_runner can log in on jadwigo-$(ENV). The pooler may refuse the new password for a few minutes"

## step-probe HOST=lambda|edge ENV=dev CONFIRM=dev: the step-host probe on jadwigo-dev (dl-z5ja.5),
## the owner's. lambda deploys to the probe root's function, which `make -C infra
## probe-step-host-apply` made; edge deploys supabase/functions/agent-step and sets its secret. Each
## seeds a made-up pod as jadwigo_api, invokes the host cold and warm, and prints the comparison row.
## The model is scripted: no paid call. Run db-runner-role ENV=dev first. CONFIRM=dev on the command
## line is the go, as for db-push; only dev.
step-probe: runner-bundle
	@case "$(HOST)" in lambda|edge) ;; *) echo "step-probe: HOST=lambda or HOST=edge"; exit 1;; esac
	@if [ "$(ENV)" != dev ]; then echo "step-probe: only ENV=dev"; exit 1; fi
	@if [ "$(origin CONFIRM)" != "command line" ] || [ "$(CONFIRM)" != dev ]; then echo "step-probe: deploys to jadwigo-dev; add CONFIRM=dev to go on"; exit 1; fi
	@$(API_SESSION); \
	RUNNER_PASSWORD=$${JADWIGO_RUNNER_DB_PASSWORD_$(ENV_UPPER):-$$(security find-generic-password -s jadwigo-runner-db-password-$(ENV) -w 2>/dev/null)}; \
	test -n "$$RUNNER_PASSWORD" || { echo "step-probe: set JADWIGO_RUNNER_DB_PASSWORD_$(ENV_UPPER), or add the keychain item jadwigo-runner-db-password-$(ENV), then run make db-runner-role ENV=$(ENV)"; exit 1; }; \
	pooler=$$(sed 's/:5432\//:6543\//' supabase/.temp/pooler-url); \
	RUNNER_URL=$$(RUNNER_PASSWORD="$$RUNNER_PASSWORD" POOLER="$$pooler" node -p 'process.env.POOLER.replace("://postgres.", "://jadwigo_runner.").replace(/@/, ":" + encodeURIComponent(process.env.RUNNER_PASSWORD) + "@")'); \
	case "$$RUNNER_URL" in *://jadwigo_runner.$(SUPABASE_REF):*@*:6543/*) ;; *) echo "step-probe: supabase/.temp/pooler-url is not postgres.$(SUPABASE_REF)@<pooler>:<port>"; exit 1;; esac; \
	API_URL="$$url" API_PASSWORD="$$API_PASSWORD" RUNNER_URL="$$RUNNER_URL" SUPABASE_REF=$(SUPABASE_REF) \
	  SUPABASE_ACCESS_TOKEN="$$SUPABASE_ACCESS_TOKEN" AWS_PROFILE=jadwigo sh apps/runner/scripts/step-probe.sh $(HOST)

## engine-smoke [DRY=1 | ENV=dev|prod]: one chat turn end to end through the step host (dl-z5ja.20),
## PostHog's gateway smoke. It fails on any error event, a turn that does not end, or a model call
## that throws, and prints the run id, the turn's events and USD.
##   DRY=1    the scripted model, in this process as jadwigo_runner, on the local database
##            LOCAL_DATABASE_URL names: no network but Postgres, no paid call. Anyone's.
##   (none)   HttpMuse against the real Muse API, on the same local database: the owner's, it pays.
##            The key comes from MUSE_ENV (META_API_KEY, as jw.muse reads it), the cap from
##            JADWIGO_MUSE_CAP_USD (0.05 unless set), the private tier's model from
##            JADWIGO_MUSE_PRIVATE_MODEL. Run it before `make -C infra runner-deploy`.
##   ENV=…    against the deployed host: seeds a made-up pod on that project as jadwigo_api, pokes
##            jadwigo-runner-<env>:live as the api does, and waits for the turn. Run it right after
##            the deploy; ENV=prod only from your own terminal.
MUSE_ENV ?= $(HOME)/.config/jadwigo-bank/muse.env
SMOKE_WAIT_S ?= 120
engine-smoke:
ifeq ($(ENV),)
	@$(LOCAL_DB_GATE)
ifeq ($(DRY),)
	@test -f "$(MUSE_ENV)" || { echo "engine-smoke: no $(MUSE_ENV) with META_API_KEY; DRY=1 runs the scripted model instead"; exit 1; }
	@set -a; . "$(MUSE_ENV)"; set +a; \
	JADWIGO_MUSE_CAP_USD=$${JADWIGO_MUSE_CAP_USD:-0.05} DATABASE_URL=$(LOCAL_DATABASE_URL) bun apps/runner/src/smoke.ts local
else
	DATABASE_URL=$(LOCAL_DATABASE_URL) bun apps/runner/src/smoke.ts local --dry
endif
else
	@$(PROD_GATE)
	@$(API_SESSION); \
	seeded=$$($(AS_API) bun apps/runner/src/smoke.ts seed) || exit 1; \
	pod=$$(printf '%s' "$$seeded" | jq -r .pod); run=$$(printf '%s' "$$seeded" | jq -r .run_id); \
	echo "engine-smoke: seeded $$run in a made-up pod on jadwigo-$(ENV)"; \
	reply=$$(mktemp); \
	AWS_PROFILE=jadwigo aws lambda invoke --function-name jadwigo-runner-$(ENV) --qualifier live \
	  --invocation-type Event --cli-binary-format raw-in-base64-out \
	  --payload "{\"run_id\":\"$$run\",\"attempt\":1}" "$$reply" >/dev/null || exit 1; \
	rm -f "$$reply"; \
	$(AS_API) bun apps/runner/src/smoke.ts check "$$pod" "$$run" $(SMOKE_WAIT_S)
endif

## drops: md drops check on every drop under docs/drops/
drops:
	for d in docs/drops/*/; do [ -d "$$d" ] && md drops check "$$d"; done; true

## icons: render the crown favicon PNGs from packages/ui/src/brand into each app's public/
## (tools/src/brand-icons.ts; make check fails when they are older than their SVGs)
icons:
	bun tools/src/brand-icons.ts --write

## builder: the Claude Code session the live lesson builder talks to (dl-a38n.10): mints a session id,
## writes JADWIGO_DRAFTS_DIR/session.json, and starts claude with the jadwigo-builder channel loaded.
## It stops a claude that comes up without the channel flag, and prints the registration line for a
## server Claude Code does not have yet (tools/builder/README.md). ARGS passes more to claude.
builder:
	bun tools/builder/launch.ts $(ARGS)
