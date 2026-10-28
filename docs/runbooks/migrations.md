# Migrations: pushing the schema to jadwigo-dev and jadwigo-prod

The owner runs this. A merge applies nothing: a migration reaches a Supabase project only when the
owner pushes it (decision `2026-10-27-jadwigo-runs-on-a-prod-and-a-dev-supabase-project-a-native-local`).
Push dev first; push prod only after the same migrations have run on dev.

| Project | Ref | Region |
| --- | --- | --- |
| `jadwigo-dev` | `jweuvslwntdimuwcvlzq` | eu-central-1 |
| `jadwigo-prod` | `xhzkmpainwzrfktxffjv` | eu-central-1 |

The `make` targets read their secrets from one file outside every checkout,
`~/.config/jadwigo/supabase.env`, which must be mode 600 (they refuse it otherwise). Only these
targets read it, inside their own shell, so no other target, test or worktree's `.env.local` holds
a secret. A value missing from the file comes from the macOS keychain instead. Nothing is printed.

```sh
mkdir -p ~/.config/jadwigo && touch ~/.config/jadwigo/supabase.env && chmod 600 ~/.config/jadwigo/supabase.env
```

Then fill it in an editor (shell syntax: single-quote each value):

```sh
SUPABASE_ACCESS_TOKEN='sbp_…'              # supabase.com/dashboard/account/tokens
SUPABASE_DB_PASSWORD_DEV='…'               # jadwigo-dev's postgres password
JADWIGO_API_DB_PASSWORD_DEV='…'            # new: openssl rand -base64 32
SUPABASE_DB_PASSWORD_PROD='…'              # when you push prod
JADWIGO_API_DB_PASSWORD_PROD='…'
```

| Variable in `supabase.env` | Keychain item (service) instead |
| --- | --- |
| `SUPABASE_ACCESS_TOKEN` | `supabase-access-token` |
| `SUPABASE_DB_PASSWORD_DEV`, `_PROD` | `supabase-db-password-dev`, `supabase-db-password-prod` |
| `JADWIGO_API_DB_PASSWORD_DEV`, `_PROD` | `jadwigo-api-db-password-dev`, `jadwigo-api-db-password-prod` |

What each one is:

| Keychain item (service) | What it is |
| --- | --- |
| `supabase-access-token` | a Supabase personal access token, for `supabase link` |
| `supabase-db-password-dev`, `supabase-db-password-prod` | the `postgres` password of each project |
| `jadwigo-api-db-password-dev`, `jadwigo-api-db-password-prod` | the password `make db-role` gives `jadwigo_api` |

## Before

1. You're on an up-to-date `main`, and every migration is merged:
   `git switch main && git pull --rebase=merges && ls supabase/migrations`.
2. The migrations pass locally: `make migrate && make pgtap` ends with `Result: PASS`.
3. The CLI is the pinned one: `mise install && supabase --version` prints `2.121.0`.
4. `~/.config/jadwigo/supabase.env` has the values above for the ENV you run, and `ls -l` shows it
   as `-rw-------`. The `jadwigo_api` password is made once per project with
   `openssl rand -base64 32`.

## Steps

1. **Dry run on dev.** Run `make db-push ENV=dev DRY_RUN=1`. It links jadwigo-dev and lists the
   migrations dev lacks; nothing changes. You should see each new `supabase/migrations/*.sql`
   by name.
2. **Push dev.** Run `make db-push ENV=dev`. It shows the same list, and pushes only after you type
   `dev`. With no keyboard (`!` in Claude Code), pass it instead: `make db-push ENV=dev CONFIRM=dev`. Each migration runs in one transaction: if one fails, dev keeps the state before it.
3. **The API's login, once per project.** Run `make db-role ENV=dev`. It ends with
   `db-role: jadwigo_api can log in on jadwigo-dev`.
4. **Rebuild dev, when it has drifted:** `make db-reset ENV=dev` drops dev's schema and reruns
   every migration, after asking. Then seed it again (step 5).
5. **Seed dev's featured lessons:** `make db-seed ENV=dev` imports the lesson files in
   `packages/testing/src/lessons/` through the session pooler. It prints one line per lesson,
   `version 1 published` the first time and `unchanged` after that, so rerun it after any push.
   To play against dev, `make api-dev ENV=dev` serves the local `apps/api` on jadwigo-dev as
   `jadwigo_api` through the transaction pooler (port 6543), on `PORT` (8787 by default).
6. **Prod**, once dev has run the same migrations and its checks pass: from your own terminal, not
   an agent's (the targets refuse prod there), `make db-push ENV=prod DRY_RUN=1`, then
   `make db-push ENV=prod`, then `make db-role ENV=prod` the first time.

## After

- `make db-push ENV=dev DRY_RUN=1` again reports the remote database is up to date.
- In the dashboard's SQL editor for the project:
  `select count(*) from information_schema.tables where table_schema = 'public'` shows 11
  (the 10 tables and the `attempt_result` view) for core v0, and
  `select rolcanlogin, rolbypassrls from pg_roles where rolname = 'jadwigo_api'` shows `t, f`.
- `apps/api` connects through the transaction pooler (port 6543) as `jadwigo_api.<ref>`, with
  prepared statements off.

## Undo

One-way: a pushed migration can't be pulled back. A mistake is fixed forward with a new migration,
merged and pushed the same way. jadwigo-dev may be reset (`make db-reset ENV=dev`); prod is never
reset, and no target resets it.
