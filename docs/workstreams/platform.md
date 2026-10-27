# platform

**Goal.** Every workstream builds on a single Jadwigo service on AWS, with parent login, a shared contract and deploys that take a single command. It is light to run and keeps each family's data private by construction.

- **md context project:** `jadwigo-platform`. The charter, decisions and reports live in the brain (`md context ask "<question>" --project jadwigo-platform`).
- **Scope epics:** `dl-5ssh`, `dl-e8ov.1`, `dl-e8ov.2`, label `project:jadwigo-platform`, on the shared david-learns tracker.
- **Builds in:** this repo.

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

Milestone 1, free tier (the order is in `docs/README.md`). A featured lesson is served by `apps/api` through `packages/contracts` and `packages/store`, the owner deploys it by hand with one command, and CI guards every PR with `ci-ok`.

## Meets

- **Every workstream** builds on its contracts, its CI and its fences.
- **learner-experience:** `packages/api-client` is what the player calls.
- **marketing:** hosts come from `packages/config`.
- **question-bank:** the bank routes in `apps/api`.

## Decisions that shape it

- `jadwigo-platform/decisions/2026-10-26-the-jadwigo-monorepo-is-vasyl-stanislavchuk-jadwigo-hackathon-at`: this repo is the monorepo
- `jadwigo-platform/decisions/2026-10-26-jadwigo-s-records-live-in-supabase-postgres-in-place-of-dynamodb`: records live in Supabase Postgres, content in S3
- `jadwigo-platform/decisions/2026-10-26-terraform-lives-in-the-jadwigo-repo-under-infra-one-root-module`: Terraform is one root module under infra/
- `jadwigo-platform/decisions/2026-10-26-a-green-merge-does-not-deploy-to-prod-the-owner-deploys-manually`: a merge deploys nothing; the owner deploys by hand
- `jadwigo-platform/decisions/2026-10-27-red-review-goes-back-to-the-lane`: a red review goes back to the lane; the merge steward fixes only mechanical work
- `jadwigo-platform/decisions/2026-10-26-jadwigo-carries-no-ukrainian-the-tables-stay-in-david-learns-and`: no Ukrainian: Polish and English only
- `jadwigo-platform/decisions/2026-10-26-the-service-keeps-its-logs-for-90-days`: logs are kept 90 days
- `jadwigo-platform/decisions/2026-10-26-the-login-free-lesson-is-protected-by-invisible-limits-only-per`: the login-free lesson has invisible limits only
- `david-learns/decisions/2026-10-26-only-the-playground-matters-the-django-and-python-lesson-backend`: only the playground matters: the Python lesson path is thrown away, so ports start from the playground's TypeScript
- `jadwigo-hackathon/decisions/2026-10-26-each-workstream-builds-where-its-code-lives-four-in-the-jadwigo`: where each workstream builds
- `jadwigo-hackathon/decisions/2026-10-26-voice-is-out-of-scope-until-the-core-works-well-children-answer`: voice is out of scope until the core works well
- The meta decision of 2026-10-26 that the top epic is the learner growing toward his goals, not the hackathon submission (`md context decisions --project jadwigo-hackathon`; its slug names the learner, so it is not quoted here)
- And the david-learns decisions this project carries: `jadwigo-platform/notes/decisions-in-force-from-david-learns`.

## Open

<!-- OPEN: each line waits on the owner. Close it here when its issue closes. -->

- `dl-5ssh.9` (open): the AWS state bucket and Lambda quota, which the infra skeleton needs
- `dl-5ssh.5` (open, after `dl-5ssh.34.4`): the Supabase project and DPA
- `dl-5ssh.15` (open, after `dl-5ssh.34.4`): the first apply and the live smoke test
- `dl-5ssh.34.39` (open): the family names for the gitleaks rule
- `dl-5ssh.20, dl-e8ov.2.14, .2.16, .2.27, .2.28, dl-liwi.32` (deferred to milestone 3): what parents and members see, CLI token reach, the registration promise, Google profile data, the report language
