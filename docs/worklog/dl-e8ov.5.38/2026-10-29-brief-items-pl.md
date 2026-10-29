# Lane items-pl: Polish item bodies as family steps, outside git (dl-e8ov.5.38.1)

You are the items-pl lane of wave 1 of epic `dl-e8ov.5.38`. Your worktree is
`/Users/vasyl/.md/worktrees/jadwigo-bank/items-pl` (repo jadwigo-bank, branch `items-pl`, cut
from `main`). Run every command from there. Never cd into `~/projects/jadwigo-bank` or another
worktree. The jadwigo-hackathon repo is not yours to edit.

## Read first

1. jadwigo-bank's own `AGENTS.md` or `CLAUDE.md` at the worktree root, and `tools/khan/` (its
   README or header comments; `paths.py` names `KHAN_DIR`, the parsed pull outside git at
   `~/projects/david-learns/media/khan`, with `<KHAN_DIR>/<lang>/items` per language and
   `converted.json` in `KHAN_DIR` itself).
2. The bead: `bd -C ~/projects/david-learns/.beads show dl-e8ov.5.38.1`. Read it, never write it.
3. The wave plan: `/Users/vasyl/.md/worktrees/jadwigo-hackathon/lesson-draft-lead/docs/worklog/dl-e8ov.5.38/2026-10-29-wave-1.md`.
   Its "Lead decisions" 4 touches you: every converted item carries `credit.licence`.
4. `tools/khan/to_family.py` here, and its origin and test in david-learns, `scripts/khan/to_family.py`
   and the test beside it (`~/projects/david-learns/scripts/khan/`), read-only.
   `docs/research/khan-academy-question-types.md` section 3 in david-learns (`~/projects/david-learns/docs/research/`), read-only.
5. The set pages: `sets/khan/math/grade-3/*.json` here, `items.ids` on each (Khan ids, shared by
   `pl` and `en`), and `sets/khan/math/grade-3/index.json`.

## Scope

Run the same widget-to-family conversion `to_family.py` does for English on the raw Polish items,
for exactly the ids the klasa 3 set pages list, and write the result outside git.

- Input: `<KHAN_DIR>/pl/items/*` (6,944 raw Polish items) filtered to the union of `items.ids`
  across `sets/khan/math/grade-3/*.json`.
- Output: `<KHAN_DIR>/converted-pl.json`, beside `converted.json` and in the same shape:
  `{"generated_by", "licence_note", "items": [...]}`; each item in `converted.json`'s item shape
  (`id, family, problem_type, grade, language: "pl", question, spec{data, family, help, id, key,
  phase, question_type, say}, credit{...}`, the course fields), with `credit.original_lang: "pl"`
  and **`credit.licence`** set on every item (the same licence text `to_family.py` writes into the
  file's `licence_note`; the contract `Credit` in jadwigo-hackathon requires it per item).
- Beside it, `<KHAN_DIR>/converted-pl.refused.json`: every id the sets list that did not convert,
  with the reason (`no Polish raw item`, `widget <x> unsupported`, `pl differs from en` ...).
- The run prints, per klasa 3 set, converted and refused counts, and the totals.
- Deterministic, no model calls, no network.
- The twin check: for each id, the English converted item (`converted.json`) and the Polish one
  must agree on `spec.key` and on the numbers in `spec.data` (the bead's stop rule). An item that
  differs is refused with reason `pl differs from en` and listed, never guessed.

Where this lives: a `--lang pl` path (or a sibling entry point) in `tools/khan/to_family.py` and
the Makefile or script that runs it, in the style the tool already has. If `to_family.py` is
already language-aware, the work is the output file, the licence field, the twin check and the
refusal list.

## Owns

`tools/khan/` (the Polish path, its entry point, a test and 3 fixture items of our own under the
tests folder the repo uses), the Makefile target or script that runs it, and the gitignored
outputs `converted-pl.json` and `converted-pl.refused.json` under `KHAN_DIR`.

## Must not touch

`sets/**`, `needs/**`, `evals/**`, `index/**`, anything in jadwigo-hackathon or david-learns,
and anything that would commit a file under `media/` or a Khan item's text. Check `git status`
before every commit: nothing under `media/` or with a Khan item body may be staged.

## Fixtures

3 Polish raw items of our own making in the raw shape `to_family.py` reads (a multiplication, an
addition with a picture-free widget, one that must be refused), their expected family steps, and
the test that converts them byte-for-byte (compare the JSON after `json.dumps(sort_keys=True)`).
No Khan text, no real Khan id, no family member's name.

## Done when (run these, keep the output for the PR)

- The repo's test command (its `Makefile` `check` or `uv run pytest -q tools/khan`) is green, with
  the new test converting the 3 fixtures to exactly the expected output.
- The real run over the klasa 3 sets finishes and prints converted and refused counts for every
  set and the totals; `converted-pl.json` exists in `KHAN_DIR`, every item has `language: "pl"`,
  `credit.original_lang: "pl"` and `credit.licence`; `converted-pl.refused.json` names every
  missing id with a reason. Quote the totals in the PR, never an item's text.
- `git status` shows nothing under `media/` and no new large file; `git diff --stat main` lists
  only `tools/khan/` and the runner.

## Stop if

A Polish item's ids, keys or numbers differ from its English twin for more than a handful of items
(say 5% of a set): stop converting that set, report the list in the handoff, and go on with the
others. `to_family.py` cannot read the Polish raw shape at all. The same step failed 3 times with
no new information.

## How you ship

- Stage by name, commit on `items-pl`, push it if the repo has a remote, and open a draft PR titled
  `dl-e8ov.5.38.1: Polish item bodies as family steps, outside git` with
  `gh pr create --draft --body-file <file>`, body with an `Issue:` line, `## Summary`,
  `## Evidence` (before and after: the counts), `## Merge Danger` with a literal `**Door:** two-way`
  line and a blast radius. If the repo has no remote or no GitHub, commit and say so in the handoff.
- Never: merge, `gh pr ready`, `bd update`, `bd create`, publish, call a model, commit anything
  under `media/`.
- End by writing `/Users/vasyl/.md/worktrees/jadwigo-hackathon/lesson-draft-lead/handoffs/items-pl.md`:
  what landed, the exact output paths and the item shape (one field list, no item text), the
  counts per set, the commands that ran with results, what did not run, the PR link or the commit,
  anything for the lead. Then say `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_DECISIONS` or `BLOCKED`.
