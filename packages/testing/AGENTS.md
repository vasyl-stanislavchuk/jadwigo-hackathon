# packages/testing

Shared test setup: the unit guard on network, AWS and the clock; factories and fixtures.

- **Not here:** Anything production code imports (dependency-cruiser fails it).
- **Owner:** the platform workstream (`docs/workstreams/platform.md`). **Filled by:** `dl-5ssh.34.5` adds the factories and the golden corpus.
- **Imports:** anything; only test files import it.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/testing`

## Rules here

- `src/unit-setup.ts` runs before every unit test. Weakening it weakens every package's tests: one-way door.
- Fixtures are made up. Real learner data never goes in.
