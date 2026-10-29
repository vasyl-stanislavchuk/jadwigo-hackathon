# packages/ui

Design tokens, primitives and the parts the web app and the site share.

- **Not here:** Business logic and data fetching.
- **Owner:** the learner-experience workstream (`docs/workstreams/learner-experience.md`). **Filled by:** `dl-5ssh.34.6`.
- **Imports:** `copy`.
- **Public surface:** `src/index.ts`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/ui`

## Rules here

- Components are `.tsx` on React 18.3.1 (`tsconfig.dom.json`), tested as `*.test.tsx` in Vitest's `dom`
  project with Testing Library. Query the way a person would (role, text), never by class name.
- Tokens are one tree, Zeszyt, at `:root` (`src/styles/foundation.css`): literal colours only among
  the `--jw-p-*` primitives, roles named for meaning, aliases the parts read. Lesson behaviour rules
  stay under `[data-lesson-theme]`; the playground's chrome stays neutral under `html[data-playground]`.
- A component writes a utility (`bg-jw-act`, `text-jw-body`, `min-h-kid-tap`; `src/styles/tailwind.css`
  `@theme inline`), never a literal colour, a px or rem, a palette class or a `var()` in a class.
  `src/tokens.test.ts` fails one (the rules are `@jadwigo/testing`'s); `tokens.allow.json` beside it
  lists what is still being removed, and only shrinks (`dl-uukj.32`).
- Green means right, red means a miss, and nothing else wears them; a pick is its own blue; the
  action is neither. A tap target in a lesson is at least `--kid-tap-min`; a settings or navigation
  control is 48 (`--jw-control-height`).
- The playground's primitives, shadcn/ui and Tailwind come with `dl-5ssh.34.6`. OPEN: theme, sound and
  motion packs wait on the engagement epic (`dl-7wlo`); the can-do card is out of scope
  (`jadwigo-learner-experience/decisions/2026-10-27-the-can-do-card-and-the-look-back-review-at-a-lesson-s-end-are-o`).
