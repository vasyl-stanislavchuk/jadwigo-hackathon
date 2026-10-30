# apps/web

The app at app.jadwigo.pl: the lesson player and the parent screens.

- **Not here:** Marketing pages (`apps/site`), strings (`packages/copy`), shared parts (`packages/ui`).
- **Owner:** the learner-experience workstream (`docs/workstreams/learner-experience.md`). **Filled by:** `dl-5ssh.34.6` moves it in from david-learns' frontend.
- **Imports:** packages: `api-client`, `lesson-kit`, `ui`, `copy`, `config`, `contracts`, `core` (the conformance page's key check, `dl-a38n.32.2`), and `lesson-import` through its browser-safe `@jadwigo/lesson-import/file` entry only (the lesson builder).
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./apps/web`

## Rules here

- Talk to the API only through `packages/api-client`.
- Every string a person reads comes from `packages/copy`, in `pl` and `en`.
- Playwright runs in CI, not in your session.
