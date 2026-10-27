# Local Postgres that matches Supabase: Postgres.app 17 with pgTAP

The owner runs this once per machine. Each worktree shares the result. It makes the local Postgres
match prod's major version (17) and adds pgTAP, so migrations, row-level security and the pgTAP
tests behave locally as they will on Supabase. Decision:
`jadwigo-platform/decisions/2026-10-27-jadwigo-runs-on-a-prod-and-a-dev-supabase-project-a-native-local`.

## Before

- Postgres.app is installed: `ls /Applications/Postgres.app`.
- See what runs now: `psql -XAtc 'select version()' postgres`. On 2026-10-27 this showed 18.1.
- `git`, `make` and `perl` are present: `git --version && make --version && perl -v | head -2`.

## Steps

1. **Add a Postgres 17 server.** In Postgres.app, open the sidebar → **+** → version **17**, port
   **5432**. Stop the 18 server first, since both cannot hold 5432. Initialize and start 17.
   You should see: `psql -XAtc 'show server_version' postgres` prints `17.x`.
2. **Point the shell at 17's tools.**
   `sudo mkdir -p /etc/paths.d && echo /Applications/Postgres.app/Contents/Versions/17/bin | sudo tee /etc/paths.d/postgresapp`,
   then open a new terminal.
   You should see: `pg_config --version` prints `PostgreSQL 17.x`.
3. **Install pgTAP into 17.** It is plain SQL and needs no compiler:
   ```
   git clone --depth 1 --branch v1.3.3 https://github.com/theory/pgtap.git /tmp/pgtap
   make -C /tmp/pgtap && make -C /tmp/pgtap install
   ```
   You should see: `psql -XAtc "select default_version from pg_available_extensions where name = 'pgtap'" postgres` prints `1.3.3`, the version prod has.
4. **Install `pg_prove`:** `sudo cpan TAP::Parser::SourceHandler::pgTAP`.
   You should see: `pg_prove --version` prints a version.
5. **Recreate the 2 local databases on 17:** `make db`, from any jadwigo worktree.
   You should see: `psql -lqt | cut -d'|' -f1 | grep -E '^ *jadwigo'` lists `jadwigo` and `jadwigo_test`.

## After

```
psql -XAtc "select current_setting('server_version'), (select default_version from pg_available_extensions where name='pgtap')" jadwigo_test
```

This prints `17.x|1.3.3`. Once the ops lane lands it, `bun tools/src/check-supabase-match.ts`
compares this server with `jadwigo-dev`.

## Undo

Two-way. Stop the 17 server and start 18 again in Postgres.app, then remove `/etc/paths.d/postgresapp`
or point it back. The 18 server's data is untouched.
