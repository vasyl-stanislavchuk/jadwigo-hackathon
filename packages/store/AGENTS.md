# packages/store

The record store behind the `Store` interface: in memory today, Postgres next.

- **Not here:** Business rules (`packages/core`) and schemas (`packages/contracts`).
- **Owner:** the platform workstream (`docs/workstreams/platform.md`). **Filled by:** `dl-e8ov.5.34` maps the records, `dl-5ssh.34.34` adds the migrations.
- **Imports:** `contracts`, `config`.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/store`

## Rules here

- Unit tests use `InMemoryStore`. Anything touching Postgres is a `*.int.test.ts`, run with
  `DATABASE_URL=postgresql://localhost/jadwigo_test bunx turbo run test:int --filter=./packages/store`.
- Every query is scoped to one pod.
