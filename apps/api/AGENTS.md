# apps/api

The one Lambda: a router, `authorize()` and the routes, with an entry per function.

- **Not here:** Business rules (they go in `packages/core`) and SQL (it goes behind `packages/store`).
- **Owner:** the platform workstream (`docs/workstreams/platform.md`). **Filled by:** `dl-5ssh.2` deploys it; the routes come with their contracts.
- **Imports:** packages: `contracts`, `core`, `store`, `config`. Never another app.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./apps/api`

## Rules here

- Every route's input and output is a schema in `packages/contracts`; the handler parses, never trusts.
- `authorize()` runs first on every route, and a pod only ever sees its own records.
- Read environment variables only in `src/config.ts` (the grit rule fails elsewhere).
- `authorize()` binds an attempt to its caller, not only to the pod: row-level security scopes by pod alone, so within a pod any attempt id would read that attempt's answers.
- The page reads `ended` through `pageEnded(ended, verdictsHeld(assignment, attempt))` in every reply (snapshot, answer, help, results), and the results route returns `pageAttemptResult` rows, never the `attempt_result` row. While verdicts are held, the answer reply's `correct`, `parts` and `reveal` are null.
- `knip.json` ignores `@aws-lambda-powertools/event-handler` until `dl-e8ov.2.32.6` registers the routes on it; that issue removes the line.
