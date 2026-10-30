# dl-a38n: handoff to the bank session, render conformance inside ingestion and indexing

Read this top to bottom; it is the whole prompt. Then `bd -C ~/projects/david-learns/.beads show dl-a38n.32`
and follow it. The runner it builds on is `dl-a38n.31` (this repo, lane bank of wave 2).

## Why

The owner, 2026-10-30, after the first live run of the lesson builder: a recognition question copied
from the bank passed the contract and `lesson_check` with 0 findings and drew each option as one
fragment per line. "Copy then adapt only works if a copied item already renders right; this should be
a requirement for each question we add to the bank." Recorded as
`jadwigo-question-bank/decisions/2026-10-30-a-question-enters-the-bank-only-when-it-already-renders-right-*`.
It builds on `jadwigo-ai-workflows/decisions/2026-10-30-lesson-from-the-bank-copies-the-bank-question-whole-then-adapts`:
`lesson_draft` copies a bank question whole, so the bank is the place to guarantee the render.

## The rule

A question enters the bank only when it renders right in its question type. "Renders right" is
decided by one set of render rules, the same the builder runs on a draft (`dl-a38n.28`:
`renderFindings(root, step)` in `apps/web/src/playground/lesson/render/rules.ts`, rules named
`render-split-inline`, `render-raw-tex`, `render-picture-missing`, `render-empty-option`,
`render-overflow`). An error-level render finding refuses the item; a warn is kept on the item.

## Where the check goes (the path today, and the hook at each step)

1. **Conversion**, `jadwigo-bank/tools/khan` (Python; the Polish conversion writes
   `converted-pl.json`, read by jw through `JW_KHAN_CONVERTED`). Hook: after conversion, the runner
   (`dl-a38n.31`, `tools/conformance/run.ts` in this repo, driving `/playground/conformance` in headless
   Chromium) runs over the new items and writes a sidecar beside the file, `converted-pl.render.json`:
   `{items: {<item_id>: {render_ok, findings[]}}, rules_version, ran_at}`. Conversion's own report
   prints the refused count by rule. The sidecar never enters git (`tools/src/check-no-bank.ts`).
2. **Import**, `packages/bank` (import) and the Python service in `jadwigo-bank` that serves
   `local`/`remote` search at `JW_API_URL`. Hook: an item without a verdict, or with an error-level
   finding, is refused by the import with the rule and the fix printed; the verdict is stored on the
   item (`render_ok`, `render_rules_version`).
3. **Indexing and search.** Hook: the index carries `render_ok`; `POST /api/v1/question-searches`
   returns only `render_ok` items by default (a `include_failing` flag for the gallery and the
   conformance route). `packages/bank`'s `bankContract` (`src/conformance.ts`) gains the case: a
   failing item planted in the fixture never comes back from a search.
4. **The draw and the draft**, `apps/cli/src/jw/draw.py` and `lesson.py`. Hook: an item that is
   not `render_ok` is skipped with `left_out` reason `renders wrong: <rule>`; `question_gaps` reports
   a set whose items are all failing as a gap with that reason.
5. **Backfill.** Run the runner over the 697 Polish items once, quarantine the failures (the sidecar
   is the quarantine), print the count by shape, and file one bead per shape with
   `jw question-type feedback <type> "<shape>"` so the converter is fixed where it matters most; the
   first shape is inline TeX inside option text (`render-split-inline`).

## What you own, and what you do not

- Yours: `packages/bank/**`, the bank routes in `apps/api`, `apps/cli/src/jw/draw.py` (the skip and
  its reason), `question_gaps`, and in `jadwigo-bank`: `tools/khan` and the Python service.
- Not yours: the render rules (`apps/web/src/playground/lesson/render/rules.ts`, lane web) and the
  runner (`tools/conformance/`, `dl-a38n.31`); a gap in a rule is a bead against `dl-a38n.28`,
  not an edit. `packages/contracts` changes are the platform lead's call: if the envelope needs
  `render_ok`, ask first and say which snapshot moves.

## Done when

- `bun tools/conformance/run.ts --items <converted-pl.json>` writes the sidecar; an item with a
  planted inline-TeX option is refused by the import with `render-split-inline` named.
- A fixture search never returns a planted failing item (`bankContract` case).
- `lesson_draft` on a request whose top set is all failing routes round it, `left_out` says why.
- The backfill run over the Polish items prints the quarantined count by shape, and one bead per
  shape exists with its count.
- `make check` exits 0 (the bank runs stay out of it).

## Stop if

The render rules do not exist on `main` yet (`dl-a38n.28` open): build the hooks against the
sidecar's shape and stop before the backfill. A contract snapshot must move: ask the platform lead.
The Python service needs a migration of its index: say so on the bead with the exact command.
