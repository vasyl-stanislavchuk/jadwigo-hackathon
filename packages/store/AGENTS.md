# packages/store

The record store behind the `Store` interface: `InMemoryStore`, the shared contract suite, and
`PostgresStore` on Kysely (`dl-e8ov.2.32.3`).

- **Not here:** Business rules (`packages/core`) and schemas (`packages/contracts`).
- **Owner:** the platform workstream (`docs/workstreams/platform.md`). **Filled by:** `dl-e8ov.2.32.1` (the interface, InMemoryStore, the suite), `dl-e8ov.2.32.3` (PostgresStore).
- **Imports:** `contracts`, `config`.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/store`

## Rules here

- Unit tests use `InMemoryStore`. Anything touching Postgres is a `*.int.test.ts`, run with
  `make migrate && bunx turbo run test:int --filter=./packages/store`.
- Every method but the 2 pod lookups is scoped to one pod, as row-level security scopes the database.
- `src/store.contract.ts` is the one suite every Store passes. It is frozen for the lanes of wave
  `dl-e8ov.2.32-1`: a gap in it goes to the lead.
- The store keeps the database's rules (keys, write-once, append-only) and no course logic.
- `knip.json` ignores `kysely` until `dl-e8ov.2.32.3` uses it; that issue removes the line.
