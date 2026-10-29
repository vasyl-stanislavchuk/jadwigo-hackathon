# Lane compose: `lesson_draft`, `lesson_check`, the card and the compose eval (dl-e8ov.5.38.4)

You are the compose lane of wave 2 of epic `dl-e8ov.5.38`. Your worktree is
`/Users/vasyl/.md/worktrees/jadwigo-hackathon/compose` (branch `compose`, cut from `main` after
PR #152 (`jw question item`) and PR #153 (`lesson-import check` and `import`) merged). Run every
command from there. Never cd into another worktree or the main checkout.

## Since the brief was drafted (read this first)

- Your worktree is on main `93d86b5`. PR #178 (`dl-n9fr.47`) gave `jw` one settings loader:
  `settings_keys.setting(name)` reads the environment, then `~/.config/jadwigo-bank/bank.env`, then
  the default; every key is listed in `KEYS` and documented in `apps/cli/.env.example`.
  `JW_KHAN_CONVERTED` already exists there (default `<JADWIGO_KHAN_DIR>/converted/pl.json`). Add
  `JADWIGO_REPO_DIR` the same way: in `KEYS`, read through `setting()`, one line in `.env.example`.
- The Polish items on the owner's machine are at
  `/Users/vasyl/projects/david-learns/media/khan/converted-pl.json` (697 items, 670 play, 27 wait
  with `status.kind: waiting` and `spec: null`). Unit tests use fixtures only. The integration eval
  sets `JW_KHAN_CONVERTED` to that path and is skipped, with a one-line reason, when the file is
  absent. It never copies an item's text into the repo.
- Items whose hint picture has no alt text are already refused upstream by the Polish conversion
  (they are not in `converted-pl.json`), and that stays so for this slice: nothing for you to filter,
  and no fallback to the English file for them.
- `load_item` raises `JwError` for a waiting item. Your draft puts such an item in `left_out` with
  the status reason and draws on.

## Read first

1. `AGENTS.md` at the worktree root, `apps/cli/AGENTS.md`, `apps/cli/README.md`.
2. The wave plan `docs/worklog/dl-e8ov.5.38/2026-10-29-wave-1.md` (on main once PR #151 merges;
   else in the lead's worktree `/Users/vasyl/.md/worktrees/jadwigo-hackathon/lesson-draft-lead/docs/worklog/dl-e8ov.5.38/2026-10-29-wave-1.md`).
   Lead decisions 1 and 3 touch you.
3. The bead: `bd -C ~/projects/david-learns/.beads show dl-e8ov.5.38.4`. Read it, never write it.
4. The code you compose from:
   - `apps/cli/src/jw/draw.py`: `draw(envelope, pages, *, kind, history, language, today, flagged,
     rules) -> Draw{kind, rule, rule_settled, questions[Drawn{item_id, set_id, problem_type, text,
     skill, reason}], left_out[Left{id, reason}]}`. `rule_settled` is false and stays on your output.
   - `apps/cli/src/jw/commands/question.py`: `search_envelope(...)`, `show_page(set_id)`.
   - `apps/cli/src/jw/items.py`: `load_item(item_id, language="pl")`, the composer's view:
     `{id, language, family, problem_type, question_type, say, question{family, data, key, help},
     credit{source, ref, url?, licence, original_lang, checked}, based_on{question: "khan:<id>",
     changes: []}, course{...}}`. It raises `JwError` for a waiting item (`spec` null) and a missing
     file; `language "multi"` items read as any language.
   - `apps/cli/src/jw/commands/mcp.py`: `TOOLS`, `_call`, the 4 tools. `apps/cli/src/jw/contracts/need.schema.json`.
   - `packages/lesson-import/src/lesson-file.ts` (the file you assemble: `id` lowercase words and
     dashes, `title`, `language`, `category`, `subject`, `reasoning`, `kind`, `script.parts[].steps[]`
     each `{id, question_type, skill_ids, based_on, say, question{family, data, key, help}, credit}`;
     `help` holds the rungs `look, boost, almost, worked` plus `hints`, and `help.twin` is a question
     with its own `say`), `compile.ts` (what it refuses), and `packages/contracts/src/families/help.ts`.
   - `packages/lesson-import/src/check.ts`: `bun packages/lesson-import/src/check.ts <file> --json`
     prints `{"ok": boolean, "errors": [{"step_id": string|null, "message": string}], "play_path":
     "/play/asg_…"|null, "lesson_id": "les_…"|null, "questions": number}`. A parse failure lists every
     problem, a compile failure the first.
   - The help ladder rule: `~/projects/medallion-context/david-learns/decisions/2026-10-16-help-ladder-the-planner-writes-every-rung.md`
     (read-only). The rungs are written by the composing agent, never by the tool. Its D4 is what
    the agent fills: rung 1 `look` (look again, costs nothing), rung 2 `boost` plus a
    `boost_by_mistake` card per likely mistake class, rung 3 `almost` (the worked solution with its
    last line blank), rung 4 `worked` (the whole solution) and the `twin` from the same template.
    The draft's empty `help` names all 5 keys plus `boost_by_mistake: {}`, so the agent sees what
    to write, and the tool docstring says it in one sentence.
   - `apps/cli/tests/fake_bank.py`, `tests/fixtures/bank/`, `tests/fixtures/items/converted.json`,
     `tests/test_draw.py`, `tests/test_mcp.py`: the fixtures and the test patterns you extend.

## Scope

Two MCP tools and the module behind them. The tools read, draw, assemble and check. The calling
agent writes every word a child reads (the 4 rungs and the twin).

- `apps/cli/src/jw/lesson.py`:
  - `draft(request: str, grade: str, language="pl", kind="practice", count=None, skills=())`:
    writes the need(s) (words from the request, grade, language, skills if given; shape
    `contracts/need.schema.json`), calls `search_envelope`, fetches each row's page with
    `show_page`, calls `draw(...)` with the practice rule (a `count` overrides the rule's count
    through `rules=`), loads each drawn item with `load_item`, and returns the draft:
    `{"request", "need", "grade", "language", "kind", "rule", "rule_settled": false,
    "questions": [per drawn item: {"step_id", "item_id", "set_id", "skill", "family",
    "question_type", "say", "question": {family, data, key}, "material": {"hints": the Khan hints
    from help, "worked": ...}, "help": {"look": null, "boost": null, "almost": null, "worked":
    null, "twin": null}, "credit", "based_on", "why_drawn": reason}], "left_out": [{id, reason}],
    "lesson_file_skeleton": the lesson-file.ts shape with those steps and empty rungs}`. An item
    `load_item` refuses (waiting, missing) goes to `left_out` with its reason, and the draw is
    asked for enough items that the count still comes out when possible (draw again with the
    refused ids in `flagged`, or over-draw and trim; say which in the module header).
  - `check(draft_with_help: dict, *, runner=None) -> dict`: assembles the lesson file from the
    draft after the agent filled `help` (rungs as `HelpCard` `{text}` objects, `worked`/`almost` as
    lists of lines, `twin` as a question with `say`), writes it to a temp file, runs
    `bun <JADWIGO_REPO_DIR>/packages/lesson-import/src/check.ts <file> --json` through `runner`
    (default: `subprocess.run`; tests pass a stub), and returns either `{"ok": true, "card": [...],
    "lesson_file": path, "play_path", "lesson_id", "questions"}` or `{"ok": false, "errors": [...]}`.
    The lesson file's `id` is lowercase words and dashes from the request plus the date
    (`mnozenie-klasa-3-2026-10-29`), `title` from the request, `category`/`subject` from the sets'
    pages, `reasoning` one sentence naming the request and the draw, `kind` the draw's.
  - The card: per question `{"n", "prompt" (the say and the stem text), "key", "rungs": {look,
    boost, almost, worked}, "twin": {prompt, key}, "source": credit.source + ref + url, "licence",
    "why_drawn"}`, plus `left_out`. Readable as JSON; also a `card_text(card) -> str` that prints
    it as plain lines for `--json`-less verbs.
  - `JADWIGO_REPO_DIR` in `settings_keys.py`: the jadwigo-hackathon checkout `check.ts` lives in,
    default the repo this `jw` was installed from (walk up from `jw/__init__.py` to the folder
    holding `packages/lesson-import`). A missing `bun` or `check.ts` is a `JwError` with the
    setting in its hint. A tool's own text to the agent (docstrings, errors) is in English; the
    lesson's words are the agent's, in `language`.
- `commands/mcp.py`: `lesson_draft(request, grade, language="pl", kind="practice", count=None,
  skills=None)` and `lesson_check(draft)` tools, added to `TOOLS`. Rewrite the server's
  `instructions=` string once for all 6 tools, and the docstrings: `lesson_draft` says the agent
  writes `help` rungs and the twin for every question and then calls `lesson_check`; `lesson_check`
  says what the card is and that an `ok: false` lists errors by step id to fix and call again.
- `commands/lesson.py` only if a verb is useful for testing (`jw lesson draft`, `jw lesson check`);
  register it in `cli.py` if you add it. Same pattern as `question.py`: one function the verb
  prints and the tool returns.
- `apps/cli/README.md`: document the 3 new tools (`question_item`, `lesson_draft`, `lesson_check`)
  and the flow: ask, write the rungs, check, `make lesson-import FILE=<lesson_file> ENV=dev`.
- The eval, `apps/cli/evals/compose/` (or under `tests/` if the repo prefers; say where in the
  handoff): a fixture request ("6 zadań z mnożenia, klasa 3") against `fake_bank` and the fixture
  items, a fixture set of rungs written in Polish for our own small bank's items (no Khan text),
  run through `check` with the real `check.ts` in one marked integration test and a stub in the
  unit test. The eval asserts: every question cites `source` and `credit.licence`, `rule_settled`
  is false, every drawn item has a `why_drawn`, every left-out one a reason, and `check` returns
  `ok: true` with a `play_path`.

## Owns

`apps/cli/src/jw/lesson.py` (new), `apps/cli/src/jw/commands/mcp.py`, `apps/cli/src/jw/commands/lesson.py`
(new, optional) and the one line in `cli.py` that registers it, `apps/cli/src/jw/settings_keys.py`
(`JADWIGO_REPO_DIR` only), `apps/cli/tests/test_lesson.py` (new), `apps/cli/tests/fixtures/lesson/`
(new), `apps/cli/evals/` (new), `apps/cli/README.md`.

## Must not touch

`apps/cli/src/jw/items.py`, `draw.py`, `bank_client.py`, `commands/question.py`,
`tests/fixtures/items/converted.json` (add a lesson fixture file beside it if you need more items:
`tests/fixtures/lesson/converted.json`, pointed at by `JW_KHAN_CONVERTED` in your tests),
`packages/**`, `Makefile`, `.claude/**`, `pyproject.toml` and `uv.lock` (no new dependency). A gap
in `check.ts`'s output, `load_item`'s view or a contract is a message to the lead.

## Done when (run these, keep the output for the PR)

- `cd apps/cli && uv run --frozen pytest -q` is green, `tests/test_lesson.py` included: `draft`
  against `fake_bank` returns 6 questions with credit, based_on, why_drawn and empty rungs and a
  non-empty `left_out` when a fixture item is waiting; `check` with the stub runner turns a filled
  draft into a lesson file whose JSON `parseLessonFile` would accept (assert the shape), and turns
  an `ok: false` answer into errors by step id.
- The marked integration test (skipped when `bun` is absent) runs the real `check.ts` on the
  filled fixture draft and gets `ok: true` and a `play_path`.
- `tests/test_mcp.py` lists 6 tools, and an MCP client call of `lesson_draft` returns the draft.
- `make check` at the worktree root is green.

## Stop if

`check.ts` or `load_item` lacks a field you need (message to the lead, not an edit). A contract
change is needed. The same step failed 3 times with no new information.

## How you ship

- Stage by name, commit with `mise exec -- git commit`, push `compose`, then open a draft PR
  titled `dl-e8ov.5.38.4: lesson_draft and lesson_check tools, the card and the compose eval` with
  `gh pr create --draft --body-file <file>`, body in the `.agents/skills/dev-pr/SKILL.md` shape
  (`**Door:** two-way`). Write the body in your scratchpad, not the repo.
- Never: merge, `gh pr ready`, `bd update`, `bd create`, publish, write to jadwigo-dev or prod, call
  a model (the rungs in the eval are fixture text), read `~/.config/jadwigo-bank/`.
- End by writing `/Users/vasyl/.md/worktrees/jadwigo-hackathon/lesson-draft-lead/handoffs/compose.md`:
  what landed, the exact draft and card shapes, the commands that ran with results, what did not
  run, the PR link, anything for the lead or the owner (what the owner types in Claude Code to get
  a lesson). Then say `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_DECISIONS` or `BLOCKED`.
