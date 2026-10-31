# How does PostHog keep its AI agent runtime alive in production, and what does Jadwigo copy?

Issue: `dl-z5ja.9`

## The answer in 5 lines

1. **They ship the agent as a pinned, smoke-tested artifact.**
   - Each sandbox image pins one `@posthog/agent` version and checks its sha256.
   - A bump merges only after 2 smokes: the image, and one real turn through the production gateway.
   - Runtime resolves the image to a digest and refuses the mutable tag.
   - Old snapshots are handled by probing what the agent binary can do, not by comparing versions.
2. **The run id is the trace.**
   - The trace id is the run UUID.
   - The gateway stamps it on every LLM generation.
   - Logs, metrics and the admin's log download all key on it.
   - There are no SLOs, alert rules or runbook for the AI queues: the run log and the trace *are* the debugger.
3. **Evals exist but gate nothing.**
   - There is an offline harness with seeded data and `--fail-under`, but no CI workflow runs it.
   - 2 eval workflows were deleted this year.
   - What blocks a bad release is the smokes. Quality in production is watched by online LLM-judge evaluations on sampled generations.
4. **Money is checked more than once.**
   - The AI-credit quota is checked when a run is created, when it is opened, and again when the run's gateway token is minted ("An unknown balance is no licence to spend").
   - A per-product `cap_usd` limits each run.
   - Throttles are 10/min and 100/day.
   - A run may start at most 10 child runs.
5. **Most of the last 6 months of fixes are the log's edges:**
   - zombie runs;
   - gaps between the live tail and the log;
   - lost or doubled follow-ups;
   - a late heartbeat reopening an ended turn;
   - a budget guard that fired too late.

   Jadwigo's foundation turns each one into a named test before it writes the code.

## Method

**Read:**
- At PostHog `HEAD ffc17c0f0e7` (pulled 2026-10-31; it did not move). Paths are relative to `/Users/vasyl/projects/posthog-analytics/src/posthog`, written `PH/`. Every cited path and commit was checked to exist at that HEAD.
- Git history for `products/tasks`, `products/posthog_ai`, `packages/agent` and `ee/hogai` since 2026-05-01: 2,239 commits. Picked by subject (fix, race, zombie, stuck, duplicate, gap, lost, replay, timeout), and checked by diff.
- Builds on `docs/research/posthog-ai-runtime.md` (`dl-z5ja.1`) and does not repeat it.

**Not done:**
- Nothing was run.
- The Helm charts live in `PostHog/charts`, which was not read.
- Which online evaluators PostHog actually has switched on is production data, not code.
- Line numbers are approximate.

## 1. Deploy: how the agent, the proxy and the workers ship

**The agent package to the sandbox image**

1. A change under `PH/packages/agent/packages/{agent,harness}` on master tags `agent-v*` (`PH/.github/workflows/desktop-agent-tag.yml`).
2. The release workflow publishes to npm and attaches the tarball and its sha256 to a GitHub release (`desktop-agent-release.yml` ~93, ~212). It then starts the bump workflow.
3. `PH/.github/workflows/update-sandbox-agent-version.yml` (also on a daily cron) opens "bump sandbox @posthog/agent to X". It waits for the image smoke, then runs `PH/.github/actions/sandbox-agent-gateway-smoke`: **one Claude turn and one Codex turn through the production gateway**. Only if both pass does a release app approve and queue the merge (~357). The nightly run smokes the image currently pinned and posts failures to Slack.
4. `PH/products/tasks/backend/sandbox/images/Dockerfile.sandbox-base` ~161–227:
   - pins `ARG AGENT_VERSION=2.4.305` with `AGENT_TARBALL_SHA256`;
   - installs the release tarball with a checksum;
   - fails the build if the installed version differs;
   - runs `agent-server --help` as the last step.

   The comment: "AGENT_VERSION is pinned, not 'latest'".
5. `PH/.github/workflows/cd-sandbox-base-image.yml` checks drift with an `inputs_digest` label, builds `ghcr.io/posthog/posthog-sandbox-base:<sha>`, smokes both architectures, and only then promotes it to `:master` (~686).
6. At runtime, `PH/products/tasks/backend/logic/services/modal_sandbox.py` ~380–470 resolves `:master` to `@sha256:…` (cached for 5 minutes) and **fails closed**: "refusing to fall back to the mutable :master tag because Modal caches images by reference indefinitely".

**Old snapshots carrying an older agent**
- `PH/products/tasks/backend/logic/services/sandbox.py` ~427–452 defines `AGENT_SERVER_CAPABILITY_TOKENS` and probes the binary with `grep -q <token>`, because "Sandboxes restored from old snapshots can carry an agent-server that rejects unknown CLI options".
- `PH/products/tasks/backend/logic/services/agent_server_launcher.py` ~770–785 then degrades:
  - no `autoPublish` means a review-first run;
  - no exec-permission regex means the flag is dropped;
  - no Pi runtime means the launch fails.
- When a resume snapshot's agent is too old, `provision_sandbox.py` (`_prewarmed_resume_needs_fresh_agent`) throws the sandbox away and provisions a fresh one.
- There is no semver gating anywhere.

**The ingest and stream service**
- `PH/services/agent-proxy/` is a Hono/Node service. Its routes are `POST /v1/runs/:run/ingest`, `GET /v1/runs/:run/stream`, `/_metrics` and `/_readyz`. It replaces the Python ASGI path.
- `PH/.github/workflows/cd-agent-proxy-image.yml` builds it and dispatches a `PostHog/charts` release.
- The switch-over is an environment variable, not a flag: `PH/posthog/settings/access.py` ~131–145, `TASKS_AGENT_PROXY_INGEST_URL`, "Reversible by clearing the env var". The old Django handler (`PH/posthog/asgi.py` ~179–196) stays as the fallback.

**Temporal workers**
- `PH/posthog/settings/temporal.py` names the queues: `max-ai-task-queue` (~353), `tasks-task-queue` (~384) and the evals queue (~502). The run limits are at ~168–223.
- `PH/.github/workflows/container-images-cd.yml` path-filters `maxAi` and `tasksAgent` (~415–450). It runs a boot check that imports web, temporal and celery (~377), then dispatches one chart release per worker fleet.

## 2. Observability: how a stuck or failed run is found

**One id for everything**
- `PH/products/tasks/backend/temporal/run_trace.py` derives the trace id from the run UUID. The agent side (`otel-trace-builder.ts`) and the log mirror use the same derivation: "Change all three together".
- `PH/packages/agent/packages/agent/src/server/gateway-env.ts` ~109–130 sends `task_run_trace_id`, the span id, `task_id` and `ai_stage` as `x-posthog-property-*` headers. So every `$ai_generation` the gateway records carries the run.
- `PH/docs/internal/sandboxes-setup-guide.md` ~375: a run opens in tracing as `/tracing?trace=<run UUID without dashes>`.

**Logs and metrics**
- `PH/products/tasks/backend/temporal/observability.py` ~97–140 binds these fields on every activity:
  - `run_id`, `task_id`, `origin_product`;
  - `sandbox_backend`, `boot_path`, `used_snapshot`.

  It emits `process_task_activity_{started,completed,failed}`. The event catalog is `PH/products/tasks/docs/INSTRUMENTATION.md`.
- `PH/products/tasks/backend/logic/services/run_log_mirror.py` writes the run log to stdout too, so the log pipeline indexes it by run.
- `PH/products/tasks/backend/metrics.py` has 58 `posthog_tasks_*` metrics. Examples: `task_run_failed_total`, `agent_turn_failed_total`, `sandbox_deadline_total`, `workflow_dispatch_dead_total`, and `workflow_dispatch_oldest_ready_age_seconds` (the age of the oldest undispatched run, the one number that says "the queue is stuck").
- The legacy runtime counts provider errors and gateway fallbacks: `PH/ee/hogai/utils/exceptions.py`, `PH/ee/hogai/llm.py`.

**Debugging by hand**
- `PH/products/tasks/backend/admin.py`:
  - `TaskRunAdmin.download_logs` (~89);
  - a staff `infrastructure/` view of image and workflow status.
- `PH/products/tasks/backend/temporal/execute_sandbox/activities/reap_orphaned_sandbox.py` reaps sandboxes no run owns.
- `PH/products/tasks/skills/analyzing-task-runs/SKILL.md` is a skill that reads a run log for you.

**What is missing**
- `PH/posthog/temporal/common/slo_interceptor.py` exists, but it is wired to the analytics-platform queue only (~96), and `SloArea` has one value.
- There are no SLOs, alert rules, dashboards or runbook for the AI or tasks queues.

## 3. Evals: offline, online, and what gates a release

**Offline**
- `PH/products/posthog_ai/eval_harness/` provides:
  - `SandboxedEval` and `OneShotEval`;
  - deterministic, judged and tracing scorers;
  - a CLI with `--fail-under <fraction>` (`harness/cli.py` ~206), run as `hogli evals`.
- Suites live in `PH/products/posthog_ai/evals/` and in 10 other products' `evals/`.
- Data is a seeded demo dataset with a copy per case (`PH/products/posthog_ai/evals/AGENTS.md`).
- Results go to PostHog's own offline-experiments project (`offline_config.py` ~236).

**No gate**
- No file in `PH/.github/workflows` runs the harness.
- `cd-ai-evals-image.yml` was removed in `e1dae0bdec1` (2026-05-25), and the replay vision evals in `6ae08f08082` (2026-10-20).
- What actually stops a bad agent release is the image smoke and the one-turn gateway smoke in section 1.

**Online**
- Each matching AI event starts a `run-evaluation` workflow (`PH/posthog/temporal/ai_observability/run_evaluation.py`), with sampling and conditions from `PH/products/ai_observability/backend/evaluation_conditions.py`.
- It runs LLM-judge, Hog and sentiment evaluators, on its own image and queue.

**Dogfooding**
- The legacy runtime sends `$ai_trace`, `$ai_span` and `$ai_generation` to PostHog's own project (`PH/ee/hogai/core/runner.py` ~82–240).
- It skips generations that went through the gateway, which records them itself.

## 4. Safety and cost in production

| Lever | Where | What |
|---|---|---|
| Quota before spend | `PH/ee/api/conversation.py` ~480 (`create`), ~734 (`open`) | `is_team_limited(..., AI_CREDITS)`: "Both warming and messaging launch a Run, so gate both" |
| Quota again at mint | `PH/products/tasks/backend/temporal/process_task/ai_gateway_token.py` ~245–287 (`ff23c1ce7af`) | Refuses the token when the balance lookup fails: "An unknown balance is no licence to spend" |
| Per-run cap | `PH/posthog/settings/temporal.py` ~122–143 | `cap_usd` default 10. Product defaults: `posthog_ai` 75, the background signal agents 20–30, the coding product 500. Product, then team, then default |
| Model allowlist | `PH/products/tasks/backend/logic/services/gateway_model_pin.py` ~60–90 | `PRODUCT_ALLOWED_MODELS`; an off-pin model is refused as `model_outside_pin` |
| Throttles | `PH/posthog/rate_limit.py` ~843–850 | 10/minute and 100/day per user on conversation create and open. Paying orgs skip the burst throttle |
| Fan-out | `PH/products/tasks/backend/facade/agent_run_starts.py` ~27 | `AGENT_RUN_FANOUT_CAP = 10` child runs per parent run, plus 30/hour and 100/day per user |
| Warm pool | `PH/products/tasks/backend/logic/services/warm.py` ~58–95 | 2 per user, 10 per org. An origin missing from the quota registry "cannot warm at all" (fails closed) |
| SSE | `PH/posthog/settings/web.py` ~1617 | 500 streams per process, then 503 with a jittered Retry-After |
| Network | `PH/products/tasks/backend/models.py` ~3984 | Default `FULL`, with the note "Default should be TRUSTED once we have an egress proxy" |

**Not found:**
- a moderation or abuse classifier;
- PII scrubbing of the run log (only targeted redaction of secrets and clone tokens);
- a cap on concurrent non-warm runs per user.

## 5. Failure modes they hit, and the fixes

| What broke | Commits | The fix |
|---|---|---|
| **Zombie runs and sandboxes** | `2b621b8db01` (2026-06-24) "end zombie cloud runs…", `66cba7f2e90` (2026-10-31) "reap training runs stranded by a lost sandbox" | A `SANDBOX_GONE` event ends the workflow when the sandbox disappears. Reapers and a reconciler close runs nobody owns |
| **Gaps between the live tail and the log** | `cb4188b081d` (2026-09-04), `ebb0a457855` (2026-09-11), `a3a0b272da2` (2026-07-15) | `has_gap_before` detects a hole before the oldest live entry ("Redis evicted events whose log batch never landed") and falls back to the log. In-flight chunks stopped counting as gaps. The tail was cut from 20k to 5k entries |
| **A stale writer after a resume** | `c54766909b8` (2026-10-16) "isolate streams across task resumes" | A per-run `generation`. An old sandbox gets 403 `stream_generation_mismatch` |
| **Lost follow-ups** | `07e5926b92a` (2026-08-21) "deliver pending user messages exactly once…", `84ebde9e18f` (2026-09-24) "stop the composer queue swallowing follow-ups" | Delivery by message id, exactly once. Cancelled queued prompts are dropped. The UI queue was reworked |
| **Duplicates after a refresh** | `05c4b854191` (2026-09-14), `4a982ffef0f` (2026-08-21) | "Only newly persisted turns can replace local echoes". A warm run no longer answers the first message twice |
| **An ended turn that reopens** | `fb0435a3341` (2026-09-14) "stop a late heartbeat from reopening an ended turn" | Ordering: a heartbeat after `turn_complete` is ignored |
| **Runs that never end** | `4f9d39c016e` (2026-09-24) "anchor the inactivity timeout on the last activity time", `57c128deeb7` (2026-08-07) "cap run duration independently of heartbeats" | **2 separate deadlines:** idle (reset by activity) and a hard wall clock (never reset) |
| **The budget guard firing too late** | `f67d1e771b4` (2026-09-21), `d999759f905` (2026-09-24) "fire the budget guard early enough to survive the cap", `e8fdee5292d` (2026-08-20) | Steer before the gateway refuses. Record `threshold_spent_usd`. Close 3 bypasses |
| **Steers** | `fb922f3934b` (2026-07-20), `d3f52579632` (2026-08-27) | Steers are negotiated, and a declined steer says why and goes back into the queue |
| **Temporal itself** | `d8f94f04407` (2026-07-16) "mitigate process-task workflow-task deadlocks (TMPRL1101)" | History trimming and delta merging (see `dl-z5ja.1`, section 9) |

The pattern: almost every fix sits on a boundary of the event log. Those boundaries are:
- a second writer;
- the seam between the tail and the log;
- the queue of messages the user sent;
- the moment a turn ends;
- the moment money runs out.

## 6. The run view

All under `PH/products/posthog_ai/frontend/`.

- **Progress.** `ThreadView.tsx` ~610 shows the latest `progress` text ("Setting up sandbox" while booting). `ActivityElapsedTime.tsx` ticks every second. A liveness dot pulses until the run is final.
- **Tool lines.** `components/tool/ToolActivity.tsx`:
  - each line starts **collapsed**;
  - its status is Pending, Running, Failed, Canceled or Incomplete, and a completed call shows no label;
  - a failure shows a red line without expanding;
  - expanding pauses auto-scroll;
  - 2 or more calls fold into one group.
- **Thinking.** `messages/ReasoningAnswer.tsx` streams live and then collapses to "Thought".
- **Approvals.** `components/PermissionInput.tsx` shows one headline, an evidence block (a diff or a preview) and the options. A double submit is guarded.
- **Errors.** `components/RunErrorRow.tsx`, with titles such as "Run stopped", "Agent stopped unexpectedly", "Message not delivered" and "Connection lost". Each has **Copy details**, which copies the task, run and trace ids.
- **Reconnect.** `logics/runStreamLogic.ts`:
  - backoff of 2/4/8/16/30 s;
  - 10 attempts per drop, 30 in total;
  - a quiet "Restoring conversation" line, then a failed card.
- **Stop.** The send button turns into Stop, then "Stopping…". Esc stops too.
- **Usage.** `components/ContextUsageChip.tsx` shows "Context 66% · $12.79", with a warning at 80% and danger at 95%. The budget steer itself is never shown.
- **Queued follow-ups.** `components/QueuedMessageList.tsx` shows "N queued", each editable with "Send now" (a steer). When a message is held, it says why: "The agent stopped, so these weren't sent…".

## 7. Background and scheduled AI on the same runtime

This is added because the owner said on 2026-10-31 that scheduled workflows (digesting, analysis, dreaming, report prep) are coming. They are **not** in the foundation.

**The runtime is shared.** `Task.OriginProduct` (`PH/products/tasks/backend/models.py` ~410–460) includes `workflow` ("Unattended; the run executes as the workflow's creator"), `signal_report`, `signals_scout`, `slack` and others. Chat and unattended work share 1 run table, 1 log and 1 budget guard.

**Schedules.**
- The nightly **dreaming** tick (`PH/products/context_layer/backend/temporal/dreaming.py`) is "one sandboxed run per enabled organization ... runs as a normal cloud task". It has:
  - `DISPATCH_CAP_PER_TICK = 1000`, rotating through the fleet;
  - a circuit breaker for a failure streak per org.
- Scouts (`PH/products/signals/backend/temporal/agentic/schedule.py`) use `ScheduleOverlapPolicy.SKIP`, so a slow tick never stacks a second one, with `MAX_RUNS_PER_TEAM_PER_TICK = 50` (`scout_harness/team_limits.py` ~65).
- Unattended workflows are capped at 100 runs/day per workflow and 500 per team (`PH/products/tasks/backend/logic/services/workflow_tasks.py` ~62–79).

**A human sees the result through an inbox, a push or Slack, or a review-first output** (a PR rather than an applied change). A per-user autonomy threshold decides what starts automatically.

For Jadwigo this means the foundation's `run` should not assume a chat. A nullable `conversation_id` and a `workflow` name are enough for now. Which workflows may run unattended is the owner's decision, against `jadwigo-ai-workflows/decisions/2026-10-31-a-report-runs-only-when-the-parent-asks-for-it-never-on-a-schedu`.

## What this means for jadwigo

These are aimed at the engine foundation (`dl-z5ja.10`). "v1" is wave 1 of `dl-z5ja`, which is local, in memory and engine-neutral.

| Area | PostHog | Jadwigo | When |
|---|---|---|---|
| `run_event` schema | `event_id` on live and log entries; `generation` per resume | `run_event {run_id, seq, event_id, type, payload}`. `event_id` is deterministic from `(run, attempt, call, item)`, so a replay is a no-op. `attempt` refuses a stale writer | v1 |
| `run_event` schema | Usage and budget as events | `model_response` carries the Muse response id and usage; `usage` and `budget_steer` are events | v1 |
| `run` deadlines | Idle timeout anchored on last activity, plus a separate hard cap | `idle_deadline_at` and `max_deadline_at`, 2 columns, never merged | v1 |
| The fold | Persisted turns replace local echoes; a late heartbeat can't reopen a turn | One pure `foldRun` plus `mergeLive`, which dedupes by `seq` and `event_id`. Each failure in section 5 becomes a named golden-log test | v1 |
| Step consumer | Exactly-once delivery by message id; cancelled prompts dropped | `run_inbox` with a unique `event_id`. A redelivered step reuses a recorded `model_response` and never pays twice | v1 |
| Step consumer | Smoke a real turn before a release | A 1-turn smoke against the real Muse API, gating the step consumer's deploy | later (after `dl-z5ja.3`, `.5`) |
| Step consumer | Image by digest; capability probes for old agents | Our bundle is one artifact per deploy; no sandbox, no snapshots | skip |
| Observability | Trace id = run id; gateway stamps it on every generation | The run id travels in every Muse ledger row and log line. "Copy details" in the UI copies the run id | v1 (ids), later (log pipeline) |
| Observability | `oldest_ready_age_seconds`; no SLOs | One query: the age of the oldest queued step and the runs past a deadline. That is the stuck-run alarm | later (with pgmq) |
| Evals | Offline harness that gates nothing | Golden event logs and scenario tests in `make check` gate every PR. The lesson-compose eval (`apps/cli/evals/compose`) is a separate journey gate | v1 (logs), later (journey gate) |
| Evals | Online LLM judge on sampled generations | Not before there are real parents | later |
| Cost caps | Quota at create, open and mint; fail closed on unknown balance | `budgetGuard` before every Muse call; an unknown `spent_usd` refuses the call | v1 |
| Cost caps | Per-product `cap_usd`; fan-out cap 10; 10/min, 100/day | `cap_usd` per run, set from the workflow; a per-pod daily cap and a per-parent throttle come with the routes | v1 (per run), later (per pod) |
| UX | Collapsed tool lines, "Copy details", Restoring, Stop, queued follow-ups | The chat pane of `/playground/chat` copies these. The budget steer is shown, unlike PostHog | v1 |
| Unattended runs | One runtime, `origin_product`, overlap SKIP, per-tick caps, inbox | `workflow` and a nullable `conversation_id` on `run`. Scheduling waits on an owner decision | later |

```json jadwigo-outcome
{
  "issue": "dl-z5ja.9",
  "question": "How does PostHog keep its AI agent runtime alive in production, and what does Jadwigo copy?",
  "answer": "PostHog ships a pinned, smoke-tested agent (an image plus a one-turn gateway smoke gate every release; evals exist but gate nothing), makes the run id the trace id everywhere, checks the AI-credit quota at create, open and token mint with per-product cap_usd and a fan-out cap, and spent 6 months fixing the event log's edges: zombie writers, tail/log gaps, lost and doubled follow-ups, ended turns reopening and a late budget guard. Jadwigo's foundation copies the deterministic event_id, the attempt fence, 2 separate deadlines, one pure fold with named failure tests, a budget check before every model call and the run view's states, and leaves image pinning, sandboxes and online evals for later.",
  "status": "answered",
  "sources": [
    "https://posthog.com/blog/cloud-agents-runtime",
    "https://posthog.com/handbook/engineering/ai/sandboxed-agents",
    "https://github.com/PostHog/posthog/blob/master/products/tasks/backend/sandbox/images/Dockerfile.sandbox-base",
    "https://github.com/PostHog/posthog/blob/master/.github/workflows/update-sandbox-agent-version.yml",
    "https://github.com/PostHog/posthog/blob/master/products/tasks/backend/temporal/run_trace.py",
    "https://github.com/PostHog/posthog/tree/master/products/posthog_ai/eval_harness",
    "https://github.com/PostHog/posthog/blob/master/products/context_layer/backend/temporal/dreaming.py"
  ],
  "owner_decisions": [
    {
      "question": "Which Jadwigo AI workflows may run without a parent's live request (on a schedule or after an event), given that a report runs only when the parent asks?",
      "options": [
        "None: every AI run starts from a parent's message or click",
        "Code-only work (digest, analysis) on a schedule; any Muse call still waits for the parent",
        "A workflow the pod switched on may run on a schedule, delivering only into that pod as a proposal the parent confirms"
      ]
    }
  ],
  "proposed_issues": [
    {
      "title": "Engine: a 1-turn smoke against the real Muse API gates the step consumer's deploy",
      "scope": "after the step consumer exists; one scripted chat turn through HttpMuse, run by the owner before a deploy",
      "done_when": "make engine-smoke runs one turn end to end and fails on any error event",
      "depends_on": ["dl-z5ja.3", "dl-z5ja.5"],
      "labels": ["project:jadwigo-hackathon"]
    },
    {
      "title": "Engine: the stuck-run query, the age of the oldest queued step and the runs past a deadline",
      "scope": "one SQL view or store method over run and the agent_step queue, shown on a dev page",
      "done_when": "a planted stuck run appears in the query in an int test",
      "depends_on": ["dl-z5ja.7"],
      "labels": ["project:jadwigo-hackathon"]
    }
  ],
  "page_changes": [
    { "section": "ai-workflows workstream page, hosted engine", "change": "Link this note beside posthog-ai-runtime.md as the production reference for dl-z5ja" }
  ]
}
```
