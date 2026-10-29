# Add a language

Jadwigo speaks Polish and English only. That was decided in `2026-10-24-the-marketing-site-is-built-with-astro-polish-and-english-only-p` and `2026-10-26-jadwigo-carries-no-ukrainian-the-tables-stay-in-david-learns-and`. A 3rd language is the owner's call first. Once it is made, adding the language is data and review, with no code change outside the list in `packages/config/src/languages.ts`.

German (`de`) is the example below.

## Before

- The owner's decision to add the language is in the md context brain:
  `md context ask "is German in scope?" --project jadwigo-platform`.
- A native reader is named for samples, and their name is on the issue, never in the repo.

## Steps

1. Add `de` to `LANGUAGES` in `packages/config/src/languages.ts` with status `studio`, its name in German and its plural categories. `bunx turbo run test --filter=./packages/config` checks them against `Intl.PluralRules`. Mark every part `{ pending: "<issue>" }`, naming the issue that builds it.
2. Copy: `packages/copy/src/de.ts` holds every key and every plural category. Point `copy` at it.
3. Review: `workflows/_lang/de/` holds `checklist.md` (with sources), `style.md`, `glossary.md` and reviewed examples. Point `checklist` and `workflow` at them.
4. Number words: `packages/core/src/lang/de/`, with golden cases. Point `number_words` at it.
5. Run `bun tools/src/check-languages.ts`. A studio language passes with every part but the site.
6. Have the reviewer workflow pass the first batch of lines, then send the native reader samples.
7. Bank: run the translate workflow on the questions the lessons need, then review them.
8. A site only if German gets its own audience: a host in `packages/config`, `apps/site/src/content/de/` and its legal pages. Point `site` at the content.
9. Set the status to `live`. `make check` now fails until every part exists.

## After

`bun tools/src/check-languages.ts` passes with `de` live, and `make check` is green.

## Undo

Set the status back to `studio` or `dormant`. Nothing is served in a language that isn't `live`.
