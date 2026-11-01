# How does PostHog run its AI chat agent, and which of its patterns does Jadwigo copy?

Issue: `dl-z5ja.1`

## The answer in 5 lines

1. PostHog AI has 2 runtimes. The legacy one, a LangGraph loop called Max, is frozen. **All new work goes into the `sandbox` runtime.** There, a coding-agent-style server (`@posthog/agent`) runs in a Modal sandbox and reaches PostHog only through MCP tools.
2. Nobody runs the LLM loop durably inside Temporal:
   - Max runs a whole turn as 1 coarse activity and gets its durability from LangGraph checkpoints in Postgres.
   - The sandbox runtime keeps the loop inside the sandbox. Temporal only holds a per-run queue, timers and the sandbox's lifecycle.
3. The durable state is an **event log**. Each run has an append-only JSONL log in S3, which holds merged messages and never raw token chunks. The live view is a Redis tail, fed by strict-`seq` push ingest that refuses a gap. A shared `event_id` dedupes the seam between the 2.
4. The browser connects over SSE first, then fetches the log, dedupes the 2, and folds everything into the thread with 1 pure function. Reconnects resume from `Last-Event-ID`.
5. Most of what PostHog keeps in Temporal is a workaround for Temporal: `continue_as_new` for history size, delta merging for the 2 s deadlock detector, and a Postgres outbox so run starts don't depend on Temporal. Every piece has a Postgres equivalent (table at the end), which is why Jadwigo can copy the design on Supabase.

## Method

Read at PostHog `HEAD ffc17c0f0e7` (2026-10-31). Every path below is relative to `/Users/vasyl/projects/posthog-analytics/src/posthog`, written `PH/`. I checked that every cited file exists at that commit.

Also read the older notes `/Users/vasyl/projects/posthog-analytics/05-posthog-architecture/13-max-ai-architecture.md`, `14-ai-lessons-learned.md` and `15-temporal-workflows.md`. The section "Corrections to the older notes" lists where they are stale.

Public sources: https://posthog.com/blog/cloud-agents-runtime and https://posthog.com/handbook/engineering/ai/sandboxed-agents.

Not done: nothing was run. Line numbers are approximate and drift with the code.

## 1. Two runtimes

`PH/products/posthog_ai/README.md`:

> There are two runtimes, picked per conversation by `conversation.agent_runtime`. **`sandbox` is where all new work goes.** `langgraph` is the legacy runtime and is frozen — do not extend it.

Integration also changed. Products no longer add backend tools to the graph: "ship **MCP tools** for your product". The old `useMaxTool` / `MaxTool` / `MaxUIContext` APIs are listed under "Do not use".

### 1.1 Legacy Max (LangGraph, frozen)

**Graph.** `PH/ee/hogai/chat_agent/graph.py` runs a title generator, slash commands and memory, then a `ROOT ↔ ROOT_TOOLS` loop. The loop lives in `PH/ee/hogai/core/loop_graph/graph.py`, which is shared with the research agent. Agent modes (product analytics, SQL, replay, error tracking, …) are presets in `PH/ee/hogai/core/agent_modes/presets/`.

**Durability.** LangGraph checkpoints are stored in Postgres (`PH/ee/hogai/django_checkpoint/checkpointer.py`) across 3 tables: `ConversationCheckpoint`, `…Blob` and `…Write`. A daily Temporal sweep compacts them (`PH/posthog/temporal/ai/checkpoint_compaction/`). It uses a 7-day idle window because "~99.6% of resumes happen within a week".

**Temporal's role.** 1 workflow runs 1 coarse activity per turn (`PH/posthog/temporal/ai/chat_agent.py`):
- start-to-close 30 min, heartbeat 5 min, 3 attempts;
- the activity runs the whole graph and writes every chunk to a Redis stream;
- **every write to Redis is also the Temporal heartbeat.**

**Workflow ids.** `PH/ee/hogai/core/executor.py` starts `conversation-{id}` with `USE_EXISTING` and `ALLOW_DUPLICATE`, retries on `WorkflowAlreadyStartedError`, and polls `describe()` until the workflow is `RUNNING`.
- The fixed id makes reconnects simple: a second POST attaches to the running workflow.
- It also makes a race: a follow-up sent while a turn is closing joins the old execution and loses its message.
- PostHog's patches for that race:
  - queued follow-ups get their own workflow `conversation-{id}-queued-{qid}` (`PH/ee/hogai/queue.py`, at most 2 queued, Django cache, 1 h);
  - the copy to the new runtime's log runs as a detached child (`PH/products/posthog_ai/backend/conversation_mirror.py`, "keeping the copy out of that workflow keeps that window as short as it was before").

**Streaming.** Django reads the Redis stream (`PH/ee/hogai/stream/redis_stream.py`: `XREAD` block 50 ms, count 8, from `"0"`) and serves SSE with a keepalive every 15 s. A reconnect **replays the whole stream from the start**, and the frontend rebuilds the thread from scratch (`frontend/src/scenes/max/maxThreadLogic.tsx`). There is no cursor resume in this runtime.

**Approvals.** LangGraph `interrupt()` pauses the graph. The approval card is stored in `Conversation.approval_decisions` and resumed with `Command(resume=…)` (`PH/ee/hogai/core/runner.py`).

**Cancel.** `PATCH /conversations/{id}/cancel` runs these steps:
1. sets status `CANCELING` in Postgres;
2. calls `handle.cancel()`;
3. cancels sibling workflows found by id prefix (`WorkflowId STARTS_WITH "subagent-{id}-"`, executor.py:371/397);
4. clears the queue and the stream, then sets `IDLE`.

Each graph node checks the status flag before it runs (`PH/ee/hogai/core/node.py`), so cancel is **cooperative**.

**Subagents.** A `task` tool starts a separate stateless workflow per subtask (`PH/ee/hogai/tools/task.py`, `subagent_executor.py`).

### 1.2 The sandbox runtime (where new work goes)

- **Opening a conversation.** `POST /conversations/{id}/open/` calls `SandboxSession.open()` (`PH/products/posthog_ai/backend/message_routing.py`). It resolves the conversation to a `(Task, TaskRun)` pair and returns their ids. That endpoint does not stream.
- **The agent.** `@posthog/agent` (`PH/packages/agent/`) is a Claude Code- or Codex-style agent server. It speaks ACP inside the sandbox and calls PostHog through 1 MCP `exec` tool.
  - LLM calls go through PostHog's LLM gateway, or through the user's own Claude or ChatGPT subscription.
  - **They are not Temporal activities.**
- **Lifecycle.** The workflow `process-task` (`PH/products/tasks/backend/temporal/process_task/workflow.py`, about 3.7k lines) handles the rest:
  1. provisions the sandbox;
  2. starts the agent server;
  3. waits on signals with an inactivity timer;
  4. on teardown, snapshots the sandbox and destroys it.

## 2. Data model: what is durable, and where

**Conversation** (`PH/products/posthog_ai/backend/models/assistant.py`):
- `agent_runtime` is set once.
- `task` is a foreign key: "One Task per conversation for its whole life".
- `current_run` is derived as `task.latest_run`.
- `status` and `messages_json` belong to the legacy runtime.

**Task** (`PH/products/tasks/backend/models.py` ~405): `title`, `description`, `origin_product` (`posthog_ai`, `slack`, `user_created`, …), `runtime`, `repository?`, `options`, `json_schema`, `created_by`.

**TaskRun** (`models.py` ~2395):
- **Status:** `NOT_STARTED → QUEUED → IN_PROGRESS → COMPLETED | FAILED | CANCELLED`.
- **`state` is a JSON bag** with these groups:
  - sandbox: `sandbox_id`, `sandbox_url`, `sandbox_connect_token`, `sandbox_backend`;
  - the turn: `pending_user_message`, `pending_user_message_id`, `resume_from_run_id`;
  - snapshot: `snapshot_external_id`;
  - knobs: `inactivity_timeout_seconds`, `await_user_message` (warm), `systemPrompt`, `attached_context`;
  - control: `cancel_requested_at`, `budget_guard`, `stream_thin_tail`, `stream_presence_gated`, `workflow_id`.
- **Writes to `state`** happen under a row lock (`mutate_state_atomic`, `select_for_update` plus a mutator, ~2709).
- **`output`** is merged under a lock.
- **`artifacts`** is a manifest of files in S3.

**The run chain.** A finished run is never reopened for chat. The next message creates a **successor run** whose `state.resume_from_run_id` points at the previous one. `get_resume_chain()` walks those links, up to 10 deep (~2909). A fresh sandbox rebuilds the agent's session from the chain's logs (`PH/packages/agent/packages/agent/src/resume.ts`).

**Outbox.** `TaskWorkflowDispatch` (`models.py` ~3594, logic in `PH/products/tasks/backend/logic/services/workflow_dispatch.py`) makes starting a run independent of Temporal being up:
- statuses `pending / claimed / accepted / dead`, unique per `(task_run, dispatch_kind)`;
- claimed with `select_for_update(skip_locked=True)` and a lease;
- backoff `random.uniform(1, 2 ** min(attempt_count, 8))`.

**Ledgers.**
- `SandboxSession` (~3746) has 1 row per provider sandbox, recording TTL, resource shape, `prewarmed`, `user_attributed_at` (a warm sandbox isn't billed until a user claims it) and `ended_reason`.
- `SandboxEnvironment` stores per-team network levels and encrypted environment variables.

**Where each kind of state lives:**

| Store | Holds |
|---|---|
| Postgres | Task, TaskRun (status plus state), Conversation, the dispatch outbox, sandbox ledgers |
| S3 | 1 JSONL log per run (`{tasks}/logs/team_{t}/task_{t}/run_{r}.jsonl`, 30-day TTL tag), artifacts |
| Redis | The live tail (`task-run-stream:{run}`, 5000 entries, or 500 in thin-tail mode), `last-seq`, `generation`, `completed`, `agent-active`, throttle keys |
| Temporal | The follow-up queue in memory, timers, flags. Partly mirrored into `TaskRun.state` |
| Modal | Directory and filesystem snapshots |

## 3. The event log and the 3 kinds of id

**The log line** (written by `PH/products/tasks/backend/storage.py`; the agent side is `PH/packages/agent/packages/agent/src/session-log-writer.ts`):

```json
{"type":"notification","timestamp":"…","event_id":"<boot8>-<n>","first_event_id":"<boot8>-<m>",
 "notification":{"jsonrpc":"2.0","method":"session/update","params":{…}},"batch":"<id>"}
```

- **Idempotent append.** An append is a read-modify-write of the whole object under a Redis lock, and it skips a batch it already holds: `if f'"batch": {json.dumps(batch_id)}' in existing_content: return False`.
- **No raw token chunks.** `append_log` drops `agent_message_chunk` lines (`models.py` ~3017). The writer debounces 500 ms (5 s at most, 10 s once the log passes 4 MB) and merges chunks into 1 `agent_message` that carries the id range `first_event_id..event_id`.

**3 kinds of id. Don't merge them:**

| Id | Format | Purpose |
|---|---|---|
| ingest `seq` | integer 1..N per run | Transport only. Each event must be exactly `last + 1` |
| `event_id` | `<boot>-<n>`, where boot is 8 chars of a random UUID per agent-server boot | Stamped on both the live event and the log entry, so the seam between them dedupes |
| SSE `id:` | a Redis stream id, or `log-<n>` (an index into the parsed log of the run chain) | The client's resume cursor |

## 4. Live events: push ingest with no gaps

**Sender.** `TaskRunEventStreamSender` (`PH/packages/agent/packages/agent/src/server/event-stream-sender.ts`) POSTs NDJSON lines of `{"seq":n,"event":{…}}` to `…/tasks/{t}/runs/{r}/event_stream/`, and ends with `{"type":"_posthog/stream_complete","final_seq":N}`.

**Server.** `PH/products/tasks/backend/logic/stream/event_ingest.py` reads raw ASGI so Django doesn't buffer the body, then writes through `redis_stream.py`:
- **Accept** is a Redis `WATCH/MULTI` transaction:
  - `seq <= last` is a duplicate and is dropped;
  - `seq != last + 1` raises `TaskRunStreamSequenceGap`, answered with **409 and `last_accepted_seq`**, and the sender resyncs from there.
- **Completion** is accepted only when `last_seq == final_seq`.
- **Zombie sandboxes.** A per-run `generation` key rotates on every restart, so a sandbox left over from an earlier attempt gets **403 `stream_generation_mismatch`**.
- **Side effects run exactly once.** Analytics capture, push notifications and the like use pending and lock keys per `(side_effect, seq)` plus deterministic `uuid5` ids.

**Backpressure.**
- The sender buffers up to 20,000 events. When the buffer is full it drops events *before* giving them a `seq`, so a drop never creates a gap.
- An upload rolls at 900 events, 4 MB or 5 min, and each event is capped at 900 KB.
- The server takes at most 1000 events and 5 MB per request. A 413 also carries `last_accepted_seq`.
- **Presence gating.** With no viewer attached, the `seq` still advances but nothing is copied to Redis.

**The older path.** A Temporal activity tails the sandbox's `GET /events` SSE for up to 24 h (`…/process_task/activities/relay_sandbox_events.py`). It retries without limit, since "the agent server buffers events while no relay is attached and replays them on reconnect". It merges text deltas to 1 signal per second (`TEXT_DELTA_FLUSH_INTERVAL_SECONDS = 1.0`), because Temporal's history grows with every signal, and a long history slows replay past the 2 s deadlock detector (`TMPRL1101`).

**Event types** (`PH/packages/agent/packages/agent/src/acp-extensions.ts`):
- ACP `session/update`: `agent_message_chunk`, `agent_thought_chunk`, `agent_message`, `tool_call`, `tool_call_update`, `plan`, `user_message`.
- PostHog's own `_posthog/*`: `run_started`, `turn_complete`, `task_complete`, `error`, `progress`, `status`, `usage_update`, `permission_request`, `permission_resolved`, `budget_steer`, `compact_boundary`, `user_message`, `process_killed`.

## 5. The browser: subscribe, fetch, dedupe, fold

**Server side** (`PH/products/tasks/backend/presentation/views/api.py` ~4272–4594, `PH/products/tasks/backend/logic/stream/backlog.py`):
- The cursor comes from `Last-Event-ID`.
- **Thin-tail mode.** Redis keeps only the last 500 events. A client with no cursor gets the log replayed as `log-0..log-n` and then the live tail.
- A cursor that was trimmed or expired falls back to a full replay (`resume_point_trimmed`), so delivery is **at least once**.
- `has_gap_before()` detects the case where the log is behind the trimmed tail.
- Keepalive every 20 s. Each connection is capped at 15 min and then sends `event: end {"type":"rotated"}`. `event: stream-end` means the run is done, so the client stops reconnecting.

**Client side** (`PH/products/posthog_ai/frontend/logics/runStreamLogic.ts`, summarised in `PH/products/posthog_ai/frontend/AGENTS.md` §3):
1. `bootstrapRun` **opens SSE first and buffers frames**.
2. It fetches the log of the whole run chain.
3. It dedupes the buffer against the log by `event_id` and by merged ranges, so the seam neither repeats nor drops an event.
4. It folds the log into the thread with a pure function, `foldLogToThread`. The only in-place merge is `tool_call_update` per `toolCallId`.

**Resilience.**
- Reconnect backoff is 2/4/8/16/30 s: 10 attempts per drop, 30 in total. A connection that stays open 60 s or more counts as healthy.
- Up to 5 stream-token re-mints on 401.
- Once a permission request is handled its id is pinned, so a replay can't show it again.

## 6. Turn control: follow-up, steer, approval, cancel, completion

**Routing a user message** (`message_routing.py`):

| Run state | What happens |
|---|---|
| None yet | Create the task and run without starting the workflow. Seed `pending_user_message` and `systemPrompt` under a `select_for_update` on the Conversation. Commit, then dispatch (~255–347) |
| `QUEUED` / `IN_PROGRESS` | A Temporal signal `send_followup_message`. Append `_posthog/user_message` to the log **only after the signal is accepted** (~349–403) |
| Finished | Under the Conversation row lock, create a successor run with `resume_from_run_id`, the pending message and the snapshot to resume from. Dispatch after the lock is released (~405–474) |

**Delivering it inside the workflow.**
- Signals append `PendingFollowup` items with an arrival `sequence`. Messages are deduped by `message_id`, with at most `MAX_ACCEPTED_MESSAGE_IDS` kept.
- Ordinary messages go out **one at a time, in arrival order**. **A steer skips the queue** and is injected into the active turn. If the agent declines it (`steer_declined`), it goes back into the queue as an ordinary message.
- The agent server also dedupes, with `deliveredMessageIds` and `inFlightMessageDeliveries`.

**Approvals.**
1. The agent server's `relayPermissionToClient` broadcasts `permission_request`, persists `_posthog/permission_request`, and parks a promise.
2. Ingest sends an "awaiting input" push notification.
3. The client answers with `POST /command permission_response`. Django validates it and proxies it to the sandbox.
4. The agent persists `_posthog/permission_resolved`.

Which tools need approval is a regex over tool names, by default `(^|-)(partial-update|update|patch|delete|destroy)(-|$)`. Read-only tools are approved automatically.

**Cancel** (`PH/products/tasks/backend/facade/cancellation.py`):
1. Set `state.cancel_requested_at`.
2. Interrupt the turn in flight.
3. Signal `complete_task("cancelled")`, so the workflow snapshots and tears down.

With no workflow running, cancel finishes the run directly. A follow-up that arrives mid-cancel gets "still stopping, try again".

**Turn completion and liveness.**
- The agent emits `_posthog/turn_complete`. Ingest then sets `agent-active = 0` and signals the workflow, which may send a notification.
- Every event the agent generates also triggers a heartbeat, **at most once per 30 s** (Redis `SET NX` with a TTL), and the heartbeat resets the inactivity timer.
- On inactivity the run ends `completed`, or `failed` with "The agent stopped before finishing its turn" if a turn was still open.

**Timeouts** (`PH/products/tasks/backend/temporal/constants.py`):
- Inactivity: 1 h for user-origin runs, 30 min by default, **10 min for PostHog AI**, capped at 2 h.
- In-flight turn floor: 10 min, because "a single model call over a large context can run a few minutes without emitting an event".
- Warm idle: 10 min.
- Optional hard wall-clock cap, which heartbeats never reset.

## 7. The sandbox

**Provider interface.** `SandboxBase(ABC)` in `PH/products/tasks/backend/logic/services/sandbox.py` (~455) defines `create`, `execute`, `execute_stream`, `write_file`, `get_connect_credentials`, `start_agent_server`, `wait_for_agent_server_ready`, `create_snapshot`, `create_directory_snapshot`, `destroy`, `is_running`. Implementations:
- Modal (production, gVisor or VM);
- Docker (local dev);
- an in-house provider.

**Config.**
- Defaults: 16 GB, 4 cores, 64 GB disk.
- Burstable sizing ("Modal bills max(request, actual)").
- `ttl_seconds` of 6 h is only a safety net; "workflow inactivity timeout handles cleanup".
- Network: a per-team domain allowlist compiled by `network_policy.py`. Note that "An empty domain allowlist means unrestricted network in Modal", so a run that must have no egress has to say so explicitly.

**What goes in.**
- The image comes with `@posthog/agent` pre-installed. The launch command passes `--mcpServers '<json>'`, `--allowedDomains` and a permission regex.
- Old snapshots may carry an older agent, so the launcher checks the binary for a flag before passing it.

**MCP config.** 1 HTTP MCP server named `posthog`. The run's OAuth token goes in a header, and so does the task id ("the LLM never handles its own task id").

**Snapshots and rotation.**
- Teardown always takes a directory snapshot, and the successor run carries it forward.
- 10 min before the provider's TTL the run rotates to a fresh sandbox, **but only when idle**: no active agent, no open turn, no follow-up in flight. Otherwise it only snapshots.

**Warm runs.** `PH/products/tasks/backend/logic/services/warm.py`: opening a conversation with an empty message boots a run with `await_user_message = true`. The first real message activates it.
- Caps for PostHog AI: 2 per user, 10 per org.
- The AI-credits quota is checked first.

## 8. Tokens, cost and the budget guard

**Tokens are per run, with separate audiences** (`PH/products/tasks/backend/temporal/oauth.py` and `connection_token.py`):

| Token | Audience / scope | Lifetime |
|---|---|---|
| OAuth access token for MCP and REST | Scope preset `read_only` or `full` | about 6 h |
| Connection JWT (Django → sandbox `/command`) | its own audience | 24 h |
| Event-ingest JWT | its own audience; carries `generation` and thin-tail flags | sandbox TTL + 1 h |
| Stream-read JWT (browser) | its own audience | 15 min |

Before Django proxies to a sandbox URL it checks the URL against an allowlist, to block SSRF.

**LLM gateway.**
- The sandbox never holds provider keys: `ANTHROPIC_BASE_URL` and `OPENAI_BASE_URL` point at PostHog's gateway.
- Each run mints a scoped gateway token pinned to a product, with **`cap_usd`** and a TTL (`PH/products/tasks/backend/temporal/process_task/ai_gateway_token.py`).
- A per-product model allowlist decides which models a run may use; a change of model outside it is refused.

**Budget guard (agent side).** It prices every assistant message, then:
- at **50%** of the cap steers the model to "ship what is on disk";
- at **70%** to "commit and stop", and denies the expensive tools;
- at **90%** cancels the turn with `budget_exhausted`.

It emits `_posthog/usage_update` and `_posthog/budget_steer`.

**Metering.** Token cost comes from the gateway, and compute cost from the sandbox ledger. Quotas are checked before any spend. A run on the user's own Claude or ChatGPT subscription is never given the gateway scope.

## 9. Temporal's real role, and what replaces each piece

PostHog's own guidance (`PH/posthog/temporal/README.md`): "When using Temporal, you accrue a maintenance burden and increased complexity… the Temporal abstractions are not leak-proof."

**Temporal-shaped workarounds PostHog maintains:**
- Payloads over the 2 MB limit are cut down before they are sent (`_strip_large_spend_history`).
- History growth forces `continue_as_new` and delta merging.
- The outbox exists so a run can start while Temporal is unavailable.
- A parent/child workflow rewrite with ACK and retry signals is in progress (`PH/products/tasks/backend/temporal/task_management/`, `execute_sandbox/`).
- About 40 task queues, each with its own worker fleet (`PH/posthog/settings/temporal.py`).
- A worker fleet "stays pinned at its seed digest forever" without a deploy trigger step.

**Every piece maps to Postgres:**

| Temporal piece | Postgres / Supabase replacement |
|---|---|
| Workflow start | Outbox, or `pgmq.send` in the same transaction that creates the run. The visibility timeout is the lease, `read_ct` counts attempts, then archive or dead-letter |
| Follow-up / steer signals | A `run_inbox` table with a unique `msg_id`, plus a pgmq job. One delivery per run at a time (advisory lock). A steer skips the line |
| Heartbeat / activity signals | A `last_activity_at` column, updated at most every 30 s |
| Inactivity, wall-clock and rotation timers | Deadline columns plus a `pg_cron` sweep that enqueues teardown |
| `continue_as_new` | Not needed. It exists only for history size |
| Cancel signal | A `cancel_requested_at` column, checked at each step |
| Permission-response signal | Not needed. It's a row (or a proxy call) |
| Activities with retries | pgmq jobs run by a serverless consumer |
| A blocking 35-min follow-up delivery | Fire-and-acknowledge, then learn about completion from the `turn_complete` event |
| Redis tail + `Last-Event-ID` | A `run_event` table with `PK(run_id, seq)` for history, and Realtime Broadcast for the live tail |

## Corrections to the older notes (13–15)

- **13.** Max is no longer the runtime new work goes into; the sandbox runtime is.
  - Checkpoints use 3 tables, not 2.
  - Clients do **not** "resume from last message ID" in Max: a reconnect replays the whole stream. Cursor resume exists only in the sandbox runtime.
  - Timeouts are 30 min with a 5 min heartbeat, not 10 min / 30 s.
- **14.** "A single loop beats subagents" no longer holds (there is a `task` tool).
  - "Frameworks considered harmful" became: LangGraph is frozen, and the new runtime is an external agent plus MCP.
  - The model mix it describes is out of date.
- **15.** There are about 40 task queues, not 17.
  - Session summaries and realtime cohorts are gone.
  - Most workflows moved to `PH/products/*/backend/temporal`.
  - AI work is **1 coarse activity per turn**, not 1 activity per LLM call.

## What this means for jadwigo

PostHog's sandbox runtime has the shape we want: an agent that calls our tools, an event log, a live view, and a human who can steer, approve and cancel. We take the design and leave the Temporal and the sandbox. `docs/research/ai-chat-engine.md` carries the engine decision.

| PostHog | Jadwigo | Verdict |
|---|---|---|
| Conversation → Task → TaskRun chain, `resume_from_run_id` | `conversation` → `run` per turn, `resumes` | copy |
| S3 JSONL log, merged messages, idempotent `batch` | `run_event`, append-only, `PK(run_id, seq)`, no raw deltas | copy, in Postgres |
| 3 kinds of id | `seq` (transport and cursor) and `event_id` (dedupe) | copy |
| Strict-`seq` ingest, 409 + `last_accepted_seq`, `generation` 403 | The step consumer inserts at `max + 1` under a per-run lock; a stale attempt is refused by `attempt` / `generation` | adapt |
| Redis tail + SSE + `Last-Event-ID` | Realtime Broadcast on a private topic for the live tail; history is `run_event where seq > cursor` | adapt |
| Subscribe → fetch → dedupe → pure fold | The same, into 2 panes: chat and lesson | copy |
| Follow-up queue, steers skip the line, dedupe by message id | `run_inbox` with a unique `msg_id`; a steer goes into the next step | copy |
| `permission_request` / `_resolved`, regex over mutating tools | `approval_request` / `approval_resolved` events; tools that publish or assign need approval | copy |
| Cancel flag + interrupt + teardown | `cancel_requested_at`, checked at each step and before each tool | copy |
| Inactivity timer, 10 min turn floor | Deadline columns + `pg_cron` sweep | adapt |
| Outbox / dispatch | `pgmq.send` in the run's transaction | adapt |
| Run-scoped tokens with distinct audiences | Supabase JWT for the parent; the step consumer is the only writer | adapt |
| Gateway `cap_usd`, steer at 50% / 70%, cancel at 90% | Per-run `cap_usd` on the Muse ledger, same thresholds | copy |
| Warm runs | — | skip for v1 (no sandbox to warm) |
| Sandbox, snapshots, rotation, network policy | — | skip for v1; revisit when the agent runs code |
| Temporal `process-task` | — | skip; Postgres + pgmq + `pg_cron` |

```json jadwigo-outcome
{
  "issue": "dl-z5ja.1",
  "question": "How does PostHog run its AI chat agent, and which of its patterns does Jadwigo copy?",
  "answer": "PostHog's new sandbox runtime keeps the LLM loop out of Temporal: a sequenced, append-only run log plus a live tail carry the state, and Temporal only holds a per-run queue and timers, each of which maps to a Postgres table, pgmq job or pg_cron sweep. Jadwigo copies the run chain, the event log, the replay-and-fold browser model, the follow-up/steer/approval/cancel controls and the budget guard, and skips the sandbox and Temporal for v1.",
  "status": "answered",
  "sources": [
    "https://posthog.com/blog/cloud-agents-runtime",
    "https://posthog.com/handbook/engineering/ai/sandboxed-agents",
    "https://github.com/PostHog/posthog/tree/master/products/tasks/backend/temporal/process_task",
    "https://github.com/PostHog/posthog/blob/master/products/posthog_ai/README.md"
  ],
  "owner_decisions": [],
  "proposed_issues": [],
  "page_changes": [
    { "section": "ai-workflows workstream page", "change": "Link this note as the reference design for the hosted Jadwigo AI engine (dl-z5ja)" }
  ]
}
```
