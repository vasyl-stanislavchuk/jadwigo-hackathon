# packages/copy

Every string a person reads, in `pl` and `en`, as Paraglide JS messages with a reviewed flag per line.

- **Not here:** Strings that only a developer reads, such as log lines.
- **Owner:** the learner-experience workstream (`docs/workstreams/learner-experience.md`). The `site_*` keys are apps/site's.
- **Imports:** nothing of ours.
- **Public surface:** `src/index.ts`, and the compiled messages as `@jadwigo/copy/messages` and `@jadwigo/copy/runtime`. Other files are private to this package.
- **Test:** `bunx turbo run lint typecheck test --filter=./packages/copy` (lint runs `tools/src/check-copy.ts`)

## Where a line lives

- `messages/<locale>.json` is the source (`dl-5ssh.34.22`). A key with an adult line has a `category` selector (`category=adult`, and `category=*` for the child's); a list key such as `praise` has a `line` selector; a counted noun is its own `plural` selector.
- `messages/review.<locale>.json` holds each key's reviewed flag: one boolean, or one per variant.
- `messages/baseline.<locale>.json` holds a live language's lines that were unreviewed when the tables moved here. Nothing new goes in it.
- `src/paraglide` is compiled from them by `bun run messages`. It is committed and never edited by hand.
- `copy()` and `copyAt()` call the compiled messages. `TABLES`, `CATEGORY_TABLES` and `lookup` are a view read back from the JSON (`src/view.ts`).

## Rules here

- Add a key in `src/types.ts` (`COPY_KEYS`), in both `messages/{pl,en}.json` and in both review sidecars, then run `bun run messages` and commit `src/paraglide`.
- A new line ships with its flag `false` and is not baselined, so `check-copy` fails until the line is reviewed: only reviewed lines reach a family.
- Polish plurals have 4 forms (one, few, many, other), so never branch on `count === 1`. A plural message needs a variant for every CLDR form; `check-copy` fails a missing one.
