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
- Every method but the 2 pod lookups and `openAttempt` is scoped to one pod, as row-level security scopes the database.
- A request runs as one `unit()`: on Postgres one transaction on one connection, the pod set when
  it changes, rolled back on a throw (`dl-e8ov.2.32.40`). A read inside a unit that must see
  another request's writes takes a lock first, in a statement of its own.
- `src/store.contract.ts` is the one suite every Store passes. It is frozen for the lanes of wave
  `dl-e8ov.2.32-1`: a gap in it goes to the lead.
- The store keeps the database's rules (keys, write-once, append-only) and no course logic.
- `knip.json` ignores `kysely` until `dl-e8ov.2.32.3` uses it; that issue removes the line.
