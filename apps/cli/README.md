# jw, the jadwigo CLI

`jw` searches the question bank, shows a question set, lists the needs the bank cannot meet,
reads one converted item, and drafts and checks a lesson from a parent's request. `jw mcp serve`
offers the same 6 calls as MCP tools to Claude Code, Muse Code and Codex. The question modules
came from `david-learns/src/dl` file for file (`dl-u1y5.23`).

## Verbs

| Verb | What it prints with `--json` | Reads |
|---|---|---|
| `jw question search --words "dodawanie do 100" --grade 3` | The bank's search envelope | the bank URL and token, below |
| `jw question show set_khan_2002` | One set page, checked against `src/jw/contracts/set.schema.json` | `JADWIGO_BANK_DIR` |
| `jw question gaps --words "..." --skill <id> --grade 3` | Each need searched once, with `found`, `gap` or `degraded` | the bank URL and token |
| `jw question item <item id>` | One converted item: its family step with key and help, credit and `based_on` | `JW_KHAN_CONVERTED` |
| `jw lesson draft "6 zadań z mnożenia, klasa 3" --grade 3 --name <name>` (or `--no-names`) | A lesson draft: drawn questions copied whole from the bank, kept under a `draft_id`, and what is left to write | all of the above, and `JADWIGO_REPO_DIR` and `bun` for the mistake classes |
| `jw lesson check <draft_id> <words.json>` | The card, the lesson file's path and its `/play/` path, or errors by step id | `JADWIGO_REPO_DIR` and `bun` |

- **Search** returns the envelope as the bank sent it. The `/api/v1` route answers stage `final`
  with every arm and takes no query fields, so `--stage` and `--arm` reach only the bank's own
  route (`JW_BANK_URL`), where `--stage first` asks for ids and titles fast. A bank that is down, slow or wrong comes back
  as an envelope whose arms are all `degraded`, never as a crash.
- **Show** reads set pages from a local checkout of the bank repo, `<JADWIGO_BANK_DIR>/sets/**`.
  The search route returns rows, not pages, and no page route exists yet.
- **Gaps** is the caller's view: a need is a gap when every arm that was asked came back empty or
  abstained. A bank that could not be asked is `degraded`, not a gap.

## Settings

jw reads every setting through one loader, `setting()` in `src/jw/settings_keys.py`. For each key,
the first match wins:

1. The environment.
2. The operator's file, `~/.config/jadwigo-bank/bank.env`, or the file `JW_BANK_ENV_FILE` names.
   It must be mode 600, or jw refuses it. Lines are `NAME=value`, with an optional `export ` and
   quotes. A ` #` after an unquoted value starts a comment.
3. The default below. An empty value counts as unset.

No error or log line names a value. `.env.example` in this folder lists the same keys with no
values. Copy it into the file and fill what you use.

| Key | What it is | Default |
|---|---|---|
| `JW_API_URL` | The API's base URL. Searches go to `<JW_API_URL>/api/v1/question-searches` | none |
| `JW_BANK_READ_TOKEN` | The bearer read token for `JW_API_URL`, from SSM `/jadwigo/prod/bank-read-token` | none |
| `JW_BANK_URL` | The bank's own search URL, `<JW_BANK_URL>/questions/search` | none |
| `JW_BANK_TOKEN` | The bearer token for `JW_BANK_URL`, from Secrets Manager `jadwigo-bank/api-token` | none |
| `JW_BANK_TIMEOUT_SECS` | Seconds one search may take before it comes back degraded | `10` |
| `JADWIGO_BANK_DIR` | A checkout of the bank repo, whose `sets/` `jw question show` reads | none |
| `JADWIGO_KHAN_DIR` | The synced copy of the bank's Khan bucket | `~/.cache/jadwigo-bank/khan` |
| `JW_KHAN_CONVERTED` | The converted items file `jw question item` reads | `<JADWIGO_KHAN_DIR>/converted-pl.json`, the Polish file the bank's sync writes (`converted.json` beside it is English) |
| `JADWIGO_REPO_DIR` | The jadwigo-hackathon checkout whose `packages/lesson-import/src/check.ts` `jw lesson check` runs | the checkout `jw` was installed from |

The Khan copy is filled from the bucket by the bank repo. Run this in a checkout of `jadwigo-bank`:

```sh
uv run python -m tools.khan.sync down
```

Without it, `jw question item` stops with an error that names the missing file, the 2 keys and
this command. The lesson draft reads item bodies from that file for now
(`jadwigo-hackathon/decisions/2026-10-29-the-first-lesson-draft-reads-item-bodies-from-the-local-bank-che`).

### Where the bank is

Callers reach the bank only through `apps/api`
(`jadwigo-question-bank/decisions/2026-10-28-callers-reach-the-bank-only-through-apps-api-which-invokes-the-b`).
The bank URL and its token are read as a pair, and the first match wins:

1. `JW_API_URL` in the environment. The need goes to `<JW_API_URL>/api/v1/question-searches`
   with `JW_BANK_READ_TOKEN` as the bearer token.
2. `JW_BANK_URL` in the environment. The need goes to the bank's own `<JW_BANK_URL>/questions/search`
   with `JW_BANK_TOKEN`. This is a fallback for the lead's checks until the route is deployed.
3. Neither set. The same 2 pairs are read from the file, in the same order (`dl-e8ov.5.2.26`).

A URL and its token always come from the same place, so a URL in the environment never picks up
the file's token. With the file in place, a registration needs no token, which keeps the token out
of every agent's config. Until `jw login` exists (`dl-e8ov.2.11`), the read token is set by hand.

The 2 schemas the client checks against, `src/jw/contracts/need.schema.json` and
`search-envelope.schema.json`, are copies from `jadwigo-bank/schemas`. Each one's `$comment` names
the bank commit it was copied at.

## The MCP server

`jw mcp serve` speaks MCP on stdio, on the `mcp` package 2.3 (`MCPServer`, FastMCP's new name). Its
6 tools call the same functions as the verbs, so each tool's JSON is its verb's `--json`:

- `question_search(grade, words?, words_en?, skills?, mistakes?, language="pl", limit=20, arm?, stage?)`
- `question_show(set_id)`
- `question_gaps(grade, words?, skills?, language="pl", arm?)`
- `question_item(item_id, language="pl")`: the composer's view of one item, key and help kept.
  Never paste it where a child reads.
- `lesson_draft(request, grade, names, language="pl", kind="practice", count?, skills?)`
- `lesson_check(draft)`

A failing call comes back as a tool error whose text is the verb's error and its hint.

`mcp-tools.json` is the tool list as a client sees it: each tool's name, description,
`inputSchema` and `outputSchema`, sorted by name. The docs site renders one page per tool from it,
and `tests/test_mcp_snapshot.py` fails when the server drifts from it. After changing a tool,
rewrite it with `JW_UPDATE_SNAPSHOTS=1 uv run --frozen pytest -q tests/test_mcp_snapshot.py`.

## Drafting a lesson

A lesson from the bank copies each drawn question whole, its help text included, and plays as
copied. The calling agent writes only what the bank does not have, and changes a copied part only
when the parent asks
(`jadwigo-ai-workflows/decisions/2026-10-30-lesson-from-the-bank-copies-the-bank-question-whole-then-adapts`).

1. **Ask.** `names` is required: pass every name the family uses in the request (the child's,
   siblings', the parent's); the tool replaces them before anything leaves the machine, because
   the bank turns a need's words into model input
   (`jadwigo-hackathon/decisions/2026-10-29-lesson-draft-takes-the-family-s-names-from-the-calling-agent-and`).
   The draft's `request`, the lesson file's id, title and reasoning carry the placeholders
   (`[NAME_1]`), never a name. `lesson_draft` then sends the guarded request to the bank as a need, fetches each row's set page,
   draws the questions with the provisional rule for the lesson kind (`src/jw/draw.py`, so
   `rule_settled` is `false`), and loads each drawn item from `JW_KHAN_CONVERTED`. An item that
   cannot load (waiting for its family step, or missing) goes to `left_out` with its reason, and
   the draw runs again without it.
2. **Copy.** Each question is copied whole: family, data, key, `say`, pictures with their alt
   text and labels, and the source's help (its hints with their pictures, and its worked lines).
   The player maps the hints onto the ladder: the first two on `look` and `boost`, the rest
   before the last on `almost`, the last on `worked`, and a hint that prints the answer waits for
   `almost`. When no hint reaches `almost`, the copy writes it as `worked` with its last line
   blank. The draft is kept in `<tmp>/jw-drafts/<draft_id>.json`, and the lesson as copied, with
   no twin yet, is run through `check.ts` once: `plays_as_copied` says whether it passed, and
   each question's `mistake_classes` are the classes `check.ts` names for its step (`null` until
   `check.ts` sends them, `dl-e8ov.5.38.11`, or when no checkout or `bun` is found).
3. **Read the slim view.** `lesson_draft` returns the draft's `draft_id`, `title`, `reasoning` and
   `left_out`, and per question its `step_id`, `prompt`, `data` (pictures without their labels),
   `key`, `copied_help` (the hints as text, with their picture alts), `rungs` (what fills each
   rung), `you_write` and `mistake_classes`. For the canonical request it is about 11,000
   characters, under a client's tool-result limit.
4. **Write what is missing.** Per step, what its `you_write` lists, in the lesson's language:
   `twin`, a question from the same template with its own `say`, `data` and `key`;
   `boost_by_mistake` as `{mistake class: {"text"}}`, keys from `mistake_classes`; and a rung the
   copy leaves empty (`look` and `boost` as `{"text"}` cards, `almost` and `worked` as lists of
   lines). A rung the copy fills is refused. To change a copied part, only when the parent asks,
   add `changes: [{"change", "why", "set": {path: value}}]`: `change` is `numbers`, `context`,
   `wording` or `tutor_notes`, and a path is `say` or a dotted path under `data`, `key`, `hints`,
   `worked` or `almost` (`hints.0.text`). Each change is recorded in `based_on.changes`.
5. **Check.** `lesson_check(draft_id, help, title?, reasoning?)` takes those words by step id,
   every step's on each call. It refuses a missing twin or rung, then builds the lesson file
   (`packages/lesson-import/src/lesson-file.ts`), writes it to `<tmp>/jw-lessons/<id>.json`, and
   runs `bun packages/lesson-import/src/check.ts <file> --json` in `JADWIGO_REPO_DIR`. `ok: true`
   brings the card: per question its prompt, key, rungs, twin, source, licence, changes and why
   it was drawn, and what was left out. `ok: false` lists errors by step id; fix them and check
   again. From a shell: `jw lesson check <draft_id> words.json`, where `words.json` is the `help`
   object.
6. **Import.** The owner reads the card and imports the file into jadwigo-dev from the repo root:
   `make lesson-import FILE=<lesson_file> ENV=dev`. The lesson then plays at the card's `play_path`.

In Claude Code, with the server registered as below, the owner asks in plain words:

> Przygotuj lekcję dla <imię dziecka>: 6 zadań z mnożenia, klasa 3. Użyj lesson_draft i podaj w names
> wszystkie imiona z prośby (<imię dziecka>, rodzeństwa, moje), dopisz po polsku to, czego bank
> nie ma (you_write), sprawdź lesson_check i pokaż mi kartę.

## Registering it

These lines run the server from a checkout through `uv`, with the URL and token in
`~/.config/jadwigo-bank/bank.env`. `JADWIGO_BANK_DIR` can sit in that file too, in place of the `env` entry. Replace the paths with your checkouts.

**Claude Code.** The name comes before the `-e` flags: `-e` takes every value up to `--`, so a
name after it is read as one more variable (`Invalid environment variable format: jadwigo`). Each
variable gets its own `-e`. `JW_KHAN_CONVERTED` names the Polish items file while the synced copy
has none (`dl-e8ov.5.38.8`).

```sh
claude mcp add --scope user --transport stdio jadwigo \
  -e JADWIGO_BANK_DIR=/Users/vasyl/projects/jadwigo-bank \
  -e JW_KHAN_CONVERTED=/Users/vasyl/projects/david-learns/media/khan/converted-pl.json \
  -- uv --directory /Users/vasyl/projects/jadwigo-hackathon/apps/cli run jw mcp serve
```

`claude mcp list` then shows `jadwigo`, and `claude mcp remove jadwigo -s user` takes it away.

Or check it in for a project as `.mcp.json`:

```json
{
  "mcpServers": {
    "jadwigo": {
      "type": "stdio",
      "command": "uv",
      "args": ["--directory", "/Users/vasyl/projects/jadwigo-hackathon/apps/cli", "run", "jw", "mcp", "serve"],
      "env": {
        "JADWIGO_BANK_DIR": "/Users/vasyl/projects/jadwigo-bank",
        "JW_KHAN_CONVERTED": "/Users/vasyl/projects/david-learns/media/khan/converted-pl.json"
      }
    }
  }
}
```

**Codex.** The form `codex mcp add <NAME> -- <COMMAND>...` with `--env KEY=VALUE` was confirmed
against `codex mcp add --help`.

```sh
codex mcp add jadwigo \
  --env JADWIGO_BANK_DIR=/Users/vasyl/projects/jadwigo-bank \
  -- uv --directory /Users/vasyl/projects/jadwigo-hackathon/apps/cli run jw mcp serve
```

**Muse Code.** Muse has no `mcp add` verb. A stdio server is an entry under `mcpServers` in
`~/.config/muse/settings.json`, whose top level also needs `"schema_version": 1`.

> **Unconfirmed field names.** Muse 1.4.14's help does not list the entry's fields. `transport`,
> `command`, `args` and `env` were read from the binary's settings type and its validation
> messages. Muse loads the entry without a warning, but it does not warn on a wrong field name
> either. Treat them as unconfirmed until a Muse session calls a tool.

```json
{
  "schema_version": 1,
  "mcpServers": {
    "jadwigo": {
      "transport": "stdio",
      "command": "uv",
      "args": ["--directory", "/Users/vasyl/projects/jadwigo-hackathon/apps/cli", "run", "jw", "mcp", "serve"],
      "env": { "JADWIGO_BANK_DIR": "/Users/vasyl/projects/jadwigo-bank" }
    }
  }
}
```

## The model client

`jw.muse` is the one way jw calls a model: `muse-spark-1.3-contributor` and no other. It takes
only a prompt sealed by `jw.pii.guard`, which replaces learner names, emails and phone numbers
first. The Meta key goes to muse on stdin from `~/.config/jadwigo-bank/muse.env`, and the child
process runs without the Anthropic key. Each call writes a ledger row to `logs/muse/` and is
refused once the lane or the hackathon budget is spent. `jw.explain` builds a lesson's explanation
for a parent from what `jw.draw` picked. No verb calls the model yet.

## Tests

```sh
cd apps/cli && uv run --frozen pytest -q
```

`tests/fake_bank.py` answers both search routes with `tests/fixtures/bank/envelope.json`.
`tests/test_mcp.py` starts `jw mcp serve` under the `mcp` package's stdio client, lists the 6 tools
and checks each tool's JSON against its verb's. `tests/test_lesson.py` drafts "6 zadań z mnożenia,
klasa 3" against the fake bank and the fixture items in `tests/fixtures/lesson/` (our own small
bank, no Khan text), fills the rungs from `tests/fixtures/lesson/rungs.json`, and checks the lesson
file with a stub and, when `bun` is on `PATH`, with the real `check.ts`.

`evals/compose/eval_real_items.py` runs the same request on the owner's real Polish items. It is
never collected by `pytest -q`; name it to run it:

```sh
JW_KHAN_CONVERTED=<converted-pl.json> JADWIGO_BANK_DIR=<jadwigo-bank checkout> \
  uv run --frozen pytest -q evals/compose/eval_real_items.py
```

It is skipped, with the reason, when either path is missing. `tests/test_muse.py` runs against a fake `muse` on
`PATH`, so no test calls a model. `tests/conftest.py` clears every key, points the bank file at a path that
does not exist and the Khan default at a temporary folder, so no test reads your real token or
your synced copy. `tests/test_settings.py` covers the loader.
