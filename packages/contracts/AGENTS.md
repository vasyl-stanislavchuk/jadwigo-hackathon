# packages/contracts

Zod schemas for everything that crosses a boundary: ids, the lesson script, answers, routes, errors.

- **Not here:** Logic beyond parsing. Any import of ours (dependency-cruiser fails it).
- **Owner:** the platform workstream (`docs/workstreams/platform.md`). **Filled by:** `dl-5ssh.34.5`.
- **Imports:** `zod` only.
- **Public surface:** `src/index.ts`, which includes `src/run.ts`, the AI engine's records, also exported on its own as `@jadwigo/contracts/run`. Their tables joined the snapshots and `RECORDS` (`src/tables.ts`) with their migration (`dl-z5ja.7`). Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/contracts`

## Rules here

- Every name, record and route follows [`RULES.md`](RULES.md), the data model and API rules. `src/naming.test.ts` fails the ones a machine can check.
- Ids are branded types; only the parsers here create them.
- `schemas/*.json` and `openapi.json` are snapshots. Changing one is a one-way door: update with `vitest -u` on purpose and say so in the PR.
- In a wave, contracts change only in the lead's step 0 PR.
- A route added to `ROUTES` brings its route key in `infra/terraform/main.tf` in the same PR, or
  `tools/src/check-infra-routes.ts` turns every PR after it red (`dl-5ssh.67`).
