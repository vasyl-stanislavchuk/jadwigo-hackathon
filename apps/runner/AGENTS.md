# apps/runner

The engine's step host: a thin wrapper that drains pgmq's `agent_step` through `drain` and `runStep`
from `@jadwigo/jadwigo-ai`, as `jadwigo_runner`. Its own release target, apart from `apps/api`.

- **Not here:** Engine rules (the due-run path, the attempt fence, redelivery, the dead letter live in
  `packages/jadwigo-ai`), SQL (`packages/store`, `supabase/migrations`), the routes (`apps/api`).
- **Owner:** the ai-workflows workstream. **Filled by:** `dl-z5ja.5` (the probe: both hosts, scripted
  model), `dl-z5ja.20` (the host itself, its invocation path, `make engine-smoke`).
- **Imports:** packages: `contracts`, `jadwigo-ai`, `store`. Never another app.
- **Entries:** `src/probe-lambda.ts` (`probe-lambda.handler`, the 2nd Lambda) and `src/probe-edge.ts`
  (served by `supabase/functions/agent-step/index.ts`), both bundled by `make runner-bundle`.
  `src/probe-cli.ts` is the probe's laptop half: seed, local dry run, report.
- **Test:** `bunx turbo run lint typecheck test --filter=./apps/runner`; the dry run on a local
  database is `make step-probe-local LOCAL_DATABASE_URL=postgresql://localhost:5433/jadwigo_<yours>`.

## Rules here

- The host only drains. Anything a step decides belongs in `runStep`; a gap there is a message to
  the lead, not a branch here.
- It connects as `jadwigo_runner`: `createPostgresStore(url, { role: "jadwigo_runner" })` sets
  `app.pod_id` per unit, and `PgmqRunQueue` runs as the same role. Never the owner, never
  `service_role`, never `SUPABASE_DB_URL`.
- Its database URL is read once per cold start: the Edge secret `RUNNER_DATABASE_URL`, else
  `DATABASE_URL` locally, else the SSM SecureString `JADWIGO_RUNNER_DB_URL_PARAM` names. Never in
  Terraform state, a tfvars file or the function's environment.
- Logs carry ids and outcomes only: never a message, a payload, a name or a URL.
- A release names the exact artifact: upload the zip, publish a version, move the `live` alias;
  rollback points `live` back. A boot check loads the bundle before the upload. Deploys are the
  owner's (`make step-probe`, and `dl-z5ja.20`'s release target).
