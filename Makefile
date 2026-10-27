# Thin on purpose: every target calls turbo, bun, md or Postgres.app's tools. The gate is `make check`.
# .env.local (from .env.example) is read here, so check-all's integration tests see DATABASE_URL.
ifneq (,$(wildcard .env.local))
include .env.local
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
.PHONY: check check-all dev db migrate pgtap db-reset db-seed db-push db-role skills drops

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
## and the dev commands (.agents/skills/dev-*) into .claude/skills. The links are committed;
## tools/src/check-workflows.ts checks them
skills:
	mkdir -p .claude/skills .agents/skills
	for d in workflows/jadwigo-*/; do [ -d "$$d" ] || continue; n=$$(basename "$$d"); ln -sfn "../../workflows/$$n" ".claude/skills/$$n"; ln -sfn "../../workflows/$$n" ".agents/skills/$$n"; done
	for d in .agents/skills/dev-*/; do [ -d "$$d" ] || continue; n=$$(basename "$$d"); ln -sfn "../../.agents/skills/$$n" ".claude/skills/$$n"; done

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
	psql "$$DATABASE_URL" -q -v ON_ERROR_STOP=1 -c 'drop schema if exists public, app, auth cascade' -c 'create schema public'
	psql "$$DATABASE_URL" -q -v ON_ERROR_STOP=1 -f supabase/tests/shim.sql
	for f in supabase/migrations/*.sql; do echo "$$f"; psql "$$DATABASE_URL" -q -v ON_ERROR_STOP=1 -1 -f "$$f" || exit 1; done

## pgtap: the pgTAP tests in supabase/tests on the database `make migrate` built. Each test runs in
## a transaction it rolls back. Needs pg_prove (cpanm TAP::Parser::SourceHandler::pgTAP)
pgtap:
	psql "$$DATABASE_URL" -q -v ON_ERROR_STOP=1 -c 'create extension if not exists pgtap'
	pg_prove --dbname "$$DATABASE_URL" supabase/tests/*.test.sql

# The Supabase projects (decision 2026-10-27-jadwigo-runs-on-a-prod-and-a-dev-supabase-project-a-native-local),
# reached through the Supabase CLI mise.toml pins. Each secret is read from the environment when set
# (this checkout's .env.local: SUPABASE_ACCESS_TOKEN, SUPABASE_DB_PASSWORD, JADWIGO_API_DB_PASSWORD,
# each for one ENV), or else from the macOS keychain: supabase-access-token, supabase-db-password-<env>
# (postgres) and jadwigo-api-db-password-<env> (jadwigo_api). Never echoed. docs/runbooks/migrations.md.
SUPABASE_REF_dev := jweuvslwntdimuwcvlzq
SUPABASE_REF_prod := xhzkmpainwzrfktxffjv
SUPABASE_REF := $(SUPABASE_REF_$(ENV))
# Links ENV's project with both secrets in the environment. Each recipe line using it is one shell.
SUPABASE_LINK = case "$(ENV)" in dev|prod) ;; *) echo "$@: ENV=dev or ENV=prod"; exit 1;; esac; \
	SUPABASE_ACCESS_TOKEN=$${SUPABASE_ACCESS_TOKEN:-$$(security find-generic-password -s supabase-access-token -w 2>/dev/null)}; \
	test -n "$$SUPABASE_ACCESS_TOKEN" || { echo "$@: set SUPABASE_ACCESS_TOKEN in .env.local, or add the keychain item supabase-access-token"; exit 1; }; \
	SUPABASE_DB_PASSWORD=$${SUPABASE_DB_PASSWORD:-$$(security find-generic-password -s supabase-db-password-$(ENV) -w 2>/dev/null)}; \
	test -n "$$SUPABASE_DB_PASSWORD" || { echo "$@: set SUPABASE_DB_PASSWORD (jadwigo-$(ENV)'s postgres password) in .env.local, or add the keychain item supabase-db-password-$(ENV)"; exit 1; }; \
	export SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD; \
	supabase link --project-ref $(SUPABASE_REF) >/dev/null || exit 1
# Agents never touch prod: Claude Code's shells set CLAUDECODE. The owner pushes prod from a terminal.
NOT_PROD_FROM_AGENT = if [ "$(ENV)" = prod ] && [ -n "$$CLAUDECODE" ]; then echo "$@ ENV=prod: run it from your own terminal, not from an agent's shell"; exit 1; fi

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
## Until that script exists it says so and does nothing.
db-seed:
	@if grep -q '"seed":' packages/lesson-import/package.json; then bun run --cwd packages/lesson-import seed; \
	else echo "db-seed: no seed yet (dl-e8ov.2.32.5 adds packages/lesson-import's seed script)"; fi

## db-push ENV=dev|prod: show the migrations ENV's project lacks (a dry run), then push them only when
## you type the ENV's name. DRY_RUN=1 stops after the dry run. One-way: a pushed migration stays.
db-push:
	@$(NOT_PROD_FROM_AGENT)
	@$(SUPABASE_LINK); \
	supabase db push --linked --dry-run || exit 1; \
	if [ -n "$(DRY_RUN)" ]; then exit 0; fi; \
	printf 'Push these to jadwigo-%s? Type %s to push: ' "$(ENV)" "$(ENV)"; read answer; \
	if [ "$$answer" != "$(ENV)" ]; then echo "db-push: nothing pushed"; exit 1; fi; \
	supabase db push --linked

## db-role ENV=dev|prod: give jadwigo_api (made by the migration, nologin) a login and the password in
## the keychain item jadwigo-api-db-password-<env>. Run it after the first db-push, and after a rotation.
db-role:
	@$(NOT_PROD_FROM_AGENT)
	@$(SUPABASE_LINK); \
	API_PASSWORD=$${JADWIGO_API_DB_PASSWORD:-$$(security find-generic-password -s jadwigo-api-db-password-$(ENV) -w 2>/dev/null)}; \
	test -n "$$API_PASSWORD" || { echo "db-role: set JADWIGO_API_DB_PASSWORD in .env.local, or add the keychain item jadwigo-api-db-password-$(ENV) (docs/runbooks/migrations.md)"; exit 1; }; \
	export API_PASSWORD; \
	test -s supabase/.temp/pooler-url || { echo "db-role: supabase link wrote no supabase/.temp/pooler-url"; exit 1; }; \
	printf '%s\n' '\set pw `printenv API_PASSWORD`' "alter role jadwigo_api login password :'pw';" \
	  | PGPASSWORD=$$SUPABASE_DB_PASSWORD psql "$$(cat supabase/.temp/pooler-url)" -q -v ON_ERROR_STOP=1 && echo "db-role: jadwigo_api can log in on jadwigo-$(ENV)"

## drops: md drops check on every drop under docs/drops/
drops:
	for d in docs/drops/*/; do [ -d "$$d" ] && md drops check "$$d"; done; true
