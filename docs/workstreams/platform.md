# platform

**Goal.** Every workstream builds on a single Jadwigo service on AWS, with parent login, a shared contract and deploys that take a single command. It is light to run and keeps each family's data private by construction.

- **md context project:** `jadwigo-platform`. The charter, decisions and reports live in the brain (`md context ask "<question>" --project jadwigo-platform`).
- **Scope epics:** `dl-5ssh`, `dl-e8ov.1`, `dl-e8ov.2`, label `project:jadwigo-platform`, on the shared david-learns tracker.

## Directories it owns

- `apps/api/`
- `packages/contracts/`
- `packages/store/`
- `packages/config/`
- `packages/api-client/`
- `packages/testing/`
- `infra/`
- `supabase/`
- `tools/`
- `.github/`
- `.claude/`

The labeler (`.github/labeler.yml`) puts the `ws:platform` label on a PR that touches these.

## Run and test

- Check what changed: `make check`.
- Only this workstream's packages: `bunx turbo run lint typecheck test --filter=./apps/api --filter=./packages/contracts --filter=./packages/store --filter=./packages/config --filter=./packages/api-client --filter=./packages/testing`.
- The integration placeholder: `DATABASE_URL=postgresql://localhost/jadwigo_test bunx turbo run test:int --filter=./packages/store` (Postgres.app).

## Done at the next milestone

Milestone 1, free tier (the order is in `docs/README.md`). A featured lesson is served by `apps/api` through `packages/contracts` and `packages/store`, the owner deploys it with one command, and CI guards every PR with `ci-ok`.

## Meets

- **Every workstream** builds on its contracts, its CI and its fences.
- **learner-experience:** `packages/api-client` is what the player calls.
- **marketing:** hosts come from `packages/config`.
- **question-bank:** the bank routes in `apps/api`.
