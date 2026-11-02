# Local dev: the app, the api, the site and the docs from one checkout

`make dev` starts every app's dev server on md's ports (`tools/src/ports.ts`), against the local
`jadwigo` database. The main checkout runs on the numbers `.md/repo.toml` declares. Every md
worktree runs on its own, which `md run dev` exports (`dl-5ssh.98`). The api is kept off 8787,
because other local tools listen there.

| App | Port (main checkout) | URL | On an edit |
| --- | --- | --- | --- |
| apps/web, the app | `WEB_PORT` 5173 | http://127.0.0.1:5173 | Vite HMR, edits in `packages/*` included (they export `src/*.ts`) |
| apps/api | `API_PORT` 8730 | http://127.0.0.1:8730/api/v1/… (and `/api` on the web's port, proxied) | `bun --watch` restarts it, on edits in the packages it imports too |
| apps/site, the landing | `SITE_PORT` 4321 | http://127.0.0.1:4321 | Astro HMR |
| apps/docs | `DOCS_PORT` 4322 | http://127.0.0.1:4322 | Astro HMR |
| packages/copy | none | n/a | `paraglide-js --watch` recompiles `src/paraglide`, and web and site pick it up |

Each port is strict: when it is taken, the server stops and says so instead of moving to the next
one (`dl-5ssh.129`).

## Before

- The install has run: `mise install && bun install --frozen-lockfile`.
- `.env.local` exists in the main checkout (`cp .env.example .env.local`). md seeds it into every
  worktree.
- The local `jadwigo` database is built: `make db` once per machine, then `make db-reset` (the
  shim, every migration, the seed). `make dev` serves that database and `make lesson-import`
  writes into it, so an imported lesson's play path answers on the running web. `.env.local`'s
  `DATABASE_URL` names `jadwigo_test`, which the integration tests own and re-seed; nothing in
  the dev loop reads it (`dl-5ssh.112`). Both reach Postgres.app's 17 server on 5433; the
  Makefile uses 5433 when `.env.local` names no `PGPORT`.
- For the parent's sign-in, `.env.local` has `JW_SUPABASE_KEY` filled. It is jadwigo-dev's
  publishable key: in the Supabase dashboard, project jadwigo-dev, Project Settings → API Keys,
  the key starting `sb_publishable_`. Every browser that opens the app holds it, so it is public,
  but `.env.example` leaves it empty because gitleaks flags its shape (`dl-e8ov.2.82`). With it empty, `/parent` has no
  sign-in. `JW_SUPABASE_URL` and `JW_SUPABASE_PROVIDERS` come filled from `.env.example`.
- The api checks that token with `AUTH_JWKS_URL` and `AUTH_ISSUER`, both filled from
  `.env.example` for jadwigo-dev. Both are required: without them every token route answers 401
  and `/parent` shows `parent_load_failed` after sign-in.
- Lesson pictures need no step. The web dev server takes `VITE_MEDIA_URL` from
  `apps/web/.env.example` when it is unset (`dl-5ssh.97`).

## Steps

1. In the main checkout, run `make dev`. You should see `api on http://127.0.0.1:8730` and Vite's
   `Local: http://127.0.0.1:5173/`.
2. All of it in one terminal, one pane per server: `make dev-all` (in a worktree:
   `env -u MEDALLION_DEV_REPO md run all --here`). It runs mprocs (`mprocs.yaml`; mise pins it, and
   since 0.10 it ships as `dekit`, so `mise install` brings it). Web, api, copy and site start; docs,
   `check` and `db-reset` wait for `s`. Arrows pick a pane, `r` restarts it, `x` stops it, `q` quits
   all. Each pane also writes `.logs/dev/<name>.log`, which an agent reads to see what you see.
3. Only part of it:
   - `make dev-app`: web, api and the copy compile, without the site and the docs, whose start
     (typedoc and the OpenAPI prepare) is the slowest.
   - `make dev-site`: the landing and the copy compile.
   - `make dev-fresh`: rebuild the local database first (the local `db-reset`), then `make dev`.
     Run it after a pull that brings migrations. Until you do, the dev database is stale, with no warning.
4. In a worktree, run `md run dev`. It opens a cmux tab with the worktree's ports. Add `--here`
   to run it in this terminal instead. Until md fixes the bug below, run it as
   `env -u MEDALLION_DEV_REPO md run dev --here`. md exports the ports only to what it runs, so
   in a worktree a bare `make dev-app` or `make dev-site` stops on the first unset port and names it.
   Give it the ports md runs this worktree on.

   The bug: the worktree's `.envrc` exports `MEDALLION_DEV_REPO`, and md reads that as `--repo`
   with no worktree, which means the main checkout. So a bare `md run dev` from a worktree
   starts `make dev` in `~/projects/jadwigo-hackathon`. It is md's bug, reported from `dl-5ssh.98`.
5. To start one app by hand, give it its port: `API_PORT=<n> bun run --cwd apps/api dev`,
   `API_PORT=<n> WEB_PORT=<m> bun run --cwd apps/web dev`, `SITE_PORT=<n> bun run --cwd apps/site dev`.

## Iterating with an agent

- Leave `make dev-all` (or `make dev`, `make dev-app`) running in its own tab. The agent edits files and the page
  updates, and reads a pane through `.logs/dev/<name>.log`: the web and the site through HMR, the api through its restart. Nothing needs to be
  started again, except after a migration (`make dev-fresh`).
- An agent session that runs `astro dev` itself gets Astro's background server, not a foreground
  one: it prints `Dev server running at … (pid <n>)`, writes its log to `.astro/dev.log`, and stops
  with `bunx astro dev stop` in that app (or by its PID). Check `bunx astro dev status` before
  starting a second one.
- To see the result, the agent screenshots the local URL: gstack's `/browse`, or cmux-cua on the
  browser window.
- Lessons: `make lesson-import FILE=<path> [FEATURED=1]` puts a lesson file in the local database
  and prints its `/play/` path. `make builder` starts the live lesson builder session.
- The AI engine runs in the web dev server for `/playground/chat`, on a scripted model, an
  in-memory store and the fixture bank: no network, no database, no paid call
  (`apps/web/dev/engine-plugin.ts`).
- Links on the local landing still open app.jadwigo.pl until `dl-w0b4.112` lands. Open the app at
  its own local URL meanwhile.

## After

- `curl -s http://127.0.0.1:<API_PORT>/api/v1/featured-lessons` answers JSON.
- `curl -s http://127.0.0.1:<WEB_PORT>/api/v1/featured-lessons` gives the same answer, through
  the proxy.
- `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:<SITE_PORT>/` answers 200.

## Undo

Stop the tab, or press Ctrl-C in the terminal. Nothing persists, except what the api wrote to the
`DATABASE_URL` it was given.
