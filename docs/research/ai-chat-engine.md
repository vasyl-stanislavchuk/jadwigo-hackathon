# Which engine runs Jadwigo AI, from a parent's chat to a lesson?

Issue: `dl-z5ja.2`

## The answer in 5 lines

1. **Recommendation: a Supabase-native engine, not Temporal.** It has 4 parts:
   - a `run` per chat turn;
   - an append-only `run_event` log;
   - a pgmq queue `agent_step`, where 1 step is 1 Muse API call plus its tool calls;
   - Realtime Broadcast to the browser, with a `pg_cron` sweep for deadlines.
2. This is PostHog's sandbox-runtime design (`docs/research/posthog-ai-runtime.md`) without its Temporal and without its sandbox.
   - PostHog keeps the LLM loop out of Temporal too.
   - Every job Temporal does there maps to a Postgres table, a pgmq job or a cron sweep.
3. The agent calls the **Muse API** (`POST api.meta.ai/v1/responses`) directly, with function tools over our own lesson and question code. The `muse` CLI stays the dev, authoring and bring-your-own-agent runtime.
   - We measured it: the API sends 5× fewer input tokens, gets prompt caching, and runs about 3 s faster per call.
4. **No sandbox in v1.** The agent calls typed tools and runs no code. A sandbox earns its cost only once the agent runs code or a parent brings an untrusted agent.
5. **One question stays open:** whether the step runs on a Supabase Edge Function or on a 2nd AWS Lambda. The owner decides it after a probe (`dl-z5ja.5`). Both sit behind one `runStep(runId)`.

## Method

**Read**
- jadwigo:
  - `infra/terraform/modules/app/api.tf`;
  - `apps/api/AGENTS.md` and `apps/api/src/index.ts`;
  - `supabase/README.md` and its migrations;
  - `packages/store/AGENTS.md`, `workflows/README.md`;
  - `apps/cli/src/jw/muse.py`, `apps/cli/mcp-tools.json`;
  - `tools/builder/`;
  - `docs/research/live-lesson-builder.md`, `docs/workstreams/ai-workflows.md`.
- The Muse measurements: `jadwigo-bank/experiments/direct_api/README.md` (`dl-n9fr.31.8`) and `claude-muse/docs/api-subset.md`.
- `muse --help`, `muse exec --help` and `muse serve --help` (Muse Code 1.4.14).
- Preply loop-your-lesson: `/Users/vasyl/projects/preply-hackathon/prepy-loop-your-lesson`, a Temporal-driven hackathon build.
- PostHog at `ffc17c0f0e7`, written up in detail in `docs/research/posthog-ai-runtime.md`.
- Vendor docs for Supabase, AWS and the sandbox providers (sources in the outcome block).

**Not done:** nothing was built, deployed or paid for. Vendor prices are as published on 2026-10-31. The 4 open questions are the probes `dl-z5ja.3`–`.6`.

## What the owner asked, 2026-10-31

> from registered screen - to chat with "Jadwigo AI" and to a lesson as a result. Parents (later tutor/teacher) shares a topic/request, maybe even a screenshot, AI thinks, and lesson is ready.

The owner's answers during the session:
- **Supabase:** "let's dive into leveraging Supabase to the max here. Supabase Queues is a way to go".
- **PostHog:** "Let's adopt Posthog patterns as much as possible", and "consider any kind of sandboxes".
- **Model:** "we're planning to run Muse models, as we're building for Meta hackathon right now".
- **The builder:** it becomes the parent's editor in the app: "a chat on the left, a lesson on the right".
- **Compute:** always-on compute is acceptable, "But can we stay serverless to most extent?"
- **Step consumer:** decide after a probe.

## What we have today

**Compute.** One Lambda, `jadwigo-api-${env}` (`infra/terraform/modules/app/api.tf`):
- `timeout = 10`, `memory_size = 256`;
- an HTTP API with `timeout_milliseconds = 10000`;
- 1 Postgres connection per instance;
- 1 transaction per request (`store.unit()`).

There is no SQS, EventBridge, Step Functions, function URL, streaming or second function. The only background job is `pg_cron`'s `expire-unclaimed-attempts`.

**Data.**
- Supabase Postgres 17, with `pod_id` and forced RLS on every table, and `jadwigo_api` never bypasses RLS (`supabase/README.md`).
- There are no chat, run or job tables, and no Realtime, pgmq or Edge Functions.
- `lesson_version` is immutable once published.
- Locally it is plain Postgres.app with no Docker (the guard denies `docker` and `supabase start`).

**AI.**
- A lesson is made in a local agent session through `jw mcp serve` (`lesson_draft`, `lesson_check`, `lesson_edit`, `lesson_show`, `question_*`). The draft is a file in `JADWIGO_DRAFTS_DIR`.
- `/playground/lesson` shows it through a dev-only Vite plugin, and comments reach the session through the `tools/builder` channel.
- No route creates a lesson. The owner imports one with `make lesson-import`.

**Model rules.**
- `jw.muse` allows only `muse-spark-1.3-contributor`, takes only prompts sealed by `jw.pii.guard`, and keeps the budget ledger.
- Real learner data never goes into a prompt.

## What Preply loop-your-lesson teaches

The build is in `/Users/vasyl/projects/preply-hackathon/prepy-loop-your-lesson`, from a 2-day hackathon.

**How it uses Temporal: as a remote job queue.**
- `backend/workflows/chat_agent.py` holds about 15 lines of workflow, which call **1 activity per chat turn**. That activity runs the whole agent loop: 5 min, 2 attempts.
- Around it sits about 650 lines of plumbing:
  - a Redis Streams → SSE side channel (`backend/stream/`), because Temporal doesn't stream;
  - an always-on Fargate worker (`terraform/modules/ecs/main.tf`);
  - Temporal Cloud;
  - a Docker or CLI dev server.

**Retries are unsafe in 3 ways.**
1. A retried activity saves the user message again and pays for the LLM again.
2. The first attempt has already written an error sentinel, which closes the client's stream, so the client never sees the retry.
3. LLM errors are caught and never raised, so Temporal's retry policy doesn't fire for them.

**Where Temporal would have paid off, it wasn't built.** The multi-step lesson pipeline (`LessonAnalysisWorkflow`) exists only in `docs/`. The docs themselves quote PostHog: "Skip frameworks, use a simple while-loop, add complexity only when needed."

**Lesson:** Temporal used as a job queue costs a worker, a side channel and a vendor, and buys no durability.

## What PostHog teaches

`docs/research/posthog-ai-runtime.md` has the detail. What matters here:
- **The LLM loop stays out of Temporal.** Durability is an append-only, sequenced event log plus a live tail.
- **The browser subscribes, fetches the log, dedupes and folds.**
- **Turn control** consists of follow-ups (queued and deduped), steers, approval events, a cooperative cancel flag and an inactivity timer.
- **Cost** is a `cap_usd` per run, with steers at 50% and 70% and a cancel at 90%.
- **PostHog's Temporal mostly works around Temporal:** `continue_as_new`, delta merging, a Postgres outbox. Its own README warns that "the abstractions are not leak-proof".

## The options

| | A. Temporal Cloud + a worker | B. AWS Lambda durable functions | C. Supabase-native (recommended) |
|---|---|---|---|
| What it is | Workflows and signals on Temporal Cloud; a container worker running activities | Checkpoint-and-replay functions: runs up to 1 year, each invocation up to 15 min, waits that cost nothing, callbacks for approvals | `run` + `run_event` + `run_inbox` in Postgres, pgmq `agent_step`, `pg_cron` sweep, Realtime Broadcast |
| Serverless | No: an always-on worker | Yes | Yes |
| Human in the loop | Signals and updates, first-class | Callbacks; 1 MB per callback payload | Rows plus a status flag (PostHog's own cancel is a flag) |
| Streaming to the browser | Still needs a side channel | Still needs a side channel | Realtime on the run's topic, replay from `run_event` |
| Durable history | Temporal history (2 MB payloads, history limits) | 1 MB per checkpoint, 100 MB per execution | `run_event`, ours, with RLS, queryable |
| Local dev with no Docker | `temporal server start-dev` binary | Hard | Postgres.app + pgmq installed as SQL; a `realtime.send` stub |
| New vendor / paid infra | Temporal Cloud + worker hosting | AWS only; Terraform and IAM | None beyond Supabase (+ 1 Lambda if probe (c) picks it) |
| Fits | Many long sessions, multi-day waits, fan-out, schedules, per-session sandboxes | AWS-only durability with long waits | v1 of chat → lesson |

**Temporal comes back** as a per-run actor over the same tables, the way PostHog uses it, the day we need any of these:
- runs that wait for days;
- fan-out generation (many lessons or variants);
- scheduled programs;
- per-session sandboxes.

## The recommended design (C)

### Flow

```
parent (web, chat pane)
  │ POST /api/v1/conversations/{id}/messages   (API Lambda, 10 s, one transaction)
  ▼
  insert run_inbox(msg_id unique) ; insert/continue run ; pgmq.send('agent_step', {run_id})
  │
  ▼  pg_net on enqueue (+ pg_cron sweep as the safety net)
step consumer  ── runStep(runId) ──────────────────────────────────────────────
  1. lock the run (advisory lock); stop if cancel_requested_at or status is final
  2. fold run_event + pending run_inbox into the Muse request (stable prompt_cache_key)
  3. POST api.meta.ai/v1/responses (stream) → deltas batched every 100–250 ms → Realtime Broadcast run:<id>
  4. execute its function calls: lesson_draft / lesson_edit / lesson_check / question_search …
     each writes run_event rows (tool_call, tool_result, lesson_patch) at seq = max + 1
  5. more to do → pgmq.send next step; approval needed → status awaiting_input; done → turn_complete, idle
  6. pgmq.archive(message)
  ▼
browser: subscribe run:<id> → buffer → select run_event where seq > cursor → dedupe by seq → fold
         into the chat pane (messages, tool lines) and the lesson pane (lesson_patch)
```

### Schema sketch

This is a sketch only. The migration is `dl-z5ja.7`, a one-way door the owner pushes. Every table carries `pod_id` and forces RLS.

- **`conversation`**: `id`, `pod_id`, `created_by`, `title`, `status` (`idle | in_progress | awaiting_input | canceling`), `draft_id`, `created_at`.
- **`run`**: one per turn.
  - Identity: `id`, `pod_id`, `conversation_id`, `resumes` (previous run).
  - `status` (`queued | in_progress | awaiting_input | completed | failed | cancelled`).
  - `attempt`, `cancel_requested_at`.
  - Deadlines: `idle_deadline_at`, `max_deadline_at`.
  - Cost: `cap_usd`, `spent_usd`.
  - Timestamps: `created_at`, `completed_at`.
- **`run_event`**: `run_id`, `seq`, `event_id`, `type`, `payload jsonb`, `created_at`, with PK `(run_id, seq)`. Insert only.
  - Types: `message`, `tool_call`, `tool_result`, `lesson_patch`, `approval_request`, `approval_resolved`, `status`, `usage`, `budget_steer`, `turn_complete`, `error`.
- **`run_inbox`**: `run_id`, `msg_id` (unique), `seq`, `kind` (`message | steer | approval | cancel`), `payload`, `status` (`pending | delivered`).
- **`lesson_draft` + `lesson_draft_revision`**: the right pane's state. Each `lesson_edit` writes a revision and a `lesson_patch` event. Publishing still goes through `lesson-import` into `lesson_version`.
- **Queues:** pgmq `agent_step` and `agent_step_dlq`. A step whose `read_ct` exceeds N is archived and moved to the DLQ, and its run is marked `failed`.
- **`pg_cron`**: one sweep about every 30 s. It re-enqueues runs that are `queued` but have no message, and fails runs past `max_deadline_at` (10 min idle while a turn is open, as at PostHog).

### Turn control

| Parent does | Engine does |
|---|---|
| Sends a message while a run is busy | Adds a `run_inbox` row. It is delivered in order at the next step and never joins a running Muse call. This avoids PostHog's lost-follow-up race by construction |
| Edits the lesson pane | Adds a `steer` inbox row, folded into the next step's context |
| Answers an approval card | `approval_resolved` + a pgmq step. Tools that publish, assign or change a learner's record need approval |
| Presses stop | Sets `cancel_requested_at`, checked before each step and each tool. The sweep closes the run |
| Reloads the page | Subscribe, then read `run_event` from `seq > cursor`, then dedupe and fold. Realtime's own replay (25 messages, private channels) is a bonus, not the source |

### Cost

- The `jw.muse` ledger becomes per-run: `cap_usd` on `run`, and `usage` events.
- At 50% the agent is steered to "finish the lesson with what you have". At 90% the run stops with a message to the parent.
- Prompts go through the PII guard, and a stable `prompt_cache_key` per template keeps the cache hit.

### Where the step runs (decided by `dl-z5ja.5`)

| | Supabase Edge Function | 2nd AWS Lambda |
|---|---|---|
| Limits | 400 s wall clock (paid; 150 s free), **2 s CPU**, 256 MB, 150 s idle response timeout | 15 min, memory as configured |
| Invoked by | `pg_net` on enqueue + Cron | `pg_net` → function URL + Cron |
| Code | Deno; our bun workspace packages need their own bundle | Our `bun build` bundle; `packages/store` and `contracts` as they are |
| Secrets / infra | Supabase secrets, no Terraform | Terraform + IAM (owner applies); the Muse key in AWS like the bank's search Lambda |
| Risk | 2 s CPU on large JSON and lesson checks | One more deploy target |

## Muse: API or CLI

| | `muse exec` / `muse serve` (CLI) | Meta API direct (`/v1/responses`) |
|---|---|---|
| Input tokens, long prompt | 30,233 (a fixed 24,200-token coding-agent prefix) | 6,051 |
| Cache on a repeat | 0 (new session key each run) | 6,001 cached with a stable `prompt_cache_key` |
| Whole call, median | 8.1 s | 5.2 s |
| USD per call | $0.0031 | $0.0001 |
| Brings | MCP, approvals, a sandbox, sessions and `resume`, `--image`, `--output-schema`, the MSP session host | Streaming, function tools; we write the loop |

Numbers are from `jadwigo-bank/experiments/direct_api/README.md`, whose verdict was "Production calls the API directly: **yes**".

The endpoint has gaps, listed in `claude-muse/docs/api-subset.md`:
- named `tool_choice` is refused;
- `stop_sequences` is refused;
- reasoning can't go below `low`;
- the reasoning tier travels in `output_config.effort`.

Image input and JSON-schema output through the API are not measured yet; that's probe `dl-z5ja.3`.

**Verdict:**
- The hosted engine uses the API, with our tools as function tools. These are the same verbs `jw mcp serve` exposes, so dev and prod share one tool set.
- The CLI stays for our own building, for authoring workflows, and for a parent's or teacher's own agent that connects over MCP.

## Sandboxes

PostHog needs a sandbox because its agents clone repositories and run Docker and CI. Our agent calls typed tools that check every write, so in v1 a sandbox would add a cold start, a binary and a bill, and protect nothing.

A sandbox becomes worth it when:
- the agent writes and runs code (an interactive widget, image processing);
- a parent brings an untrusted agent;
- we want PostHog-style per-session snapshots.

Options checked on 2026-10-31:

| Provider | Max session | Resume | EU |
|---|---|---|---|
| Modal (PostHog's choice) | 24 h | filesystem snapshots | yes |
| E2B | 24 h on Pro | pause with memory | Pro, on request |
| Daytona | idle auto-stop | disk kept, archive | yes |
| Vercel Sandbox | 24 h on Pro | snapshots | fra1, dub1 |
| AWS Bedrock AgentCore Runtime | 8 h | session filesystem | Ireland/Frankfurt |
| AWS Lambda MicroVMs | 8 h | suspend with memory | Ireland |
| Claude Managed Agents | — | — | not a fit: Claude models only, US-only geo |

## Supabase limits that shape the design

- **Realtime on Pro:** 500 messages/s, 500 connections, 3 MB broadcast payload. Each send counts once per receiver, so token deltas are batched every 100–250 ms.
- **Postgres Changes** checks RLS per subscriber on 1 thread, so it is not used for tokens.
- **Realtime replay:** private channels only, messages sent from the database only, 25 per request, about 72 h. That is why `run_event` is the history.
- **Authorization:** RLS on `realtime.messages` is evaluated at join and cached until the JWT refreshes.
- **pgmq:** no built-in dead-letter queue or retry policy; we build both from `read_ct`, `set_vt` and `archive`. `pop` is at most once, so we don't use it.
- **Cron:** at most 8 concurrent jobs, each under 10 min.
- **Edge Functions:** see the table above.

**Local dev:**
- pgmq is pure SQL (`DATA = sql/*`, nothing compiled), so it installs on Postgres.app and CI's PGDG Postgres (`dl-z5ja.4`).
- `realtime.send` and `realtime.messages` get a stub in `supabase/tests/shim.sql`.
- Realtime itself is tested on the dev project (`dl-z5ja.6`).

## What this means for jadwigo

- The engine work lives under the epic `dl-z5ja` (meta project). It follows `dl-a38n`, the dev live builder, and turns it into the parent's editor.
- The probes come before any migration:
  - `dl-z5ja.3`: Muse API image, schema and tools;
  - `dl-z5ja.4`: pgmq on local Postgres and CI;
  - `dl-z5ja.5`: the step consumer;
  - `dl-z5ja.6`: Realtime with RLS.
- The schema `dl-z5ja.7` waits on the probes and on the owner's choice in `dl-z5ja.8`.
- `jw mcp serve`'s lesson verbs become a shared tool layer: the hosted engine calls them as Muse function tools and local sessions call them through MCP. The draft moves from a file to `lesson_draft`.
- Nothing here changes `apps/api`'s 10 s rule. The API only writes the inbox row and enqueues.

```json jadwigo-outcome
{
  "issue": "dl-z5ja.2",
  "question": "Which engine runs Jadwigo AI, from a parent's chat to a lesson?",
  "answer": "A Supabase-native engine built PostHog's way: a run per turn, an append-only run_event log, a pgmq agent_step queue where one step is one Muse API call plus its function tools, Realtime Broadcast with replay from run_event, and a pg_cron deadline sweep; no Temporal and no sandbox in v1, with the step consumer (Edge Function or a 2nd Lambda) chosen by a probe.",
  "status": "answered",
  "sources": [
    "docs/research/posthog-ai-runtime.md",
    "https://supabase.com/docs/guides/queues/pgmq",
    "https://supabase.com/docs/guides/realtime/broadcast",
    "https://supabase.com/docs/guides/realtime/limits",
    "https://supabase.com/docs/guides/functions/limits",
    "https://docs.aws.amazon.com/lambda/latest/dg/durable-functions.html",
    "https://docs.temporal.io/",
    "https://modal.com/docs/guide/sandbox",
    "https://platform.claude.com/docs/en/managed-agents/overview"
  ],
  "owner_decisions": [
    {
      "question": "Which engine runs Jadwigo AI chat to lesson?",
      "options": [
        "A: Temporal Cloud with a container worker",
        "B: AWS Lambda durable functions",
        "C: Supabase-native: pgmq, run_event, Realtime and pg_cron"
      ]
    },
    {
      "question": "Where does one agent step run?",
      "options": [
        "A Supabase Edge Function",
        "A 2nd AWS Lambda reusing the bun bundle",
        "Whichever probe dl-z5ja.5 measures better"
      ]
    },
    {
      "question": "May a parent's screenshot go into a Muse prompt, given that the contributor model trains on what it is sent?",
      "options": [
        "No: the parent describes it in words",
        "Yes, after an OCR pass that keeps only the exercise text and drops names and faces",
        "Yes, only with a non-contributor model"
      ]
    }
  ],
  "proposed_issues": [
    {
      "title": "Probe: Muse /v1/responses with image input, JSON-schema output and function tools",
      "scope": "filed as dl-z5ja.3",
      "done_when": "each of the 3 is measured with request shape, answer, latency and USD",
      "depends_on": ["dl-z5ja.2"],
      "labels": ["project:jadwigo-hackathon"]
    },
    {
      "title": "Probe: pgmq installs as SQL on Postgres.app 17 and in CI, with a realtime.send stub",
      "scope": "filed as dl-z5ja.4",
      "done_when": "a send/read/archive round trip runs locally and in a CI sketch",
      "depends_on": ["dl-z5ja.2"],
      "labels": ["project:jadwigo-hackathon"]
    },
    {
      "title": "Probe: one agent step on an Edge Function vs a 2nd Lambda",
      "scope": "filed as dl-z5ja.5",
      "done_when": "wall clock, CPU, cold start and bundle effort are measured on both",
      "depends_on": ["dl-z5ja.3"],
      "labels": ["project:jadwigo-hackathon"]
    },
    {
      "title": "Probe: Realtime broadcast from the database with RLS on realtime.messages",
      "scope": "filed as dl-z5ja.6",
      "done_when": "another pod cannot join, and a reload replays from run_event without gaps or duplicates",
      "depends_on": ["dl-z5ja.2"],
      "labels": ["project:jadwigo-hackathon"]
    },
    {
      "title": "Schema: conversation, run, run_event, run_inbox and the agent_step queue",
      "scope": "filed as dl-z5ja.7, a one-way door",
      "done_when": "make migrate && make pgtap pass with cross-pod and append-only tests",
      "depends_on": ["dl-z5ja.4", "dl-z5ja.6", "dl-z5ja.8"],
      "labels": ["project:jadwigo-hackathon"]
    }
  ],
  "page_changes": [
    { "section": "ai-workflows workstream page, goal", "change": "Add the hosted path: the same lesson verbs as Muse function tools in the Jadwigo AI engine (dl-z5ja)" },
    { "section": "platform workstream page", "change": "Name the engine's tables and queue as platform scope once dl-z5ja.8 is decided" }
  ]
}
```
