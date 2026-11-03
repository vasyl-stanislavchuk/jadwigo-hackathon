# apps/print

The print Lambda (`dl-1eieq.8.2`, epic `dl-1eieq.8`): one container Lambda that draws a lesson's
`PrintSheet` as a compact A4 PDF a child of 6 to 10 answers in place. WeasyPrint lays out HTML
and CSS that Jinja renders from the sheet. Python 3.12, a uv project.

- **Not here:** TypeScript. Its `package.json` exists only so turbo runs its tests.
- **Owner:** the print epic's lane "paper". The API's print route (`dl-1eieq.8.4`) is its only caller.
- **Imports:** nothing of ours. `src/printer/sheet.py` mirrors the contract's snapshot,
  `packages/contracts/schemas/print-sheet.json`, and `tests/test_sheet.py` fails when they part.
- **Test:** `cd apps/print && uv run --frozen pytest -q`. **See it:** `make -C apps/print sample`
  draws `tests/fixtures/mixed-20.sheet.json` (the lead's fixture, `dl-1eieq.8.1`) and opens it.

## The wire (decision `dl-o05aa`)

```
event:   {"bucket", "key"}                key exactly pods/<pod>/prints/<id>.json, id = 64 hex
success: pods/<pod>/prints/<id>.pdf        metadata pages=<n>
failure: pods/<pod>/prints/<id>.error.json {"code": "invalid_sheet" | "render_failed"}
refusal: raises Refused("bad_event") and writes nothing
```

- The API invokes it with InvocationType Event and polls S3, so the return value is only for logs.
- A PDF already there is not drawn again. An S3 error raises, so Lambda's retry tries again.
- Every object it writes carries the tag `kind=print`; the uploads bucket expires tagged objects
  after 30 days (`dl-1eieq.8.3`). The API tags the sheet it puts the same way.

## How a page is built

- `src/printer/geometry.py` is the only place a size is written: the page, margins, type sizes,
  every box, figure and gap. `templates/paper.css.j2` and the SVG macros read it through `geom`;
  `test_no_template_writes_a_size` fails on a `mm`, `pt` or `px` written in a template.
- One question is one card, `break-inside: avoid`. Two half-width questions in a row share it, left
  then right; the lesson's order never changes (`render.rows_of`).
- Two layouts (`render.render`): the flow, then page breaks moved to where the paper action changes
  when that keeps the page count (`plan_breaks`), with the last page's footer (no "dalej").
- `templates/forms/<family>.html.j2` holds one macro per question type; `test_declaration.py` fails
  when a type with a paper form has none. `explain` has no paper form (`render.NO_PAPER`).
- Lesson words reach paper only through `sheet.html` (the builder's drawn HTML, KaTeX included) or
  escaped. Pictures only from the sheet's one media origin, and fonts only from
  `src/printer/assets/`: `AllowlistFetcher` refuses everything else and follows no redirect.

## Rules here

- Pin dependencies exact in `pyproject.toml`, each with a comment naming what needs it, and lock
  with `uv lock --exclude-newer <7 days ago>` (Renovate's hold).
- The layout tests need pango and skip where it is missing (`conftest.needs_pango`); on a Mac,
  `brew install pango`. `printer/_macos.py` finds Homebrew's libraries, because `uv run` drops
  `DYLD_FALLBACK_LIBRARY_PATH`.
- Unit tests never fetch: `conftest.offline_fetcher` serves the sheet's pictures from memory.
- Sheets are built in code or come from the lead's generated fixture. No real lesson, no bank text.
- Log ids, counts, times and outcomes. Never a word of the sheet.
- The image is the owner's: `make image image-check push`, then the tag goes into
  `infra/terraform/environments/prod.tfvars` as `print_image_tag` (`dl-1eieq.8.5`).
