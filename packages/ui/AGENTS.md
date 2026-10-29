# packages/ui

Design tokens, primitives and the parts the web app and the site share.

- **Not here:** Business logic and data fetching.
- **Owner:** the learner-experience workstream (`docs/workstreams/learner-experience.md`). **Filled by:** `dl-5ssh.34.6`.
- **Imports:** `copy`.
- **Public surface:** `src/index.ts`, `src/styles/tailwind.css` as `@jadwigo/ui/styles.css`, and `src/styles/foundation.css` as `@jadwigo/ui/foundation.css`: Zeszyt's tokens alone, for a build-time reader such as apps/docs (`dl-5ssh.90.9`). Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/ui`

## Rules here

- Components are `.tsx` on React 18.3.1 (`tsconfig.dom.json`), tested as `*.test.tsx` in Vitest's `dom`
  project with Testing Library. Query the way a person would (role, text), never by class name.
- The playground's primitives, shadcn/ui and Tailwind come with `dl-5ssh.34.6`. OPEN: theme, sound and
  motion packs wait on the engagement epic (`dl-7wlo`); the can-do card is out of scope
  (`jadwigo-learner-experience/decisions/2026-10-27-the-can-do-card-and-the-look-back-review-at-a-lesson-s-end-are-o`).
