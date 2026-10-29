# jw, the jadwigo CLI

`jw` searches the question bank, shows a question set and lists the needs the bank cannot meet.
`jw mcp serve` offers the same 3 calls as MCP tools to Claude Code, Muse Code and Codex. The
modules came from `david-learns/src/dl` file for file (`dl-u1y5.23`).

## Verbs

| Verb | What it prints with `--json` | Reads |
|---|---|---|
| `jw question search --words "dodawanie do 100" --grade 3` | The bank's search envelope | the bank URL and token, below |
| `jw question show set_khan_2002` | One set page, checked against `src/jw/contracts/set.schema.json` | `JADWIGO_BANK_DIR` |
| `jw question gaps --words "..." --skill <id> --grade 3` | Each need searched once, with `found`, `gap` or `degraded` | the bank URL and token |

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
| `JW_KHAN_CONVERTED` | The converted items file `jw question item` reads | `<JADWIGO_KHAN_DIR>/converted/pl.json` |

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
3 tools call the same functions as the verbs, so each tool's JSON is its verb's `--json`:

- `question_search(grade, words?, words_en?, skills?, mistakes?, language="pl", limit=20, arm?, stage?)`
- `question_show(set_id)`
- `question_gaps(grade, words?, skills?, language="pl", arm?)`

A failing call comes back as a tool error whose text is the verb's error and its hint.

## Registering it

These lines run the server from a checkout through `uv`, with the URL and token in
`~/.config/jadwigo-bank/bank.env`. `JADWIGO_BANK_DIR` can sit in that file too, in place of the `env` entry. Replace the paths with your checkouts.

**Claude Code.** The flags were confirmed against `claude mcp add --help`.

```sh
claude mcp add --scope user --transport stdio \
  -e JADWIGO_BANK_DIR=/Users/vasyl/projects/jadwigo-bank \
  jadwigo -- uv --directory /Users/vasyl/projects/jadwigo-hackathon/apps/cli run jw mcp serve
```

Or check it in for a project as `.mcp.json`:

```json
{
  "mcpServers": {
    "jadwigo": {
      "type": "stdio",
      "command": "uv",
      "args": ["--directory", "/Users/vasyl/projects/jadwigo-hackathon/apps/cli", "run", "jw", "mcp", "serve"],
      "env": { "JADWIGO_BANK_DIR": "/Users/vasyl/projects/jadwigo-bank" }
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
`tests/test_mcp.py` starts `jw mcp serve` under the `mcp` package's stdio client, lists the 3 tools
and checks each tool's JSON against its verb's. `tests/test_muse.py` runs against a fake `muse` on
`PATH`, so no test calls a model. `tests/conftest.py` clears every key, points the bank file at a path that
does not exist and the Khan default at a temporary folder, so no test reads your real token or
your synced copy. `tests/test_settings.py` covers the loader.
