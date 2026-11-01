# supabase

The schema's source of truth (decision `2026-10-27-sql-migrations-are-the-source-of-truth-for-jadwigo-s-schema`):
SQL migrations, and the pgTAP tests that hold their rules. Everything here runs on plain Postgres 17,
prod's major version, with no Docker: Postgres.app on port 5433 locally, and the PGDG packages in CI.

| Path | What it is |
| --- | --- |
| `migrations/<timestamp>_<name>.sql` | One migration per change, applied in name order. Never edited once merged: a change is a new migration. |
| `tests/shim.sql` | What a Supabase project has before any migration: the roles `anon`, `authenticated`, `authenticator`, `service_role` and `supabase_auth_admin`, the `auth` schema, `auth.uid()`, `auth.jwt()`, `auth.role()` and `auth.email()`, and the columns of `auth.users` and `auth.identities` a sign-in writes. Realtime's `realtime.send()`, `realtime.topic()` and `realtime.messages`, which keep each broadcast as a row; and, where pg_cron is not available, `cron.job`, `cron.schedule()` and `cron.unschedule()`, which record a job and never run it. Applied before the migrations, never to a real project. |
| `tests/*.test.sql` | pgTAP tests. Each runs in a transaction it rolls back, on the fixture in `tests/_fixture.sql`. |

## Commands

- `make pgmq` installs pgmq 1.5.1, the version Supabase's Postgres 17 runs, into the extension
  directory of the server `DATABASE_URL` names, once per machine. pgmq is pure SQL: a control file
  and one script, checked by sha256. A migration then runs `create extension pgmq` as on Supabase.
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
  `app.current_pod_id()`: the token's `pod_id` claim when the API has set `request.jwt.claims`
  (what `auth.jwt()` reads), else `app.pod_id`, which the API sets per transaction after
  `authorize()` (`set_config('app.pod_id', …, true)`).
- A pod also reads, never writes, the attempts its learners claimed, and of the pod they were played
  in only what each attempt points at: its version, that version's lesson and its assignment
  (`claimed_read` policies, `20261029120000_parent_login.sql`). It reads no `lesson_question`, so
  no answer key; `attempt_result` gives it each asked question's face through `app.asked_question()`.
  A claim goes through `app.claim_attempt()`, never an update of `attempt`.
- Every pod also reads, never writes, Jadwigo's own pod's curriculum, topic and skill rows, the
  shared catalogue (`shared_read` policies, `20261031120000_learner_knowledge.sql`;
  `app.shared_pod_id()` is `FEATURED_POD_ID`). A pod's row may name a shared topic or curriculum,
  never another pod's: a foreign key checks past row-level security, so restrictive policies do
  (`20261031130000_learner_knowledge_fix.sql`). `learner_skill_evidence` runs as the caller and reads
  a claimed attempt's skill codes through `app.asked_skills()`, never its `lesson_question` row.
- Google and Facebook profile data is trimmed (`20261030120000_trim_profile.sql`,
  `docs/research/profile-trim.md`): triggers keep only the linking keys in `auth.users` and
  `auth.identities`, and the custom access token hook `app.custom_access_token` does the same to a
  token's `user_metadata`. A claim the token needs, such as `pod_id`, joins that hook.
- `apps/api` connects as `jadwigo_api`, which never owns a table and never bypasses row-level
  security. Its login is set per environment, outside migrations.
- The engine's step consumer connects as `jadwigo_runner` (`20261101120000_run.sql`): it owns no
  table, never bypasses row-level security, and executes only the `app` functions a migration grants
  it by name. `USAGE` on `app` lets it call anything left to PUBLIC, so a migration that adds an `app`
  function revokes it from `public` (and from `jadwigo_api` unless the API calls it).
- A migration under `supabase/` is a one-way door: say so in the PR.
