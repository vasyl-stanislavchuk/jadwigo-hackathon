# jw, the jadwigo CLI

`jw` searches the question bank, shows a question set, lists the needs the bank cannot meet,
reads one converted item, drafts and checks a lesson from a parent's request, and lists what is
not lesson-ready so it gets fixed. `jw mcp serve` offers the question and lesson calls as MCP
tools to Claude Code, Muse Code and Codex; the refusals verbs stay on the command line. The
question modules came from `david-learns/src/dl` file for file (`dl-u1y5.23`).

## Verbs

| Verb | What it prints with `--json` | Reads |
|---|---|---|
| `jw question search --words "dodawanie do 100" --grade 3` | The bank's search envelope | the bank URL and token, below |
| `jw question show set_khan_2002` | One set page, checked against `src/jw/contracts/set.schema.json` | `JADWIGO_BANK_DIR` |
| `jw question gaps --words "..." --skill <id> --grade 3` | Each need searched once, with `found`, `gap` or `degraded` | the bank URL and token |
| `jw question item <item id>` | One converted item: its family step with key and help, credit and `based_on`; only a lesson-ready one | `JW_KHAN_CONVERTED`, and the flags in `JADWIGO_BANK_DIR` |
| `jw question refusals [--lang pl] [--new] [--since <bead>]` | What is not lesson-ready, by shape: rule (or the converter's cause), question type, count, 3 example ids, owner, bead | `JW_KHAN_CONVERTED`, its `.render.json` and `.refused.json`, `JADWIGO_BANK_DIR` |
| `jw question readiness [--lang pl\|en] [--from-files]` | Per language: items, ready, waiting by reason, refused by cause, flagged, not checked, each cause with its bead, what was re-admitted since the previous run, and the sets indexed and skipped | `<JADWIGO_KHAN_DIR>/readiness.json`, else the files `refusals` reads |
| `jw question refusals assign <rule> <question_type> <bead>` | Writes the shape's bead into the refusals file | `JADWIGO_BANK_DIR` |
| `jw question flag <item id> --lang pl "<why>"` (or `--clear`) | Pulls one item from lessons at once, or puts it back | `JADWIGO_BANK_DIR` |
| `jw lesson draft "6 zadań z mnożenia, klasa 3" --grade 3 --topic mnożenie --name <name>` (or `--no-names`) | A lesson draft: drawn questions copied whole from the bank, kept under a `draft_id` and written to `JADWIGO_DRAFTS_DIR`, and what is left to write | all of the above, and `JADWIGO_REPO_DIR` and `bun` for the mistake classes |
| `jw lesson check <draft_id> <words.json>` | The card, the lesson file's path, the import command and then its `/play/` path, or findings by step id; the draft file rewritten either way | `JADWIGO_REPO_DIR` and `bun` |
| `jw lesson edit <draft_id> <step_id> <patch.json> [--why ... --change ...]` | One step changed by a JSON merge patch and checked: that step's findings, render findings and card | `JADWIGO_REPO_DIR` and `bun` |
| `jw lesson show <draft_id> [<step_id>]` | The draft file's step, or every step, as data, with its latest findings | `JADWIGO_DRAFTS_DIR` |

- **Search** returns the envelope as the bank sent it. The `/api/v1` route answers stage `final`
  with every arm and takes no query fields, so `--stage` and `--arm` reach only the bank's own
  route (`JW_BANK_URL`), where `--stage first` asks for ids and titles fast. A bank that is down, slow or wrong comes back
  as an envelope whose arms are all `degraded`, never as a crash.
- **Show** reads set pages from a local checkout of the bank repo, `<JADWIGO_BANK_DIR>/sets/**`.
  The search route returns rows, not pages, and no page route exists yet.
- **Gaps** is the caller's view: a need is a gap when every arm that was asked came back empty or
  abstained. A bank that could not be asked is `degraded`, not a gap. A need whose every found
  set has no lesson-ready item in its language is a gap too, with `reason` `no item is
  lesson-ready in <lang>`, and `not_ready` lists those sets (their pages, in `JADWIGO_BANK_DIR`,
  say `count.ready`). When the converted files are here, the reason goes on with the cause most
  of those sets' items share: `; most: <cause>, <n> of <m> items (<bead>)`.

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
| `JADWIGO_BANK_DIR` | A checkout of the bank repo, whose `sets/` `jw question show` reads, and whose `refusals/<lang>.json` holds the flags and the shapes' beads | none |
| `JADWIGO_KHAN_DIR` | The synced copy of the bank's Khan bucket | `~/.cache/jadwigo-bank/khan` |
| `JW_KHAN_CONVERTED` | The converted items file `jw question item` reads | `<JADWIGO_KHAN_DIR>/converted-pl.json`, the Polish file the bank's sync writes (`converted.json` beside it is English) |
| `JADWIGO_REPO_DIR` | The jadwigo-hackathon checkout whose `packages/lesson-import/src/check.ts` `jw lesson check` runs | the checkout `jw` was installed from |
| `JADWIGO_DRAFTS_DIR` | Where `jw lesson draft` and `jw lesson check` write each draft, `<draft_id>.json`, and its check, `<draft_id>.check.json`. From the environment only, never from the file (see Drafting a lesson) | `~/.local/state/jadwigo/drafts` |

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

Every call writes the draft into `JADWIGO_DRAFTS_DIR`, which jw reads from the environment only, with
`~` expanded: never from `bank.env`. The lesson builder (`tools/builder`, the channel, the launcher
and the web watcher) reads the same variable the same way, so set it in the environment both run
in, or leave it unset for `~/.local/state/jadwigo/drafts`. jw makes the directory, and `.jw/` under
it, readable by you only (mode 700).

1. **Ask.** `names` is required: pass every name the family uses in the request (the child's,
   siblings', the parent's); the tool replaces them before anything leaves the machine, because
   the bank turns a need's words into model input
   (`jadwigo-hackathon/decisions/2026-10-29-lesson-draft-takes-the-family-s-names-from-the-calling-agent-and`).
   The draft's `request`, the lesson file's id, title and reasoning carry the placeholders
   (`[NAME_1]`), never a name. `topic` is required too: what the lesson is about in a few words,
   which the calling agent distils from the request with no count, grade or name (`mnożenie`,
   `dodawanie do 100`). The bank searches the topic, not the whole request, so a request's
   framing ("Przygotuj lekcję dla …: 6 zadań …") does not narrow the search (`dl-e8ov.5.38.12`);
   the request is kept as the draft's record and title. `lesson_draft` then sends the guarded
   topic to the bank as a need's words, fetches each row's set page,
   draws the questions with the provisional rule for the lesson kind (`src/jw/draw.py`, so
   `rule_settled` is `false`) from each set's lesson-ready ids, and loads each drawn item from
   `JW_KHAN_CONVERTED`. An item that is not lesson-ready (see below) goes to `left_out` with its
   reason, and the draw runs again without it.
2. **Copy.** Each question is copied whole: family, data, key, `say`, pictures with their alt
   text and labels, and the source's help (its hints with their pictures, and its worked lines).
   The player maps the hints onto the ladder: the first two on `look` and `boost`, the rest
   before the last on `almost`, the last on `worked`, and a hint that prints the answer waits for
   `almost`. When no hint reaches `almost`, the copy writes it as `worked` with its last line
   blank. One change is made by code: an `enter` question that is plainly a×b (its figure reads
   `a · b =`, and its key accepts one whole number, a×b, and names no rule) gets the
   multiplication rule on its key, `{"rule": "times_table", "a", "b", "recent": []}`, recorded as
   a `tutor_notes` entry in `based_on.changes`, so its misses name their class (`add_for_multiply`,
   `neighbour_row`, ...)
   (`jadwigo-ai-workflows/decisions/2026-10-30-jw-adds-the-multiplication-mistake-rule-by-code-to-a-copied-axb`).
   Every other key stays as the bank has it. The lesson as copied, with no twin yet, is written to
   `<JADWIGO_DRAFTS_DIR>/<draft_id>.json` (the result's `draft_path`) before the call returns, and
   run through `check.ts` once: `plays_as_copied` says whether it passed, its check is written
   beside it as `<draft_id>.check.json`, and each question's `mistake_classes` are the classes
   `check.ts` names for its step (`null` until `check.ts` sends them, `dl-e8ov.5.38.11`, or when
   no checkout or `bun` is found; then no check file is written). jw's own record of the draft is
   kept apart, in `<JADWIGO_DRAFTS_DIR>/.jw/<draft_id>.json`.
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
5. **Check.** `lesson_check(draft_id, help, title?, reasoning?, names?)` takes those words by
   step id, every step's on each call. `title` and `reasoning` pass through the same name guard as
   the request, with `names`, before they are written. It builds the lesson file
   (`packages/lesson-import/src/lesson-file.ts`) and rewrites `<draft_id>.json` with it on every
   call, as far as the words go. It refuses a missing twin or rung; otherwise it runs
   `bun packages/lesson-import/src/check.ts <file> --json` in `JADWIGO_REPO_DIR`. Either way it
   rewrites `<draft_id>.check.json`: `{ok, findings, mistake_classes, checked_at}`. A finding is
   `{step_id, path, level, rule, text, fix}`: `check.ts`'s own when it sends them (`dl-a38n.14`),
   else each of its errors as one with rule `compile`; a refused word is one with rule `words`.
   `ok: true` brings the card: per question its prompt, key, rungs, twin, source, licence, changes
   and why it was drawn, and what was left out. `ok: false` lists `findings` (and the old
   `errors`, for one release) by step id; fix them and check again. From a shell:
   `jw lesson check <draft_id> words.json --name <name>`, where `words.json` is the `help` object.
   Each answer also carries `render`: the findings the lesson builder's page wrote when it drew
   the draft, `<draft_id>.render.json` (`dl-a38n.28`), with `rendered_at` and `stale` (drawn
   before this call's write), or `null` when no page has drawn it.
6. **Change one step.** `lesson_show(draft_id, step_id?)` returns the draft file's step, or every
   step, as data, with its latest findings and render findings. `lesson_edit(draft_id, step_id,
   patch, why?, change?)` applies `patch`, a JSON merge patch (RFC 7386) on that step: an object
   merges, `null` removes a part, anything else replaces it. It may set `say` and `question`'s
   `data`, `key` and `help` (the twin is `help.twin`), and takes the same bare strings as
   `lesson_check`. A change to a part the bank's copy has (`say`, `data`, `key`, `hints`,
   `worked`, a copied `almost`) needs `why` and is appended to `based_on.changes` with `change`
   (`wording` by default); a rung, twin or mistake card the agent writes needs none. It rewrites
   `<draft_id>.json` and `<draft_id>.check.json`, and answers for that step alone: `ok` (no error
   for it), its `findings`, `render`, its `card`, and `lesson_ok` for the whole lesson. A refused
   patch changes nothing and comes back as findings with rule `edit`. `lesson_check` rebuilds
   every step from the bank's copy and the words it is sent, so it replaces these edits. From a
   shell: `jw lesson edit <draft_id> q2 patch.json --why "..."` and `jw lesson show <draft_id> q2`
   (`dl-a38n.29`).
7. **Import, then play.** The owner reads the card and imports the file into jadwigo-dev from the
   repo root with the command the answer's `import_command` and the card's `next` name:
   `make lesson-import FILE=<lesson_file> ENV=dev`. Only then does the lesson play at the card's
   `play_path`; before the import that path does not exist (`dl-e8ov.5.38.13`).

### Lesson-ready

A draft copies a bank question whole, so it copies only one that already renders right (decisions
`dl-kaxj` and `dl-be2l`). An item is lesson-ready when the bank's conversion stamped its status
`{kind: "plays", rules_version, checked_at}`: it compiles strictly, its key grades its own
solution, every picture loads, the page found no error drawing it, and it has a licence. jw
refuses every other item, and a draft's `left_out` says why, about the item and never the child:

| `left_out` reason | The item's status |
|---|---|
| `renders wrong: <rule>` | `refused`: a check failed (`render-*`, `contract`, `key-grades`) |
| `not checked` | `plays` with no `checked_at`, or no status: no verdict yet, so it is held back |
| `flagged: <reason>` | `flagged`, or a flag in the refusals file |
| the converter's own reason | `waiting`: the converter cannot make it yet |
| `no item is lesson-ready in <lang>` | a set whose page lists no ready id in the lesson's language |

The draw takes each set's `items.ready_ids[lang]`. A page built before the stamp has none, so the
draw falls back to `items.ids`, and every item there loads as `not checked`: nothing unchecked
reaches a lesson.

### The refusals loop

A refused item is fixed at its source, one shape at a time: a shape is one rule on one question
type. The refusals file, `<JADWIGO_BANK_DIR>/refusals/<lang>.json`, is committed in the bank repo
and read by its stamp: `{shapes: [{rule, question_type, issue}], flags: [{id, by, reason, issue?,
on}]}`. It holds ids, rules, beads and reasons only, never a question's text. jw checks the whole
file against the bank's schema, pinned in `src/jw/contracts/refusals.schema.json`, before it
writes, and writes nothing that does not match.

1. `jw question refusals --new` lists the shapes no bead tracks, each with its count, 3 example
   ids and its owner: `render-picture-missing` to the media pipeline, any other `render-*` to
   lesson-kit, `contract` and `key-grades` to the converter, `flagged` to whoever flagged it. It
   reads the stamped statuses and the conformance sidecar beside the converted file
   (`converted-pl.render.json`), so a run newer than the stamp shows in this report at once.
   It reads the converter's refusals too (`converted-pl.refused.json`, `converted.refused.json`
   for English: `{items: [{id, reason, sets}]}`), the items refused before conversion. Each is a
   shape on no question type, owned by the converter, named by its cause: the reason without the
   item's id, a picture URL that was not pulled as `a picture was not pulled`, a stopped set as
   `set stopped`, a twin difference as `pl differs from en (family)` or `(numbers, pictures)`.
   `jw lesson draft` reads only the stamp, so it still serves such an item until the next stamp
   refuses it; a flag holds back at once.
2. The lead files one bead per shape, then `jw question refusals assign <rule> <question_type>
   <bead>` (`-` for no question type). The next stamp carries the bead into each refused item.
   jw never files a bead.
3. `jw question flag <id> --lang pl "<why>"` pulls an item the checks missed. jw reads the flag at
   once, so the next draft leaves the item out with no re-run. `by` is a role: `--by` takes
   `owner` (the default), `lead`, `teacher` or `agent`, never a person's name.
   `jw question flag <id> --clear` puts it back.
4. A fix lands, the nightly stamp flips the items back to `plays`, and `jw question refusals
   --since <bead>` says per shape of that bead which items are still refused, or that every one
   plays now.

### Readiness

`jw question readiness` is the owner's count, per language (both unless `--lang` names one):
items, lesson-ready, waiting by reason, refused by cause (a rule of the gate, or the converter's
cause as above), flagged and not checked; each cause with its owner and its bead, and what the
last run re-admitted, by cause (wave plan `docs/worklog/dl-a38n.32/2026-10-31-wave-2.md`,
`dl-a38n.32.36`; decisions `dl-kaxj`, `dl-be2l`, `dl-e7yv`). It reads
`<JADWIGO_KHAN_DIR>/readiness.json`, which the bank's `make ready` writes:

```json
{"generated_at": "...", "rules_version": "...",
 "languages": {"pl": {"items": 0, "ready": 0, "waiting": {"<reason>": 0}, "refused": {"<cause>": 0},
                      "flagged": 0, "readmitted": {"<cause>": 0},
                      "issues": {"<cause>": "<bead>"}, "not_checked": 0}},
 "sets": {"indexed": 0, "skipped_no_ready": 0}}
```

`issues` and `not_checked` may be left out. A language the file does not hold, or every language
with `--from-files`, is counted from the converted file, its sidecar and the converter's
refusals; only a run knows what it re-admitted, so that report says it is unknown. A cause's bead
comes from `refusals assign` (`jw question refusals assign "<cause>" - <bead>` for a converter
cause), from `issues`, or from the bead an item's status carries.

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

### The nightly happy-path run

`scripts/smoke_ready.py` holds the whole path, bank to a child's screen, for 3 fixed Polish needs
(`dl-a38n.32.13`): it runs `lesson_draft`, checks that every drawn step's `based_on` item is
lesson-ready in the converted file (`plays` with `checked_at`, and no flag) and that
`plays_as_copied` is true, fills what `you_write` lists with plain words, runs `lesson_check`, and
imports the lesson file into the in-memory store (`InMemoryStore`, with bun in
`packages/lesson-import`). It prints one line per need and exits 1 on any miss.

```sh
cd apps/cli
uv run --frozen python scripts/smoke_ready.py                # the planted fixture, a fake bank
uv run --frozen python scripts/smoke_ready.py --fixture DIR  # another fixture laid out the same way
uv run --frozen python scripts/smoke_ready.py --live         # nightly: the bank jw's settings name
```

The nightly run is `--live`, after the stamp, with the bank URL and token, `JADWIGO_BANK_DIR` and
`JW_KHAN_CONVERTED` set as for `jw lesson draft`. It needs bun and a jadwigo checkout. It is never
part of `make check`: it is not a test, and `pytest -q` does not collect `scripts/`. On the planted
fixture it passes; with `fxr1` flagged it fails, since nothing lesson-ready is left to draw.
