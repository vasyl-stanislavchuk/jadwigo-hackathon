# jadwigo

A learning app for children in the first school grades, in Polish and English. This is the
monorepo: bun workspaces and Turborepo for TypeScript, a uv project for the `jw` CLI.

## Commands

| Need | Command |
| --- | --- |
| Install | `mise install && bun install --frozen-lockfile` |
| The gate before you finish | `make check` (lint, typecheck and test on what changed, `turbo --affected`, then knip, dependency-cruiser and the no-bank check) |
| Everything | `make check-all` |
| One package | `bunx turbo run lint typecheck test --filter=./packages/core` |
| Integration tests | `DATABASE_URL=postgresql://localhost/jadwigo_test bunx turbo run test:int` |
| The guard's tests | `bun test ./.claude/hooks/guard.test.ts` |

Run the tests your change touches. CI runs the rest. Playwright is CI's job.

## Layout

- `apps/` run: `api` (the Lambda), `site` (jadwigo.pl), `web` (the app), `cli` (`jw`, Python and Click).
- `packages/` are imported: `contracts` (Zod, imports nothing of ours), `core`, `store`, `bank`,
  `api-client`, `lesson-kit`, `ui`, `copy` (pl and en), `config`, `testing` (tests only).
- `tools/` holds the repo scripts, each with a test. `docs/workstreams/` says who owns what.
- `infra/` and `supabase/` are empty until their beads. Read their READMEs.

## Fences

Each fence has a test that plants a violation (`tools/src/fences.test.ts`, `guard.test.ts`).

1. **The guard** (`.claude/hooks/guard.ts`) denies:
   - every tool while `ANTHROPIC_API_KEY` is set
   - `terraform apply` and prod AWS profiles
   - Docker and `supabase start`
   - force-push and `--no-verify`
   - pushes to `main`
   - `git add -A` and `git add .`
   - `git pull --rebase` without `=merges`
   - `bd update --notes` (use `--append-notes`)
   - an Agent launch without `model: opus`
   - a bare `gbrain`, and other projects' databases
2. **Hooks:** Biome runs on every file you edit. The Stop hook runs the affected checks, and you may not finish red.
3. **Strict TypeScript:**
   - `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
   - Ids are branded types that only the Zod parsers in `packages/contracts` create.
4. **Biome:**
   - errors on `any`, `@ts-ignore`, `.only` and `.skip`
   - `lint/*.grit`: `process.env` is read only in a `src/config.ts`
5. **Imports** (dependency-cruiser):
   - apps import packages, never the reverse
   - `contracts` imports nothing of ours
   - only test files import `@jadwigo/testing` or a `testing` subpath
   - knip fails unused files, exports and dependencies
6. **Unit tests** fail on network, real AWS and an unpinned clock (`packages/testing/src/unit-setup.ts`). Anything that needs those is a `*.int.test.ts`.
7. **Contract snapshots:** `packages/contracts/schemas/*.json` fail on drift. Update them with `vitest -u` on purpose, and say so in the PR.
8. **No bank in git:** no question pages, Khan items, SQLite, bank media or files over 1 MB (`tools/src/check-no-bank.ts`).
9. **Pre-commit** (lefthook) runs Biome and gitleaks. Never commit a family member's name.
10. **Ports** come from md's environment (`tools/src/ports.ts`). Inside an md worktree, an unset port fails.

## House rules

- Every dependency has a line in its `package.json` `"//"` block naming the one thing that needs it.
- Versions are pinned exact, and Renovate moves them after 7 days.
- `main` is reached through a PR titled `<issue id>: <what>`, squash-merged after `ci-ok`. A merge deploys nothing; the owner deploys by hand.
- Issues live on the david-learns beads tracker: `bd -C ~/projects/david-learns/.beads ...`.
- Decisions live in the md context brain. Ask with `md context ask "<question>" --project jadwigo-platform` before you settle anything the docs leave open.
