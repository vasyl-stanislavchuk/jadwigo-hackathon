# dl-n9fr: wave 5, lane cli, dl-n9fr.47: one settings loader for jw

- **Landed:** code in `9ff30cf` on `lane/cli-settings`, and this note in the commit after it; not pushed. `setting(name)` in `apps/cli/src/jw/settings_keys.py` is the loader for all 8 keys.
- **Order:** environment, then the mode-600 `bank.env` (`JW_BANK_ENV_FILE` overrides the path), then the default. A file others can read is refused, and no error or log carries a value.
- **Defaults:** `JADWIGO_KHAN_DIR` is `~/.cache/jadwigo-bank/khan`, and `JW_KHAN_CONVERTED` is `<JADWIGO_KHAN_DIR>/converted/pl.json`. No default names david-learns.
- **Absent file:** the error names the path, both keys and `uv run python -m tools.khan.sync down`. That tool exists in `jadwigo-bank/tools/khan/sync.py`.
- **Tests:** `cd apps/cli && uv run --frozen pytest -q` ends `147 passed in 14.67s`. No test reads the real file or the real Khan copy.
- **Overlap with dl-e8ov.5.38.2:** `items.py` changed only in its docstring, `_FILE_HINT`, `converted_path()` and a dropped `import os`. A rebase there touches those lines only.
- **Dropped behaviour:** the English fallback (`converted.json` when no Polish file) is gone, as the brief specifies. A proposed bead below covers `converted/en.json`.
- **Not done:** Biome checks JSON only in `apps/cli`, so it covers no Python. The lefthook pre-commit hook did not run because lefthook is not on PATH. I ran gitleaks by hand and it found no leaks.
- **Grep:** `git grep david-learns/media apps/cli` finds nothing. 8 other `david-learns` lines stay, all outside this lane, listed below.

## What landed

| File | Change |
| --- | --- |
| `apps/cli/src/jw/settings_keys.py` | `KEYS`, `env_file()`, `read_env_file()` (moved from `bank_client`), `setting()`, `khan_dir()`, `bank_timeout()`; new `JADWIGO_KHAN_DIR`, `KHAN_SYNC_COMMAND`, `CONVERTED_DEFAULT` |
| `apps/cli/src/jw/bank_client.py` | `endpoint()` keeps the pair rule on `read_env_file`; `show_set` reads `JADWIGO_BANK_DIR` and the timeout reads `JW_BANK_TIMEOUT_SECS` through the loader |
| `apps/cli/src/jw/items.py` | `converted_path()` through the loader, the new default, the new hint |
| `apps/cli/tests/test_settings.py` | new, 14 tests |
| `apps/cli/tests/conftest.py` | clears every key in `KEYS` and points `DEFAULT_KHAN_DIR` at a temporary folder |
| `apps/cli/tests/test_items.py` | the old `converted-pl.json` then `converted.json` test became the `converted/pl.json` test; one hint assertion now checks the sync command |
| `apps/cli/.env.example` | new, the 8 keys with no values |
| `apps/cli/README.md` | a Settings section with the key table, the file, the order and the sync command; 2 "in `david-learns`" mentions removed |

The new tests cover these cases:

- The environment beats the file.
- The file beats the default.
- An empty value counts as unset.
- A world-readable file is refused, and the environment still wins over a refused file.
- A copy of `.env.example` reads as all unset.
- A trailing ` #` comment is not part of the value.
- An invented value never appears in an error, a hint or a DEBUG log record.
- The converted default resolves to `converted/pl.json`.
- An absent converted file gives an error that names the setting and the sync command.

## Decisions followed

- `jadwigo-question-bank/decisions/2026-10-28-callers-reach-the-bank-only-through-apps-api-which-invokes-the-b`: the `JW_API_URL` pair still comes first, and a URL never takes a token from another source.
- `jadwigo-question-bank/decisions/2026-10-29-the-question-bodies-and-answer-keys-live-in-a-private-bucket-in`: the default is the synced copy of the bucket, laid out as `khan/converted/pl.json`.
- `jadwigo-hackathon/decisions/2026-10-29-the-first-lesson-draft-reads-item-bodies-from-the-local-bank-che`: items are still read from a local file. The README cites this decision.

## Two judgment calls

- **Inline comments.** The loader treats ` #` after an unquoted value as a comment, as dotenv does. Without that, a copied `.env.example` would turn each comment into a value. A quoted value keeps its `#`.
- **Unknown names.** `setting()` raises `ValueError` for a name not in `KEYS`. That stops a new key from bypassing the list that `.env.example` and the README must match.

## Remaining `david-learns` lines in apps/cli (none is a path jw reads)

- `README.md:5` is the one history line, kept.
- `pyproject.toml:9`, `commands/question.py:3` and `errors.py:3` are provenance comments outside this lane.
- `draw.py:4` and the pinned `contracts/need.schema.json` and `set.schema.json` cite a david-learns decision slug. draw.py is off-limits, and the schemas are bank copies.
- `pii.py:36` and `tests/test_pii.py:32` name david-learns' `LearnerInfo` type, outside this lane.

## Proposed bead changes (not made)

- **Close dl-n9fr.47** once the lead merges `9ff30cf`. Its done-when holds: tests pass, no test reads the real file, the `david-learns/media` grep is empty, and `.env.example` and the README agree.
- **New bead under dl-n9fr, label lane:cli:** `jw question item --language en` should read `<JADWIGO_KHAN_DIR>/converted/en.json` instead of failing on the Polish file. Inputs: `items.converted_path()` and the bucket layout in section 3.1 of `docs/research/out-of-git-into-the-platform.md`. Done when an English item loads with only the Khan dir set.
- **Note for the runbook bead of section 3.4:** fold `read.env` into `bank.env`. jw never read `read.env`, so nothing in this lane changes for it.
