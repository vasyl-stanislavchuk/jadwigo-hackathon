# Local dev: the api and the web app from one checkout

`make dev` starts every app's dev server: apps/api on `API_PORT` and apps/web on `WEB_PORT`,
whose `/api` proxy follows `API_PORT` (`tools/src/ports.ts`). The main checkout runs on the
numbers `.md/repo.toml` declares, 5173 and 8730. Every md worktree runs on its own, which
`md run dev` exports (`dl-5ssh.98`). The api is kept off 8787, because other local tools listen
there.

## Before

- The install has run: `mise install && bun install --frozen-lockfile`.
- `.env.local` exists in the main checkout (`cp .env.example .env.local`). md seeds it into every
  worktree.
- For the parent's sign-in, `.env.local` has `JW_SUPABASE_KEY` filled. It is jadwigo-dev's
  publishable key: in the Supabase dashboard, project jadwigo-dev, Project Settings → API Keys,
  the key starting `sb_publishable_`. Every browser that opens the app holds it, so it is public,
  but `.env.example` leaves it empty because gitleaks flags its shape (`dl-e8ov.2.82`). With it empty, `/parent` has no
  sign-in. `JW_SUPABASE_URL` and `JW_SUPABASE_PROVIDERS` come filled from `.env.example`.
- Lesson pictures need no step. The web dev server takes `VITE_MEDIA_URL` from
  `apps/web/.env.example` when it is unset (`dl-5ssh.97`).

## Steps

1. In the main checkout, run `make dev`. You should see `api on http://127.0.0.1:8730` and Vite's
   `Local: http://127.0.0.1:5173/`.
2. In a worktree, run `md run dev`. It opens a cmux tab with the worktree's ports. Add `--here`
   to run it in this terminal instead. Until md fixes the bug below, run it as
   `env -u MEDALLION_DEV_REPO md run dev --here`.

   The bug: the worktree's `.envrc` exports `MEDALLION_DEV_REPO`, and md reads that as `--repo`
   with no worktree, which means the main checkout. So a bare `md run dev` from a worktree
   starts `make dev` in `~/projects/jadwigo-hackathon`. It is md's bug, reported from `dl-5ssh.98`.
3. To start one app by hand, give it its port: `API_PORT=<n> bun run --cwd apps/api dev`, and
   `API_PORT=<n> WEB_PORT=<m> bun run --cwd apps/web dev`.

## After

- `curl -s http://127.0.0.1:<API_PORT>/api/v1/featured-lessons` answers JSON.
- `curl -s http://127.0.0.1:<WEB_PORT>/api/v1/featured-lessons` gives the same answer, through
  the proxy.

## Undo

Stop the tab, or press Ctrl-C in the terminal. Nothing persists, except what the api wrote to the
`DATABASE_URL` it was given.
