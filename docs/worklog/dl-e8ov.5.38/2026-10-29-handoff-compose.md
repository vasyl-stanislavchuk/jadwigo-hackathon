# Handoff: lane compose (`dl-e8ov.5.38.4`)

PR: https://github.com/vasyl-stanislavchuk/jadwigo-hackathon/pull/180 (draft, branch `compose`, commits `f113ed6`, `fe38fc9` and `33f6fc4` on main `93d86b5`).
Not marked ready, not merged. No bead was touched.

## What landed

- `apps/cli/src/jw/lesson.py` (new): `draft`, `check`, `lesson_file`, `card`, `card_text`, `check_script`.
- `apps/cli/src/jw/commands/lesson.py` (new): `jw lesson draft "<request>" --grade 3 (--name <n>... | --no-names) [--count n] [--kind k] [--skill s] [--json]`
  and `jw lesson check <draft.json> [--json]` (exit 1 when not ok). Registered in `cli.py`: the import line and one `add_command` line.
- `apps/cli/src/jw/commands/mcp.py`: `lesson_draft`, `lesson_check` in `TOOLS` (6 tools), and new `instructions=` and docstrings.
- `apps/cli/src/jw/settings_keys.py`: `JADWIGO_REPO_DIR` in `KEYS`, `LESSON_CHECK_SCRIPT`, `repo_dir()`. When the setting is unset, `repo_dir()` walks up from
  `settings_keys.py` to the folder that holds `packages/lesson-import`. One line in `apps/cli/.env.example`.
- `apps/cli/tests/test_lesson.py` (new, 16 tests), `apps/cli/tests/fixtures/lesson/` (new: `envelope.json`, `converted.json`
  with 11 items of our own and `fxc201` waiting, `rungs.json` with Polish rungs written by hand).
- `apps/cli/evals/compose/eval_real_items.py` (new): the eval on the owner's real items. Its name does not start with `test_`, so `pytest -q`
  never collects it and only naming it runs it. The fixture eval lives in `tests/test_lesson.py`, so CI runs it.
- `apps/cli/README.md`: the 3 new tools, the verbs, the setting, the 4-step flow, the tests.

`tests/test_mcp.py` was not edited. Its existing `names == sorted(TOOLS)` now covers 6 tools, and the MCP client call of
`lesson_draft` is in `tests/test_lesson.py`, which also asserts `len(TOOLS) == 6`.

## Shapes

Names (owner decision `jadwigo-hackathon/decisions/2026-10-29-lesson-draft-takes-the-family-s-names-from-the-calling-agent-and`):
`lesson_draft(request, grade, names, ...)`. `names` is required: a missing one is an error from the function and the tool,
and exit 2 from the verb. `draft` runs `pii.guard(request, names=pii.names_for(members=names))` and sends only the guarded
text as the search words. `request`, the skeleton's id, title and reasoning come from the guarded text (`[NAME_1]`). The names
and the raw request are never stored. Every `lesson.draft` call in the tests and the eval pins `today`. The 2 comparisons against
a child process (the verb and MCP) drop the dated id.

Draft (`lesson_draft`, `jw lesson draft --json`):

```text
{request (guarded), need{language, grade, words, skills?}, grade, language, kind, rule{...draw rule}, rule_settled: false,
 questions: [{step_id "q1".., item_id, set_id, skill (as drawn), skill_ids, skill_note?, family, question_type, say,
              question{family, data, key}, material{hints[], worked[]},
              help{look: null, boost: null, boost_by_mistake: {}, almost: null, worked: null, twin: null},
              credit{source, ref, url?, licence, original_lang, checked}, based_on{question "khan:<id>", changes[]},
              why_drawn}],
 left_out: [{id, reason}],
 lesson_file_skeleton: {id "<slug of request>-<yyyy-mm-dd>", title = request, language, category "child",
                        subject (from the pages, else math), reasoning (one English sentence), kind,
                        script{parts[{part: kind, steps[...]}]}}}
```

Refused items: the draw runs again with the refused ids in `flagged` until every drawn item loads. Each refused id's `left_out` reason
is replaced with the `load_item` error. The module docstring says why the draw runs again: the variety rule then holds over the
questions that are actually asked.

Filled help, as `check` reads it: `look` and `boost` as `{text}` or a bare string, `boost_by_mistake` as `{class: {text} | string}`,
`almost` and `worked` as a list of lines or one string split on newlines, and `twin` as `{say, family?, data, key}` or
`{say, question{...}}` (family defaults to the question's). The lesson file's `help` is the item's `hints` plus those rungs.

Check (`lesson_check`): `{ok: true, card, lesson_file, play_path, lesson_id, questions}` or `{ok: false, errors[{step_id, message}], lesson_file}`.
An empty rung or twin is an error before bun runs, with `lesson_file: null`. The file goes to `$TMPDIR/jw-lessons/<id>.json`.

Skill ids (owner decision 2026-10-29): `skill_ids` is the drawn skill with the bank's `proposed:` mark stripped. An id that
still fails SkillId (the draw's set-id fallback) gives `skill_ids: []` and a `skill_note`, never a compile error.

Card: `{questions: [{n, step_id, skill ("<id> (proposed)" when the bank marked it), prompt, key, rungs{look, boost, almost[], worked[]}, twin{prompt, key}, source "<source> <ref> <url>", licence, why_drawn}], left_out[]}`.
`prompt` is the say line, the stem text and the figure text, each once, joined with ` | `.
This is a dict holding `questions` and `left_out`, not the bare list the brief wrote.

## Commands run

- `cd apps/cli && uv run --frozen pytest -q`: 179 passed (`tests/test_lesson.py` 16, the 2 real `check.ts` tests included, bun on PATH).
- `make check` at the worktree root: exit 0 (turbo lint, typecheck and test; repo checks; knip; depcruise).
- `JW_KHAN_CONVERTED=/Users/vasyl/projects/david-learns/media/khan/converted-pl.json JADWIGO_BANK_DIR=/Users/vasyl/projects/jadwigo-bank uv run --frozen pytest -q evals/compose/eval_real_items.py`:
  1 passed, each of the 6 steps with a skill id, for example `maths.multiplication.multiply-by-tens`. 6 real items were drafted from `set_khan_3006` and `set_khan_xf17a412b735ff07d` (enter, choose, group/match), and the real `check.ts` gave `ok: true`.
  The search was stubbed with the bank checkout's grade 3 multiplication sets. The rungs were one placeholder line each, written in memory.
- The same eval without the env: `SKIPPED ... JW_KHAN_CONVERTED names no converted items file`.

Not run: `make lesson-import` and any write to jadwigo-dev or prod; the real bank search (`JW_API_URL`); any model.

## For the lead

1. **Real skill ids: settled.** The owner decided on 2026-10-29 that jw strips `proposed:`. `fe38fc9` does it in `lesson._skill_ids`, and the
   card's `skill` reads `<id> (proposed)`. The contract is untouched.
2. (Filed by the lead as a follow-up.) The card's `prompt` for real enter items shows the TeX figure as it is (`$\Huge{\blue{60} \cdot ...}$`). That is readable to the
   agent, less so to a parent, and a rendering is a later step.
3. (Filed by the lead as a follow-up.) `reasoning` is a tool-written English sentence. The agent may rewrite it, or the title, in `lesson_file_skeleton` before `lesson_check`.
   `check` takes the file-level fields from the skeleton and the steps from `questions[]`.
4. In `apps/cli/.env.example` I touched the one line the brief's "Since" section asked for. In `cli.py` I touched 2 lines: the import
   and the `add_command`.

## For the owner: getting a lesson in Claude Code

Register the server once. These are the README's lines, plus the items file:

```sh
claude mcp add --scope user --transport stdio \
  -e JADWIGO_BANK_DIR=/Users/vasyl/projects/jadwigo-bank \
  -e JW_KHAN_CONVERTED=/Users/vasyl/projects/david-learns/media/khan/converted-pl.json \
  jadwigo -- uv --directory /Users/vasyl/projects/jadwigo-hackathon/apps/cli run jw mcp serve
```

The bank URL and token come from `~/.config/jadwigo-bank/bank.env`, as for `question_search`. Then type in Claude Code, with the child's name in place of `<imię dziecka>`:

> Przygotuj lekcję dla <imię dziecka>: 6 zadań z mnożenia, klasa 3. Użyj lesson_draft i podaj w names wszystkie imiona z prośby (<imię dziecka>, rodzeństwa, moje), napisz wszystkie podpowiedzi i bliźniaka po polsku, sprawdź lesson_check i pokaż mi kartę.

Read the card, then, from the repo root: `make lesson-import FILE=<lesson_file from the card> ENV=dev`, and open the card's `play_path` on jadwigo-dev.
