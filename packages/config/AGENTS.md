# packages/config

Hosts and languages for every environment, the one source.

- **Not here:** Secrets, and anything read from the environment at runtime.
- **Owner:** the platform workstream (`docs/workstreams/platform.md`). **Filled by:** `dl-w0b4.2` (hosts and generated tfvars), `dl-5ssh.34.20` (languages).
- **Imports:** nothing of ours.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/config`

## Rules here

- A domain name written anywhere else is a bug; import it from here.
