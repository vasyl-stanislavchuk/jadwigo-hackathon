# supabase

The schema's source of truth (decision `2026-10-27-sql-migrations-are-the-source-of-truth-for-jadwigo-s-schema`):
SQL migrations, and the pgTAP tests that hold their rules. Everything here runs on plain Postgres 17,
prod's major version, with no Docker: Postgres.app on port 5433 locally, and the PGDG packages in CI.

| Path | What it is |
| --- | --- |
| `migrations/<timestamp>_<name>.sql` | One migration per change, applied in name order. Never edited once merged: a change is a new migration. |
| `tests/shim.sql` | What a Supabase project has before any migration: the roles `anon`, `authenticated`, `authenticator` and `service_role`, the `auth` schema, and `auth.uid()`, `auth.jwt()`, `auth.role()` and `auth.email()`. Applied before the migrations, never to a real project. |
| `tests/*.test.sql` | pgTAP tests. Each runs in a transaction it rolls back, on the fixture in `tests/_fixture.sql`. |

## Commands

- `make migrate` resets the database `DATABASE_URL` names (only a `jadwigo*` one), then applies the
  shim and every migration.
- `make pgtap` runs the tests with `pg_prove`. Locally, install it once with
  `cpanm TAP::Parser::SourceHandler::pgTAP`.
- `make db-reset` rebuilds the local `jadwigo` database the same way, then seeds it.
- CI's `supabase` job runs both. A migration reaches a real project only when the owner pushes it
  with `make db-push ENV=dev|prod` (`docs/runbooks/migrations.md`); CI never applies one, and a
  merge deploys nothing.

## Rules

- Every name follows `packages/contracts/RULES.md`; `packages/contracts/src/naming.test.ts` reads
  these migrations and fails the rules marked tested.
- Every table carries `pod_id` and forces row-level security. Each policy compares it with
  `app.current_pod_id()`, which the API sets per transaction after `authorize()`
  (`set_config('app.pod_id', …, true)`).
- `apps/api` connects as `jadwigo_api`, which never owns a table and never bypasses row-level
  security. Its login is set per environment, outside migrations.
- A migration under `supabase/` is a one-way door: say so in the PR.
