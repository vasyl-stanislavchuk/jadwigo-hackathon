# packages/api-client

The typed client that the web app, the CLI and MCP share.

- **Not here:** Retry policy for one caller, or UI state.
- **Owner:** the platform workstream (`docs/workstreams/platform.md`). **Filled by:** `dl-5ssh.34.5`, with the routes.
- **Imports:** `contracts`.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/api-client`

## Rules here

- Types come from the contract schemas, never written by hand.
- Unit tests stub `fetch`; real HTTP is a `*.int.test.ts`.
