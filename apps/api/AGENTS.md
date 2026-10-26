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
