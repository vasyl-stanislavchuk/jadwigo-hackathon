# How does a lesson render, and talk back, while the AI drafts it through the MCP?

Issue: `dl-a38n`

## The answer in 5 lines

1. The draft becomes a file. `lesson_draft` and `lesson_check` write `<draft_id>.json` and `<draft_id>.check.json` into one stable directory (`JADWIGO_DRAFTS_DIR`) on every call, empty help rungs allowed. That file is the shared state between the agent and the page; nothing else is needed.
2. The page is `/playground/lesson` in `apps/web`: the newest draft, part by part and step by step, drawn by `FamilyView` in preview mode with a key toggle, a help-rungs strip, "try it" through the playground's `TryExample`, and every check finding pinned to its step. A Vite plugin watches the directory and pushes the draft over HMR.
3. The syntax stays the JSON lesson file (`packages/lesson-import/src/lesson-file.ts`, zod). What we copy from md drops is its mechanisms, not its blocks: one typed model is the source of schema and types, every finding names a path and a fix, the check lists everything rather than the first error, an unknown block draws a card instead of crashing the page.
4. The page talks to the session the way md annotate does: a comment pinned to a step goes into a per-draft asks file; a small MCP channel server (Bun, TypeScript, ported from md's `md-inbox`) delivers it to the running Claude Code session as `notifications/claude/channel`, and the session answers through a `reply` tool that the page shows.
5. What the AI did is read from its own transcript, never from a prompt: one plain line per tool call, failures never fold into successes, only file basenames, a summary frozen onto each reply, plus lines for the `lesson_draft` and `lesson_check` calls themselves.

## Method

Read, with no code run beyond `--help` and `bd show`:

- jadwigo: `apps/cli/src/jw/lesson.py`, `commands/mcp.py`, `packages/lesson-import/src/{lesson-file,compile,check}.ts`, `packages/lesson-kit/src/{index.ts,families/view.ts,families/help.ts}`, `apps/web/src/playground/{PlaygroundScreen.tsx,route.ts,panels/*}`, `apps/web/src/App.tsx`; the open beads under `dl-e8ov.5.38`, `dl-u1y5` and `dl-hin8`.
- md drops: `medallion-dev-cli/src/medallion_dev/drop_{blocks,spec,schema,markdown,lint,check,catalog,feedback,eject}.py`, `drop_runtime/` (CONTRACT.md, `src/blocks/table/`), `docs/drops/`; the lesson-blocks drop's source in david-learns `docs/drops/lesson-blocks/` and `docs/research/lesson-block-contract.md`.
- md annotate: `docs/annotate/README.md`, `integrations/md-inbox/server.ts`, `templates/vite_config_md.mts`, `templates/md_review_client.js`, `share_review_ops.py`, `inbox_channel.py`, `commands/annotate.py`.

Not done: nothing was built or timed; the channel flag was not tried in this session.

## What exists today

**The MCP.** `jw mcp serve` (`apps/cli/src/jw/commands/mcp.py`) offers `lesson_draft` and `lesson_check` beside the bank tools. `lesson.draft()` (`apps/cli/src/jw/lesson.py:162`) searches the bank, draws, loads each item's family step and returns the draft with empty help. `lesson.check()` (`:378`) refuses a draft with an empty rung, builds the lesson file, writes it under `tempfile.gettempdir()/jw-lessons` (`:375`) and runs `bun packages/lesson-import/src/check.ts <file> --json`. So the only file a page could watch today is written once, after every rung is filled, into a temp directory the `jw` process Claude Code launches and a Vite dev server need not share.

Two lanes of `dl-e8ov.5.38` are changing this as this note is written: `dl-e8ov.5.38.10` keeps the draft under a `draft_id` in jw's temp dir and takes help back by `step_id`; `dl-e8ov.5.38.11` adds `mistake_classes` to `check.ts --json`. The decision in force, `jadwigo-ai-workflows/decisions/2026-10-30-lesson-from-the-bank-copies-the-bank-question-whole-then-adapts`, means a fresh draft already plays as is, which is what makes rendering it from the first call worth doing.

**The file.** A lesson file is `{id, title, language, category, subject, reasoning, kind?, script:{parts:[{part, steps}]}}` and a question step is `{id, question_type, skill_ids, based_on, say, question:{family, data, key, help?}, credit?}` (`packages/lesson-import/src/lesson-file.ts:68-102`). `check.ts` reports parse errors and the first compile error only; `compile.ts:154` imports `node:crypto`, and `index.ts` exports `compileLessonFile` but not `parseLessonFile`, so nothing in it runs in a browser yet.

**The renderer.** `packages/lesson-kit` exports `FamilyView` with a `mode` union `play | solution | review | preview | print`; preview is "inert, for an author" with `answerKey` and `showKey` (`families/view.ts:35-41, :139`). `HelpLadder`, `helpNext`, `pageHelpOf`, `StepFrame` and `LessonFrame` are exported too. The playground in `apps/web` already renders from memory once it has data: `panels/question.ts:36 specOf` turns a written example into a `FamilySpec` with the twin on rung 4, `TryExample.tsx` with `tryState.ts` plays one question and releases help on the client, `ModesPanel.tsx` draws the five modes side by side, and `PlaygroundScreen` takes an injectable client (`examples/fixture.ts`). What is missing is a whole-lesson view and an adapter from a lesson file to `FamilySpec[]`. The playground sits at an unlisted path and loads on demand (`apps/web/src/App.tsx:21-29`), and it shows keys, so a lesson view beside it changes nothing about who sees what.

## What md drops gives us

md drops (`md drops --help`, `docs/drops/`) builds a page from blocks. The mechanisms worth copying, with where each lives:

- **One typed model is the source of truth.** A frozen dataclass per block (`drop_blocks.py:379` for `Table`), from which the JSON Schema, the TypeScript types and the defaults are generated (`drop_schema.py:37-114`, `drop_runtime/scripts/gen-types.mjs`). Jadwigo already has this through zod and `packages/contracts`' JSON Schema snapshots; the lesson file's zod schema is the model.
- **Errors name a path and list the allowed values.** `blocks[3].tone: expected one of "", "accent", …, got "red"`; an unknown field lists the fields the block takes (`drop_spec.py:203-240`). A markdown error names the line and the fix (`drop_markdown.py:634`). An AI author fixes these without reading code.
- **A check is a list of findings, never the first error.** `Finding(line, level, rule, text, path)` (`drop_lint.py:59-66`); rules such as `typed-cell` and `untyped-column` are named so feedback can cite them.
- **The page never dies on a bad block.** The runtime's registry is typed with `satisfies`, so a block type added without a component fails `tsc`; an unknown type draws a visible card, and each block has an error boundary (`drop_runtime/src/Block.tsx:14-39`).
- **A catalog an AI reads first.** `md drops blocks` prints every block with its feedback counts, `md drops blocks table` gives fits-when, not-for, the markdown form, limits, a live example and open beads, and `md drops feedback NAME "note"` files a bead against the block (`drop_catalog.py:100-112`, `drop_feedback.py`). Jadwigo's counterpart is `jw question-type list --json` and the question-type pages at `/playground/<family>/<type>`.
- **The table** (`drop_runtime/src/blocks/table/`, TanStack): typed columns (`text, number, count, percent, money, date, duration, id, copy`), badges with tones that sort by rank and become facets, a details paragraph under a row, a tone per row, clamped cells with a panel, and `#row` anchors from an id column. It has no inline edit; per-cell comments come only from a separate comments bundle. For the builder, the table is the lesson's overview: one row per step with skill, family, key, rungs filled and findings, tinted by the worst finding, each row an anchor the rendered step and a comment can point at.

What md drops does not have: a watch mode or live preview (`md drops render` is run by hand; the runtime's own `npm run dev` serves fixtures), answer state, keys kept off the page, a judge or hint release. Those are the lesson's, and the lesson-blocks drop's contract already says it: "copy md drops' mechanisms, not its blocks" (david-learns `docs/research/lesson-block-contract.md:576`). Its build loop is the loop this builder closes: catalog, fit table, script, `jw lesson new`, `jw lesson check`, preview, publish.

## What md annotate gives us

`md annotate on` turns a React app's dev server into a review surface: Option-click an element, write a comment, and it reaches the Claude Code session bound to that checkout. The pieces, with where each lives in `medallion-dev-cli`:

- **The channel server** (`integrations/md-inbox/server.ts`, Bun and TypeScript, about 400 lines) declares `capabilities: { experimental: { 'claude/channel': {} } }`, delivers each comment as `server.notification({ method: 'notifications/claude/channel', params: { content, meta } })`, polls every 5 s with an `fs.watch` wake so a comment lands in about 1 s, consumes each one after notifying, and keeps a heartbeat lease so a fallback never types the same comment twice. It offers one tool, `reply {work_id, text, in_reply_to, kind: progress|done|question|note}`.
- **The flag.** Claude Code loads it with `--dangerously-load-development-channels=server:md-inbox` (`inbox_channel.py:20-21`), with a warning dialog; channels are a research preview. Claude Code does not tell an MCP server its session id, so md's launcher mints one, passes `--session-id`, and exports it for the server (`clients/cmux.py:141-142`). A session started without the flag silently drops every notification: on 2026-10-19 seven comments were lost that way, and md now checks the `claude` process's command line with `ps` before binding (`inbox_channel.py:69-88`).
- **The Vite side** (`templates/vite_config_md.mts`): middleware for `POST /ask`, a loopback admit gate that requires a loopback socket, a localhost `Host`, a loopback `Origin` and an `X-MD-Review: 1` header on writes (`:728-763`), a 64 KB body and 1 comment per 2 s; the result goes back over Vite's own HMR socket, `server.ws.send({ type: 'custom', event: 'md:review' })`, read with `import.meta.hot.on`.
- **Honest activity** (`share_review_ops.py:994-1153`). No hooks: md tails the session's transcript, `~/.claude/projects/<slug>/<session>.jsonl`, and maps each `tool_use` to a plain line: Read becomes "Reading X.tsx", Grep "Searching the code", Edit "Editing X", Bash "Running tests" or "Running a command". Repeated lines fold, a failed call never folds into successes and reads "Couldn't edit X", only basenames reach the page, and a summary `{steps, calls, failed, read, changed}` is frozen onto each reply because the transcript keeps growing. The widget shows whose turn it is and says so plainly: "Claude did not see your comment", "Claude stopped without answering", "N ahead of yours".
- **Anchoring.** md walks the React fiber to `_debugSource` for file and line, which needs React 18 or earlier. A lesson builder anchors to the step id instead, which removes that limit.

## The design

```mermaid
flowchart LR
  subgraph session [Claude Code session]
    A[agent] -- lesson_draft / lesson_check --> M[jw mcp serve]
    C[jadwigo-builder channel] -- notifications/claude/channel --> A
    A -- reply tool --> C
  end
  M -- writes --> D[(JADWIGO_DRAFTS_DIR/&lt;draft_id&gt;.json + .check.json)]
  C -- reads asks, writes replies --> F[(&lt;draft_id&gt;.asks.jsonl / .replies.jsonl)]
  D -- fs.watch --> V[Vite plugin apps/web/dev]
  F -- fs.watch --> V
  T[(~/.claude/projects/…/&lt;session&gt;.jsonl)] -- tail --> V
  V -- HMR custom events --> P[/playground/lesson]
  P -- POST /@builder/ask --> V
  V -- appends --> F
```

Three layers, each a lane in `docs/worklog/dl-a38n/2026-10-30-wave-1.md`:

1. **The draft is a file.** `JADWIGO_DRAFTS_DIR` (a jw setting, default `~/.local/state/jadwigo/drafts`) replaces the temp dir. `lesson_draft` writes `<draft_id>.json` on every call and `lesson_check` rewrites it on every call, empty rungs allowed, and writes `<draft_id>.check.json` beside it. `check.ts --json` returns `findings: [{step_id, path, level: error|warn, rule, text, fix}]`, everything it can find, and keeps the old `errors` for one release. `parseLessonFile` is exported from an entry with no `node:crypto`.
2. **The page.** `/playground/lesson` lists the directory and shows the newest draft. An adapter in `apps/web/src/playground/lesson/adapter.ts`, beside `specOf`, turns a lesson file into `FamilySpec[]` per part (the twin as rung 4 with its own id and question type, pictures through `withMedia`). Each step is `FamilyView` in preview mode with a key toggle, a rungs strip (which of look, boost, almost, worked and the twin are written), a "try it" that reuses `TryExample`, and its findings. Above them the step table: n, skill, family, key, rungs filled, findings, a tone per row from the worst finding, and `#<step_id>` anchors. A Vite plugin (`apps/web/dev/builder-plugin.ts`, loaded only on `serve`) watches the directory and pushes `builder:draft` over HMR.
3. **The bridge.** `tools/builder/channel.ts` ports `md-inbox`: it watches `<draft_id>.asks.jsonl`, delivers each ask with `meta {draft_id, step_id, intent, ask_ts}`, and its `reply` tool appends to `<draft_id>.replies.jsonl`. `tools/builder/launch.ts` (`make builder`) mints the session uuid, exports it, starts `claude --session-id <uuid> --dangerously-load-development-channels=server:jadwigo-builder`, and refuses to continue when `ps` shows no flag. On the page, a comment pinned to a step carries an intent (change, question, note) and a state (sent, delivered, working, needs you, done), worded as md words it. The activity panel tails the transcript the launcher named, applies md's mapping rules, and adds lines for the MCP calls themselves: "Drew 6 questions from 2 sets", "Check: 2 errors in q3". Keys never leave the dev server's origin, and the page is the owner's tool at an unlisted path.

What a comment can do: change a rung's words, ask why a question was drawn, mark a step to drop or swap, ask for a twin. What it cannot do, by design: edit the lesson itself. The agent edits through the MCP, every edit lands in the draft file, and the page redraws. That keeps one writer per file and keeps the page honest about who changed what.

## Risks

- The channel flag is a research preview behind a warning dialog, and the transcript format is undocumented. Both are isolated behind two files (`channel.ts`, `activity/`) so a change in Claude Code costs a day, not the feature. Hooks (`PreToolUse`, `PostToolUse` posting to the plugin) are the fallback for activity; the Agent SDK is the fallback for the whole bridge if channels close.
- Two lanes of `dl-e8ov.5.38` hold `lesson.py` and `check.ts` now. The cli and import lanes of this wave start when `.10` and `.11` are on main.
- `claude mcp add` for the jadwigo server fails today (`dl-e8ov.5.38.9`); the launcher depends on the fix.
- The web dev server has no `VITE_MEDIA_URL` by default and a missing one fails silently (`dl-5ssh.97`); lesson pictures in the builder depend on it.

## What this means for jadwigo

- One epic, `dl-a38n`, in the meta project; four lanes in one wave, planned in `docs/worklog/dl-a38n/2026-10-30-wave-1.md`.
- `apps/web` gains a dev-only Vite plugin and a `/playground/lesson` page; `packages/lesson-import` gains a browser-safe parse and findings; `apps/cli` gains `JADWIGO_DRAFTS_DIR` and writes the draft on every call; `tools/builder/` gains the channel server and launcher.
- The question-type pages are the catalog; a later issue can print them as `jw question-type list --json` does, with fits-when and not-for, the way `md drops blocks` does.
- A markdown dialect over the lesson file, a rendered parent card, and Agent SDK hosting are the owner's calls, below.

```json jadwigo-outcome
{
  "issue": "dl-a38n",
  "question": "How does a lesson render, and talk back, while the AI drafts it through the MCP?",
  "answer": "The draft becomes a file in one stable directory that the MCP rewrites on every call; a dev-only page in apps/web watches it and draws every step with the lesson kit's preview mode and the check's findings; a comment on a step reaches the running Claude Code session through an MCP channel server ported from md annotate, which answers with a reply tool, and the AI's actions are read from its own transcript.",
  "status": "answered",
  "sources": [
    "https://drops.medallion.md/sites/jadwigo-lesson-blocks/",
    "https://drops.medallion.md/sites/jadwigo-data-model/lessons.html",
    "medallion-dev-cli/docs/annotate/README.md",
    "medallion-dev-cli/integrations/md-inbox/server.ts",
    "medallion-dev-cli/src/medallion_dev/templates/vite_config_md.mts",
    "medallion-dev-cli/src/medallion_dev/share_review_ops.py",
    "medallion-dev-cli/src/medallion_dev/drop_blocks.py",
    "medallion-dev-cli/src/medallion_dev/drop_spec.py",
    "medallion-dev-cli/src/medallion_dev/drop_runtime/CONTRACT.md",
    "david-learns/docs/research/lesson-block-contract.md",
    "apps/cli/src/jw/lesson.py",
    "packages/lesson-import/src/lesson-file.ts",
    "packages/lesson-kit/src/families/view.ts",
    "apps/web/src/playground/panels/question.ts",
    "jadwigo-ai-workflows/decisions/2026-10-30-lesson-from-the-bank-copies-the-bank-question-whole-then-adapts"
  ],
  "owner_decisions": [
    {
      "question": "Should the AI also write lessons in a markdown dialect (:::step, :::help) that compiles to the lesson file, the way md drops has a markdown form beside its JSON spec?",
      "options": [
        "No: the JSON lesson file with path-named findings is enough for an AI author, and one grammar is one less thing to drift",
        "Yes, later: a markdown form for the parts the agent writes by hand (say, the rungs, the twin), compiled to the file by lesson-import, with its own line-numbered errors",
        "Yes, now: the builder shows the markdown beside the render from the first wave"
      ]
    },
    {
      "question": "Does the parent ever see a rendered card of the draft (prompt, key, rungs, source), or is the card a developer's and the parent sees only the played lesson?",
      "options": [
        "A developer's only: the builder page is the card",
        "A parent's too: a read-only card page in the app, keys hidden, once the draft is imported",
        "A parent's with keys: the parent is the child's teacher here"
      ]
    },
    {
      "question": "When the channel preview changes or closes, which way does the bridge go?",
      "options": [
        "Hooks: PreToolUse and PostToolUse post each call to the dev server, comments are typed into the session",
        "The Agent SDK: the builder launches and streams the agent itself, no interactive CLI session",
        "Wait: the builder keeps the file-watch render and loses only comments and activity until channels settle"
      ]
    },
    {
      "question": "Does the builder stay a dev tool at an unlisted path, or does it become the parent's lesson editor in the app?",
      "options": [
        "A dev tool: the owner and agents use it, parents get lessons through the MCP and the app",
        "The parent's editor, later: the same page without keys and without the activity panel, behind the parent's sign-in",
        "The parent's editor, with the activity panel: a parent sees what the AI did to their child's lesson"
      ]
    }
  ],
  "proposed_issues": [
    {
      "title": "The question-type catalog an AI reads first: jw question-type list with fits-when, not-for, limits and a live example per type, the way md drops blocks prints its catalog",
      "scope": "apps/cli question-type verbs and the playground's question-type pages; no new block",
      "done_when": "jw question-type list --json names every type with family, fits_when, not_for, limits and the playground URL of its live example; jw question-type feedback <type> \"note\" files a bead labelled question-type:<name>",
      "depends_on": ["dl-a38n"],
      "labels": ["project:jadwigo-ai-workflows"]
    },
    {
      "title": "Activity from hooks: PreToolUse and PostToolUse post each tool call to the builder's dev server, as the fallback for the transcript tail",
      "scope": "tools/builder and apps/web/dev; the hooks are opt-in through make builder, never in .claude/settings.json for every session",
      "done_when": "with the hooks on, the activity panel shows a call before the transcript tail would, and a session without them loses nothing",
      "depends_on": ["dl-a38n"],
      "labels": ["project:jadwigo-ai-workflows"]
    }
  ],
  "page_changes": [
    { "section": "lesson-blocks drop, Build", "change": "Step 7, preview in the playground, becomes the live builder at /playground/lesson, open from the first lesson_draft call" },
    { "section": "apps/docs MCP page", "change": "Name JADWIGO_DRAFTS_DIR, the draft and check files, and make builder" }
  ]
}
```
