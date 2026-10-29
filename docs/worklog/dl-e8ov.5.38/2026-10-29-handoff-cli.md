# Lane cli handoff: `dl-e8ov.5.38.2`

**State:** DONE_WITH_CONCERNS. Draft PR https://github.com/vasyl-stanislavchuk/jadwigo-hackathon/pull/152
(branch `lesson-cli`, commits `337c9ec` and the lead's fix `2910f10`, Door two-way). It is not ready and not merged, and no bead was touched.

## What landed

- `apps/cli/src/jw/items.py` (new): `converted_path()` and `load_item(item_id, language="pl")`. The read is cached per path per process (`functools.cache` on `_read`).
- `apps/cli/src/jw/settings_keys.py`: `JW_KHAN_CONVERTED`, `DEFAULT_KHAN_DIR` (`~/projects/david-learns/media/khan`).
- `apps/cli/src/jw/commands/question.py`: `item_view` and `jw question item <id> [--language] [--json]`.
- `apps/cli/src/jw/commands/mcp.py`: the `question_item` tool, added to `TOOLS`. I also changed the docstrings that said "three tools" to say four. I left the server's `instructions=` string alone (see below).
- `apps/cli/tests/test_items.py` (new, 14 tests), `apps/cli/tests/fixtures/items/converted.json` (new: `item_a1` and `item_a2` in pl, `item_e1` in en, `item_m1` in multi; `item_a2` carries its own licence).
- `apps/cli/tests/test_mcp.py`: asserts `question_item` is in the tool list, plus one new test where a stdio MCP client calls `question_item` and checks the result equals the verb's JSON.

## Commands and results

- `cd apps/cli && uv run --frozen pytest -q`: 133 passed (after `2910f10`; 131 at `337c9ec`).
- `uv run --frozen pytest -q tests/test_items.py tests/test_mcp.py`: 19 passed.
- `make check` at the worktree root: exit 0.
- Local smoke on the owner's real `converted.json`, not as a test: an `en` item returned the full view, with `credit.licence` taken from `licence_note`. Asking for it with `--language pl` returned the language JwError and exit 1.

## Did not run

- The Polish file. `converted-pl.json` doesn't exist yet because `dl-e8ov.5.38.1` hasn't produced it.

## Concerns for the lead

The lead routed these: the waiting items (1) and the instructions string (4) go to the compose lane, the per-item licence (3) to items-pl, and ruff (5) to a platform bead.

1. **Some real items have no family step.** The stop rule asks me to report this. In `media/khan/converted.json`, 278 of 8787 items have `spec: null` and `status.kind == "waiting"`. The reason given is, for example, "a question in several parts whose parts mix families waits". I did not write a converter. `load_item` raises a JwError for these items, and the message carries the status reason. Every item whose status is `plays` already has `spec.family`, `spec.data` and `spec.key`. If the Polish conversion keeps the waiting items, the compose lane should filter on `status.kind == "plays"`.
2. **Resolved in `2910f10`, as the lead asked:** an item whose `language` is `"multi"` (numbers only) matches any language asked for, and the view's `language` is the one asked for. Every other language stays a strict match.
3. **No item in the real file carries `credit.licence` today**, so every credit currently takes its licence from `licence_note`. Lead decision 4 says the Polish conversion will write `licence` on every item. That is the items-pl lane's job.
4. **The `MCPServer(instructions=...)` string still only names search, show and gaps.** I left it alone because my brief scopes `mcp.py` to the tool and `TOOLS`. The compose lane, which adds more tools, should rewrite it once for all of them.
5. **Formatting.** `apps/cli` has no ruff config, so `ruff format` falls back to 88 columns while the code is written at 100. I formatted only my own files, at 100 columns. Before my change, `ruff check` already flagged an unused `sys` in `tests/test_bank_pages.py`. That file isn't mine, and nothing in `make check` runs ruff. It's worth a platform issue if ruff should be wired in.
