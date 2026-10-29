# packages/lesson-kit

Interaction families and the lesson blocks built on them.

- **Not here:** Grading (`packages/core`) and app screens (`apps/web`).
- **Owner:** the learner-experience workstream (`docs/workstreams/learner-experience.md`). **Filled by:** `dl-5ssh.34.6`, then the question types epic `dl-w3`.
- **Imports:** `contracts`, `core`, `ui`, `copy`.
- **Public surface:** `src/index.ts`, and `src/families/questionTypes.ts` as `@jadwigo/lesson-kit/question-types`: the catalog alone, for a build-time reader such as apps/docs (`dl-5ssh.90.9`). It imports only pure values, never React, KaTeX, dnd-kit or CSS. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/lesson-kit`

## Rules here

- A new block follows the lesson block contract in `packages/contracts`.
- Text a child reads is short and kind, and never a bare "wrong".
