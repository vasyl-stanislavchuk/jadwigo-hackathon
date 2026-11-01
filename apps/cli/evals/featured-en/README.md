# The 3 English featured lessons (`dl-e8ov.5.77`)

English lessons that mirror the 3 Polish featured lessons, drafted from English Khan Academy
originals with `jw lesson draft --language en` and `jw lesson check`, the functions behind the
jadwigo MCP's `lesson_draft` and `lesson_check`. Nothing here is imported anywhere: importing them
to prod and approving them as featured is the owner's step, `dl-w0b4.88`.

The lesson files copy Khan questions whole, so they stay outside git, in `JADWIGO_DRAFTS_DIR` on
the machine that drafted them (owner, 2026-11-01, draft decision `dl-jhnl`). This folder keeps what
Jadwigo wrote and what the reviewer said.

| English lesson | Mirrors | Questions (Khan item ids) | Draft file in `JADWIGO_DRAFTS_DIR` |
| --- | --- | --- | --- |
| Equal groups | Równe grupy | 4: `x93e5fdcb2fab14d7`, `x3d60b71527feb5cc`, `x6f5916167c114ecf`, `x35c71ca29959df86` | `draft_bbbfa369a52a.json` |
| Fives everywhere | Piątki wszędzie: monety, zegar i czekolada | 8: `x2f88222baafbf8b5`, `x0ff9b11ce633ccb9`, `x1b525fdf09d30cf7`, `x146c87714ac49a82`, `x4ea7f62cb4a69af3`, `x11a7f92eeb6df075`, `x02b58d9b9cefc6bd`, `x17c5930e4a41d2ba` | `draft_0f25b23f6747.json` |
| Times 4: double times 2 | Razy cztery: podwójne razy dwa | 11: `x022dce3e76c5ad54`, `x2fd99e110219b0ad`, `x8b892a5d000ccf13`, `x4be9ae0a72d2baf3`, `x01539bcd2faf455b`, `xf6f48334c59f0e30`, `x6a92d695ba7f11bb`, `x32bc2256e5645f33`, `x06e43997a025cb67`, `x0aede1e04667d5da`, `x024749f1e91e5b79` | `draft_367bcbea90d6.json` |

How each differs from its Polish lesson:
- **Fives everywhere** has no coins, clock or chocolate: the bank holds no English questions with
  them, so its pictures are arrays, groups and a number line, and 2 of its 8 questions are times 10.
- **Times 4: double times 2** has 11 questions on times 2 and times 4, and ends on one times 5.

## Files

- `words-lesson{1,2,3}.json`: every word Jadwigo wrote, by step id, as `lesson_check` took them:
  twins (their `say` and `key`; a twin's data is the question's with other numbers), the look and
  boost rungs the copy left empty, and a mistake card per class. 3 copied `say` lines gained a `?`
  (the `changes` entries), because the English checklist's en-10 needs one.
- `review.json`: the English reviewer's verdict on each of the 147 lines (every line Jadwigo wrote,
  each step's `say`, the titles and the notes for the parent), per round. The reviewer is
  `workflows/jadwigo-lesson-review` against `workflows/_lang/en/checklist.md`, run as a separate
  session from the writer each round. Its quotes of copied lines are left out.

## Import (the owner's, `dl-w0b4.88`)

Each file passed `lesson_check` with `ok: true` and no warning. In the jadwigo checkout, with
`DRAFTS` the drafting machine's `JADWIGO_DRAFTS_DIR` (`~/.local/state/jadwigo/drafts` by default):

```
make lesson-import FILE=$DRAFTS/draft_bbbfa369a52a.json ENV=dev
make lesson-import FILE=$DRAFTS/draft_0f25b23f6747.json ENV=dev
make lesson-import FILE=$DRAFTS/draft_367bcbea90d6.json ENV=dev
```

Play each on dev, then the same 3 with `ENV=prod` and approve them as featured (`dl-w0b4.85`
lists them on `/en/lessons`).

## Drafting English today

- Set `JW_KHAN_CONVERTED` to the Khan folder's `converted.json`: `jw` reads one converted file for
  every language, and the jadwigo MCP's config names `converted-pl.json` (`dl-hin8.17`).
- The MCP serves from the owner's main checkout. Run `git pull` there first: an old checkout
  refuses today's bank pages (`ready_ids` is not in its `set.schema.json`).
