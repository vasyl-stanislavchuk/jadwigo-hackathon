# tools

Repo scripts in TypeScript, run with bun, each with a test. `make check` runs them.

- **Not here:** App code, and one-off scripts nobody will run twice.
- **Owner:** the platform workstream (`docs/workstreams/platform.md`). **Filled by:** each script names its issue in its header.
- **Imports:** nothing of ours.
- **Test:** `bunx turbo run lint typecheck test --filter=./tools`

## Rules here

- A new check gets a planted-violation test, and a line in `lint:repo` in the root `package.json`.
- Run one with `bun tools/src/<name>.ts`; it prints its problems and exits 1.
