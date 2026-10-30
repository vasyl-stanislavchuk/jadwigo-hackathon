# tools/builder: the live lesson builder's bridge

The live lesson builder (`dl-a38n`, design in `docs/research/live-lesson-builder.md`) shows a lesson
draft at `/playground/lesson` while a Claude Code session drafts it through `jw mcp serve`. This
folder holds the part that talks to that session: `channel.ts`, the `jadwigo-builder` MCP channel
server, and `launch.ts`, which `make builder` runs to start the session it talks to. Both read and
write files under `JADWIGO_DRAFTS_DIR` and import nothing of ours.

## The files it shares

All of them sit in `JADWIGO_DRAFTS_DIR`, default `~/.local/state/jadwigo/drafts`, the same setting
jw reads. Every `.jsonl` file is append-only and has one writer. The builder's own two files sit
in `.builder/`, so the page, which lists every `<draft_id>.json`, never takes one for a draft.

| File | Written by | One row |
| --- | --- | --- |
| `<draft_id>.asks.jsonl` | the page, through the web dev server | `{ask_ts, draft_id, step_id, intent: change\|question\|note, text, author}` |
| `<draft_id>.consumed.jsonl` | this channel, after it sent the ask | `{ask_ts, consumed_at}` |
| `<draft_id>.replies.jsonl` | this channel's `reply` tool | `{ts, draft_id, in_reply_to, kind: progress\|done\|question\|note, text}` |
| `.builder/channel.heartbeat.json` | this channel, every 5 s or sooner | `{at, pid, session_id, loaded}` |
| `.builder/session.json` | `make builder`, at each launch | `{session_id, started_at, cwd, transcript}` |

## What the session sees

Every 5 seconds, or within about 50 ms of an asks file changing, the server sends each ask nobody
has consumed as a `notifications/claude/channel` message, then marks it consumed. It reaches the
turn as:

```
<channel source="jadwigo-builder" draft_id="d-add-to-20" step_id="q2" intent="change" ask_ts="2026-10-30T09:00:00.000Z" author="owner">Lesson comment (change) from owner on draft d-add-to-20
Step: q2
> Make the boost shorter.
...</channel>
```

The session answers with the one tool, `reply {draft_id, in_reply_to, kind, text}`, where
`in_reply_to` is the ask's `ask_ts`. A reply to an ask the draft does not have is refused, so every
answer sits under the comment it answers. A comment never edits the lesson: the session changes the
draft through the jadwigo MCP, and the page redraws from the file.

## Install

Channels are a Claude Code research preview. A channel Claude does not ship loads only with a
development flag, and Claude shows a warning dialog when the session starts.

Register the server for your user once, from the checkout you build in (the owner's step):

```bash
claude mcp add-json --scope user jadwigo-builder '{"type":"stdio","command":"bun","args":["'"$PWD"'/tools/builder/channel.ts"]}'
```

Then start the session from the repo root:

```bash
make builder                   # ARGS="--model opus" passes more to claude
```

`make builder` (`launch.ts`) first asks `claude mcp get` for `jadwigo-builder` and `jadwigo`, and
stops with the line to run when either is missing (jadwigo's is in `apps/cli/README.md`). Then it
mints a session id, writes `.builder/session.json`, and starts
`claude --session-id <id> --dangerously-load-development-channels=server:jadwigo-builder` with
`JADWIGO_BUILDER_SESSION` and `JADWIGO_DRAFTS_DIR` exported and `ANTHROPIC_API_KEY` removed. Claude
Code does not tell an MCP server its session id, so the launcher names it. Two seconds in, it reads
the started `claude`'s command line with `ps`, and stops the session with a plain refusal when the
flag is not there. `JADWIGO_CLAUDE_BIN` names another `claude`, which is how a test checks that
refusal.

The server is registered for every session, so it also starts in one without the flag. Claude Code
drops every channel message there, so the server checks its `claude` parent's command line with
`ps` and, when the flag is missing, sends and consumes nothing: an ask stays waiting for a session
that can hear it.

## Testing it

`bunx turbo run lint typecheck test --filter=./tools` runs `channel.test.ts`, which drives the
server over the SDK's in-memory transport. By hand: start a session as above, then append a line
to `<draft_id>.asks.jsonl` and watch it arrive in the turn within 2 seconds.
