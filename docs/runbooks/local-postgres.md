# Local Postgres that matches Supabase: a Postgres.app 17 server on port 5433, with pgTAP

Once per machine, and every worktree shares the result. It gives jadwigo a local Postgres on prod's
major version (17), beside the 18 server that other projects use, plus pgTAP, so migrations,
row-level security and pgTAP tests behave locally as they will on Supabase. Decision:
`jadwigo-platform/decisions/2026-10-27-jadwigo-runs-on-a-prod-and-a-dev-supabase-project-a-native-local`.

The agent runs every step it may. The steps the owner must run are in one script, at the end.

**Never stop the 18 server on 5432.** It holds other projects' databases. Jadwigo runs on its own
17 server, on 5433.

## Before

- Postgres.app is the all-versions build (2.9.6 or later, versions 14 to 18):
  `ls /Applications/Postgres.app/Contents/Versions` lists `17`.
- The 18 server answers: `psql -p 5432 -XAtc 'show server_version' postgres` prints `18.x`.

## Steps (agent)

1. **Install the all-versions build if `17` is missing.** Download
   `Postgres-<v>-14-15-16-17-18.dmg` from the PostgresApp releases on GitHub, and check its SHA-256
   against the release's digest. Mount it, and verify it with `codesign --verify --deep --strict`. Then:
   - quit Postgres.app, and stop the 18 server with its own `pg_ctl -m fast`;
   - move the old app aside as a backup, and `ditto` the new one in;
   - open Postgres.app.
   You should see: the 18 server back on 5432, and its databases answering.
2. **Create the 17 data directory:**
   `Versions/17/bin/initdb -D ~/Library/Application\ Support/Postgres/var-17 -U postgres --encoding=UTF8 --locale=en_US.UTF-8 --auth=trust`.
3. **Register it in Postgres.app.** With the app quit:
   `defaults write com.postgresapp.Postgres2 Servers -array-add '{binPath = "/Applications/Postgres.app/Contents/Versions/17/bin"; name = "PostgreSQL 17"; port = 5433; startOnLogin = 1; varPath = "…/var-17";}'`.
4. **Start it** with `Versions/17/bin/pg_ctl -D …/var-17 -o "-p 5433 …" -w start`, then
   `create role <you> superuser login`.
   You should see: `psql -p 5433 -XAtc 'show server_version' postgres` prints `17.x`.
5. **Create the databases:** `createdb -p 5433 jadwigo` and `createdb -p 5433 jadwigo_test`. Then set
   `DATABASE_URL=postgresql://localhost:5433/jadwigo_test` in each worktree's `.env.local`.

## Steps (owner, one script)

6. pgTAP 1.3.3 into the 17 server, and `pg_prove`. Both install into system locations, so the owner
   runs them. The agent hands over a script that clones pgTAP at `v1.3.3` and runs
   `make PG_CONFIG=/Applications/Postgres.app/Contents/Versions/17/bin/pg_config install`, then
   installs `TAP::Parser::SourceHandler::pgTAP` with `cpan`.

## After

```
psql -p 5433 -XAtc "select current_setting('server_version'), (select default_version from pg_available_extensions where name='pgtap')" jadwigo_test
```

This prints `17.x|1.3.3`, prod's versions. Once the ops lane lands it, `bun tools/src/check-supabase-match.ts`
compares this server with `jadwigo-dev`.

## Undo

Two-way, and the 18 server is never touched:
- stop the 17 server (`pg_ctl -D …/var-17 stop`);
- remove its entry from the `Servers` preference and delete `var-17`;
- to go back to the old app, quit Postgres.app and move the backup over `/Applications/Postgres.app`.
