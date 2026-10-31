# How does PostHog keep its AI chat honest and pleasant, and what does Jadwigo reuse for a parent's chat?

Issue: `dl-z5ja.23`

## The answer in 5 lines

1. **Make honesty structural, not prose.** PostHog's own audit says it plainly: "prose steering alone produced probabilistic compliance, so the catalog lookup became structural" (`PH/products/data_catalog/docs/production-monitoring.md` ~57). The model builds a *query*; code runs it; a widget draws the result live. The model never writes the numbers the parent trusts.
2. **Every tool result is typed data, and the thread is a registry of widgets keyed by tool name.**
   - An unknown tool falls back to a plain "Call <tool>" card.
   - Text is never parsed into a widget.
   - The widget is the product's own component (the same chart as the insights page), so what the chat shows and what the app shows can't disagree.
3. **The user always sees 4 things:**
   - what the AI has as context (removable chips);
   - what it plans (a checklist, "2 of 5 done");
   - what it is doing now (collapsed tool lines);
   - what each claim rests on (a link to the object behind it).

   It asks only when something is genuinely ambiguous, as a short form with a recommended option first.
4. **The QueryEngine pattern is the one to copy later for "how is she doing?"** One typed schema of query kinds feeds:
   - a runner that injects the scope (`team_id`) at execution, where the prompt cannot remove it;
   - a cache keyed on the query and its scope;
   - a compact formatter for the model;
   - named, owner-approved metrics the model must use instead of deriving its own.
5. **Jadwigo already has the answer-side half of this.** Code computes the digest and the brief; the narrative cites it (`Citation`); proposals change nothing until the parent accepts; no level, score or percentage reaches the parent; harsh words are refused. The chat should reuse those types, not invent a second answer shape.

## Method

**Read:**
- PostHog at `HEAD ffc17c0f0e7` (2026-10-31), paths relative to `/Users/vasyl/projects/posthog-analytics/src/posthog`, written `PH/`. Every cited path was checked with `git cat-file -e`.
- 3 parallel read-only passes: honesty and awareness, the widget catalog, and the query architecture.
- On the jadwigo side:
  - `packages/contracts/src/records.ts` (`Brief`, `ReportDigest`, `ReportNarrative`, `Citation`, `GoalProgress`);
  - `packages/core/src/mastery/`;
  - `packages/contracts/src/routes.ts` (the learner knowledge routes);
  - `apps/web/src/parent/` (`ReportCard`, `GoalLists`, `WeekStrip`, `Heatmap`, `AttemptReview`);
  - `packages/ui/src/primitives`, `packages/copy/src/harsh.ts`;
  - the wave plan `docs/worklog/dl-z5ja/2026-10-31-wave-1.md`.
- Builds on `docs/research/posthog-ai-runtime.md` and `docs/research/posthog-ai-production.md`, and does not repeat them.

**Not done:** nothing was run or rendered. PostHog has 2 chat surfaces: the new sandbox runtime (`PH/products/posthog_ai/frontend`) and the legacy Max (`PH/frontend/src/scenes/max`). "Legacy" marks the second. Line numbers are approximate.

## 1. Honesty and awareness: what the user always knows

### 1.1 What each claim rests on

- **Link the object, don't restate it.** The agent's output rules (`PH/packages/agent/packages/agent-contracts/src/rich-output-prompt.ts` ~5–34):
  - "Link the PostHog objects behind your conclusions";
  - "never restate the object's data in your text";
  - "Full-size chart, for any numeric or time-series answer (always prefer this over a markdown table)".
- **Object tags become chips.** The agent cites with tags such as `<insight id=…>`, which `PH/frontend/src/lib/components/AgentObjectTags/rewriteAgentObjectTags.ts` rewrites into links (`PH/products/posthog_ai/frontend/messages/MarkdownMessage.tsx`).
- **"Show definition".** Every chart card has a toggle that shows how the number was computed: series, filters, breakdown (`PH/products/posthog_ai/frontend/components/tool/widgets/VisualizationWidget.tsx` ~108–125). An "Open insight" button sits beside it, or "Open as new insight" when the chart is not saved yet.
- **Data or no data, said aloud.** `PH/products/posthog_ai/backend/services/system_prompt/prompt.py` ~38: "State which data informed a decision. If you act without data … say so briefly rather than implying the choice was data-backed. Never invent metrics: if you didn't query it, don't claim it."
- **Named metrics over derived ones.** The same file, ~10–21:
  - check the metric catalog before any number;
  - a proposed or drifted metric is flagged "and say why";
  - a derived number is labelled noncanonical;
  - "If no metric matches, say that you consulted the catalog".
- **Evals score fabrication.** Example: `PH/products/posthog_ai/evals/data_warehouse/scorers.py` ~471, "Penalize fabricated values not supported by the SQL result".
- **Not found:** an automated check that each number in an answer appears in a tool result. PostHog relies on structure plus prompts.

### 1.2 What it plans and what it is doing

- **Plan checklist.** The TodoWrite renderer shows "the agent's plan as a checklist", with a subtitle "`${done} of ${todos.length} done`" (`PH/products/posthog_ai/frontend/components/tool/builtinToolRenderers.tsx` ~219–262). The prompt asks the agent to mark each item done as it goes, "Do not batch".
- **Plan approval.** A PlanCard shows the plan while it waits for approval. Once answered it collapses to "Plan approved — proceeding" with "show plan" (same file ~127–190).
- **One sentence before switching.** Before changing mode the agent says why, in one sentence.
- **Tool lines.** They start collapsed, as in `posthog-ai-production.md` section 6. Charts are `keepVisible`, and questions and plans are `pinned`, so grouping never hides them (`PH/products/posthog_ai/frontend/utils/groupThreadActivity.ts`).
- **Not found:** a final "what I did" summary component. The turn ends with the answer, a feedback row and an optional suggestion card.

### 1.3 What it doesn't know, and when it asks

- **Ask only when genuinely ambiguous.** `PH/ee/hogai/tools/create_form.py` ~17–95:
  - "Never ask for confirmation of something you can infer";
  - at most 4 questions (select, multi-select, fields);
  - a recommended option first;
  - a custom answer is always allowed;
  - the user may skip or dismiss.
- **Research first, ask second.** `PH/ee/hogai/chat_agent/prompts/plan.py` ~54–79 adds "Research first, ask second", with at most 3 questions.
- **Ask, don't hedge.** On a metric that could mean 2 things: "ask one clarifying question and end your turn. Do not acknowledge ambiguity and then run one of the alternatives anyway."
- **Mark uncertainty in reports.** The research agent marks claims "[UNVERIFIED]" and gaps "[TODO: question]", and would rather "publish a report that honestly marks remaining uncertainties than to fabricate or speculate" (`PH/ee/hogai/research_agent/prompts/research.py` ~40–64).
- **The UI for answering.** The form opens in the composer's place (`OptionSelector.tsx`: options, "Type your response…", "Skip question"). The thread keeps a recap that "retain[s] every question, including unanswered ones" (`PH/products/posthog_ai/frontend/components/QuestionRenderer.tsx`).

### 1.4 What it has as context

- **Legacy Max** (`PH/frontend/src/scenes/max/Context.tsx`):
  - shows "With {context}" above a sent message;
  - context chips can be closed;
  - a dashed chip marks context "auto-included from the current view";
  - a picker reads "Add context to help PostHog AI answer your question".
- **New runtime** (`PH/products/posthog_ai/frontend/AGENTS.md` ~162–195):
  - one registry of attached context;
  - a closed chip "must not resurrect";
  - the context reaches the model in hidden `<posthog_trusted_context>` / `<posthog_untrusted_context>` blocks, and the system prompt treats untrusted blocks as data only.

### 1.5 Feedback, identity and expectations

- **Feedback.** Each turn's footer has Copy, Good, Bad and Try again. Bad asks "What disappointed you about the answer?" (`PH/frontend/src/scenes/max/messages/SuccessActions.tsx`, `PH/products/posthog_ai/frontend/components/TurnFeedbackActions.tsx`). Staff also get a trace link.
- **Expectations at first use.** The welcome screen offers suggested prompts in topic tabs, and onboarding says what the agent is and how it works ("It writes a plan, you approve it, then it works in the background").
- **Where the data goes.** A standing notice, "uses third-party LLM providers … Your data will not be used for training" (`PH/frontend/src/scenes/max/components/AILiabilityNotice.tsx`).
- **Modes.** Auto / Plan / Research each say in one line what they do (`PH/frontend/src/scenes/max/max-constants.tsx` ~1557–1585).
- **Identity.** "ship changes with them — never without them."

## 2. The widget catalog and how a result becomes a widget

### 2.1 The registry

- **The entry.** `PH/products/posthog_ai/frontend/components/tool/toolRegistry.tsx` defines `{key, displayName, icon, Renderer?, PermissionPreview?, keepVisible?, pinned?, requiresPostHogOrigin?}`. Each renderer is a lazy chunk with a skeleton.
- **Where products register.** Each product adds its renderers in one file (`PH/frontend/src/posthogAiToolRenderers.ts`).
- **Typed payloads only.** `PH/products/posthog_ai/frontend/utils/getToolOutputRecord.ts` reads structured content (`_meta['com.posthog.mcp/app_data']`, then `structuredContent`). Text is never parsed into a widget: a result with only text gets the generic card (`GenericMcpToolRenderer.tsx`, "Call <tool>", an Input/Output accordion).
- **No spoofed widget.** A third-party tool whose name collides with a first-party widget falls back to the generic card (`requiresPostHogOrigin`).
- **No half-drawn widget.** A widget renders only once the call is `completed` and its payload extracts. Until then, it's the generic card with a status.

### 2.2 The catalog, grouped

| Group | Widgets | Pattern |
|---|---|---|
| Data | `VisualizationWidget`, `QueryWidget`, `CreateInsightWidget` | The product's own `<Query readOnly embedded>`, re-run live; "Show definition"; "Open insight" / "Open as new insight" |
| Record previews | `RecordingsWidget`, `ErrorTrackingWidget` | A live list bound to the product's own logic; click opens the product's modal |
| Documents | `CreateNotebookWidget`, `UpsertDashboardWidget` | A status line and one "Open" button. An inline preview was "deliberately deferred" |
| Edits | `EditDiffRenderer`, approval evidence | A diff that mounts only when near the viewport |
| Inputs | Question form, `PermissionInput`, plan approval | Numbered rows, keyboard shortcuts, decline with feedback |
| Status | progress line, "Thought", error row, compaction card, cost footer | (`posthog-ai-production.md` section 6) |
| After the turn | `TurnSuggestionCard` (scout, notebook, alert, subscription) | Drafted off the request path, published into the run stream, shown 2.5 s after the answer "so the reader finishes the answer first" (`PH/products/posthog_ai/frontend/logics/turnSuggestionLogic.ts`) |

### 2.3 Artifacts: what outlives the chat

- **Saved right away, linked from the chat.** In the new runtime a tool saves the object (insight, notebook, dashboard) on the server at once, and the chat shows a link card.
- **Versions live in a separate tab.** The run's Artifacts tab (`PH/products/posthog_ai/frontend/scenes/TaskTracker/taskRunArtifacts.ts`) keeps "files the agent wrote, versions of them a user saved, and the PostHog objects the run cites", with versions and a save-conflict dialog.
- **The page reacts to the chat.** A page can apply a finished tool result to itself (`PH/products/posthog_ai/frontend/hooks/useMcpToolApplyBack.ts`), for example new filters on the page the user is looking at.

### 2.4 Smoothness

- **One log, one fold.** The log is append-only and the thread is a pure fold of it. Only the trailing markdown block re-renders while text streams (`MarkdownMessage.tsx`, one memoized renderer per block).
- **Follow, but let the reader go.** `PH/products/posthog_ai/frontend/components/VirtualizedThread.tsx`:
  - follow-to-bottom unpins only on the reader's own scroll, wheel or touch, never on position;
  - a short grace period keeps following after the turn ends;
  - a new send re-pins;
  - loading older history keeps the visible row steady.
- **No jumping.** Optimistic echo of the user's message, deduped against the server's copy. Fixed chart heights, skeletons that reserve the turn's exact size, a shared 150 ms fade.
- **Grouping.** 2 or more tool calls fold into one group; a group over 10 shows the first 2 and last 3.
- **Not found:** partial-JSON rendering of streaming tool arguments, or token-level throttling. A card shows title and status while pending and becomes the widget on completion.

## 3. The QueryEngine, and what it gives an AI

### 3.1 One schema, many languages

- **Every query is JSON with a `kind`.** `PH/frontend/src/queries/schema/schema-general.ts` holds the TypeScript types: `NodeKind`, and `Node<R>` carrying its response type. The AI uses a slimmer subset with field descriptions, `schema-assistant-queries.ts`.
- **One source becomes 3 things.** `PH/frontend/bin/build-schema-json.mjs` makes `schema.json`, which then becomes:
  - Ajv validators for the frontend;
  - pydantic models via `PH/bin/build-schema-python.sh` ("DO NOT EDIT THIS FILE DIRECTLY");
  - Zod for MCP tools (`PH/services/mcp/definitions/query-wrappers.yaml`: "Each wrapper generates a typed tool that accepts a single query schema").
- **Versioned.** Every node has a `version`, and old queries are upgraded before validation.

### 3.2 The runner

`PH/posthog/hogql_queries/query_runner.py`:
- **Dispatch.** `get_query_runner(query, team, …)` dispatches by `kind`. Each runner validates the raw dict, implements `_calculate()`, and checks `validate_query_runner_access(user)`.
- **Scope is injected at execution.** "HogQL guarantees this by injecting a mandatory `team_id = <context.team_id>` filter onto every table it reads", so "query-supplied WHERE clauses … can't remove or widen it", and it fails closed (`PH/posthog/hogql/ACCESS_CONTROL.md`).
- **Cache.** The cache key hashes the runner, the query, the team, the modifiers, the timezone and a version. Refresh modes run from `blocking` ("use cache, unless … missing or stale") to `force_cache`.
- **Limits for AI callers.** AI queries run under `LimitContext.POSTHOG_AI`: at most 500 rows, read-only, 60 s (`PH/posthog/hogql/constants.py`).

### 3.3 How the AI uses it

1. **Explore before querying.** A planner looks up which events and properties exist, then writes a plan *before* it chooses the query kind. The comment: "query_kind is intentionally AFTER plan so that these tokens are generated after decision explanation" (`PH/ee/hogai/chat_agent/query_planner/nodes.py`, `toolkit.py`). It can stop and ask the user.
2. **Generate, validate, retry.** The query is generated as structured output against the schema and validated with pydantic. On failure the error text goes back ("Fix the error and return the correct response"), at most 2 retries (`PH/ee/hogai/chat_agent/schema_generator/nodes.py`). A quality check catches what the schema can't, such as a field that doesn't exist.
3. **Execute.** The query runs through the same path as the product API (`PH/ee/hogai/context/insight/query_executor.py`).
4. **Format for the model.** The model reads a compact table per kind ("Date|Series 1|Series 2"), capped in size, beside the query that produced it and the current time. Two rules (`PH/ee/hogai/context/insight/prompts.py`): "Do not copy the results table as the user sees it in the UI"; `(null)` means missing, "Never report `(null)` as a value".
5. **Show it live.** The UI receives the *query*, wraps it in the product's chart node and renders it live. "Open as new insight" carries the query into the full product.
6. **Use the approved names.** Governed metrics (`PH/products/data_catalog/backend/models/metric.py`) are "A canonical business metric": a name, description, unit, owner ("AI generates, a human owns"), the query that defines it, and a status of proposed → approved, with drift detection. The model must run the approved metric rather than re-derive it. After the audit, the approved names are injected into the prompt by code.

## 4. What Jadwigo already has

| PostHog | Jadwigo today |
|---|---|
| A query runner computes the numbers | `packages/core/src/mastery/`: "Code computes every level and the brief, and the AI never recomputes one" (`index.ts`) |
| Governed metrics, owner-approved names | `GoalProgress` (`not_started`, `needs_attention`, `on_its_way`, `good`), `BriefList` (`reteach`, `review`, `new`, `recheck`, `school`) and the brief's `why`: a closed vocabulary that code assigns |
| Never invent metrics | Route `/api/v1/learners/{id}/skills`: "No level name, score or percentage is ever shown to the parent". `ReportNarrative`: every sentence cites the digest, "gives no number the digest did not, and names no level" |
| Object links behind claims | `Citation`: an attempt, a skill or a goal, required on every narrative answer and proposal |
| "Say you consulted the catalog" | `Brief.school`: `nothing_recorded` — "an empty section is said, never guessed at"; the standing verdict `nothing_recorded` |
| Clarifying form, at most 4 questions | `ReportDigest.asks` (at most 2: `goal_without_skills`, `no_evidence_in_period`, `school_context`) |
| Ship changes "never without them" | Proposals (at most 3) change nothing until the parent accepts (`ProposalDecision`, `ReportCard.tsx`) |
| Product components reused in the chat | `ReportCard`, `GoalLists`, `WeekStrip` (`apps/web/src/parent/learner/`), `Heatmap`, `QuestionSheet` (`parent/overview/`), `AttemptReview`, the lesson builder's draft view |
| — (PostHog has no tone filter) | `packages/copy/src/harsh.ts`: "A miss is information, not failure: the page says 'not yet', never 'wrong'" |

So the hard part, a closed and code-computed vocabulary about a learner, exists. The chat needs:
- the transport (a typed tool result → a widget);
- the honesty affordances (context chips, plan, citations, asks);
- later, a small query layer over the same core functions.

## 5. Answering a parent's question about a learner, pleasantly

A question such as "how is she doing with subtraction?" or "what should we practise next?" becomes a turn of **query verbs**, never free recall. Each verb is pod-scoped by the run (wave plan, Lead decision 7) and returns one of the existing types:

| Verb (later) | Returns | Widget |
|---|---|---|
| `learner_skills` | `GoalView[]` + `Brief` (from `/learners/{id}/skills`) | the `GoalLists` chips: goal status words, never levels |
| `learner_week` | days played and questions per day | `WeekStrip` |
| `learner_mistakes` | `ReportDigest.mistakes` for a period | a short list, each with an "open attempt" link to `AttemptReview` |
| `curriculum_topics` | topics near the learner's skills, from `packages/core/src/curriculum` | topic chips, with "make a lesson from this" |
| `lesson_ideas` | up to 3 `focus` proposals from the brief's lists | proposal cards with Accept, which starts `lesson_draft` |

**The answer has the narrative's shape,** reusing `ReportNarrative`'s fields for one turn:
- a one-line `headline`;
- answer sentences, each with `citations`;
- at most 3 proposals and at most 2 asks.

The model writes the words; code supplies every fact and every widget.

**Pleasantness rules** (the house rules plus PostHog's):
- **The answer comes first.** One short paragraph, then the widget, then at most one suggestion, shown after a pause.
- **Status words, not numbers or levels** (`GoalProgress`), with "not yet" rather than "wrong" (`harsh.ts`).
- **Never a comparison with other children, a diagnosis or a label.** This is the report rule in `dl-e8ov.5.64`.
- **Say what is missing,** as the brief does: "nothing recorded yet for school", then offer the ask.
- **Each claim has a quiet "why?"** that opens its citation: the attempt, the goal or the skill. This is PostHog's "Show definition".
- **The chat proposes; the parent decides.** Nothing about a learner changes from the chat until the parent accepts it (`dl-hin8.4`'s decision).

## 6. Smooth and honest in the chat pane (for `dl-z5ja.17`)

**Layout**
- Context chips at the top of the composer: "About: <learner> · grade 1 · goal: subtraction to 20". They are closable, and a closed one stays closed.
- The plan checklist as the first item of a turn, "2 of 4 done", and the tool lines below it, collapsed.
- The lesson pane on the right *is* the artifact. It shows the latest `lesson_revision`, with a quiet "changed just now" mark on the questions the last edit touched.

**Behaviour**
- Only the trailing message block re-renders while streaming.
- Follow-to-bottom pauses when the parent scrolls up and resumes when they send.
- The parent's message is echoed at once.
- A widget appears only on a completed, typed result, and an unknown verb gets the plain card.
- The welcome screen offers 3 starter requests in the parent's language, and says once, in plain words, what the assistant does and where the data goes.

## What this means for jadwigo

**Seams for the wave-1 contracts** (sent to the lead as a note on `dl-z5ja.12`, not edited here):
1. `tool_result` carries a typed `view` (`{kind, data}`, validated per verb), never text to parse.
2. An agent `message` carries `citations: Citation[]`, reusing the existing `Citation`.
3. `approval_request` gains a `choose` form (up to 4 questions, recommended first, custom allowed, skippable) beside approve/decline.
4. A `plan` event (items with status) so the fold draws the checklist.

| What | PostHog | Jadwigo | When |
|---|---|---|---|
| Typed result → widget | `toolRegistry`, structured content only, generic fallback | A verb → widget registry in `apps/web/src/playground/chat/`, keyed by verb; `view` validated by Zod; generic card otherwise | v1 (wave 1 chat pane) |
| Product components in the chat | `<Query>` the product's chart | The lesson pane reuses the builder's draft view; later `GoalLists`, `WeekStrip`, `AttemptReview` | v1 lesson, later learner |
| Plan checklist | TodoWrite, "N of M done" | A `plan` event and a checklist row | v1 |
| Context chips | closable, "auto-included", resurrect-proof | Learner, goal and draft chips on the composer | v1 (draft), later (learner) |
| Ask only when ambiguous | `create_form`, at most 4, recommended first | The `choose` form; the workflow's prompt names when to ask | v1 |
| Citations | object tags, "Show definition" | `Citation` on every claim about a learner, a quiet "why?" | later (learner answers) |
| No invented numbers | structure plus prompts; no checker | Structure plus a cheap check that every number and level word in an answer appears in a tool result (`dream.ts` already validates narratives) | later |
| QueryEngine | one schema, runner, scope injected, cache, compact formatter | `LearnerQuery` kinds in contracts; runners over `packages/core` mastery and curriculum; pod scope injected from the run; a compact formatter for Muse | later (after Postgres) |
| Governed metrics | catalog, approved names injected by code | `GoalProgress`, `BriefList` and the brief's `why`, already code-owned; inject their names into the prompt | later |
| Turn suggestions | drafted off-path, shown after 2.5 s | One proposal card after the answer ("make a lesson on this") | later |
| Feedback | Good / Bad / Try again, "what disappointed you" | The same 3 buttons; the run id in "Copy details" | v1 (buttons), later (eval set) |
| Expectations | onboarding, data notice, modes | A first-use line on what the assistant does and where the data goes, from the `dl-z5ja.8` privacy answer | later |

```json jadwigo-outcome
{
  "issue": "dl-z5ja.23",
  "question": "How does PostHog keep its AI chat honest and pleasant, and what does Jadwigo reuse for a parent's chat?",
  "answer": "PostHog makes honesty structural: the model builds typed queries and tool calls, code computes the numbers and the product's own components draw them, each tool result maps to a widget through a registry with a generic fallback, and the user always sees context chips, a plan checklist, collapsed tool lines, citations and a short ask-only-when-ambiguous form. Its QueryEngine (one schema, a runner that injects scope at execution, a cache, a compact formatter, governed metrics) is the model for answering a parent's questions later. Jadwigo already has the answer half (code-computed digest and brief, Citation, proposals the parent accepts, no levels or scores, harsh-word refusal); the chat adds typed views, citations on messages, a choose form and a plan event, then learner query verbs that reuse the parent screens' components.",
  "status": "answered",
  "sources": [
    "https://posthog.com/blog/cloud-agents-runtime",
    "https://posthog.com/handbook/engineering/ai/sandboxed-agents",
    "https://github.com/PostHog/posthog/blob/master/products/posthog_ai/frontend/components/tool/toolRegistry.tsx",
    "https://github.com/PostHog/posthog/blob/master/posthog/hogql_queries/query_runner.py",
    "https://github.com/PostHog/posthog/blob/master/posthog/hogql/ACCESS_CONTROL.md",
    "https://github.com/PostHog/posthog/blob/master/products/data_catalog/docs/production-monitoring.md"
  ],
  "owner_decisions": [
    {
      "question": "What may the parent's chat answer about a learner, once it can read learner knowledge?",
      "options": [
        "Only what the learner page already shows: goal status words, the brief's lists and the report, each with its citation",
        "That, plus counts from the digest (days played, questions, mistakes by kind), never a level or score",
        "Nothing about a learner in the chat until reports are proven; the chat only builds lessons"
      ]
    }
  ],
  "proposed_issues": [
    {
      "title": "Chat: a verb-to-widget registry with typed views and a generic fallback card",
      "scope": "apps/web/src/playground/chat: registry keyed by verb, Zod-validated view per verb, generic 'Called <verb>' card, widgets only on completed results",
      "done_when": "a component test renders lesson_check findings as a widget and an unknown verb as the generic card",
      "depends_on": ["dl-z5ja.17"],
      "labels": ["project:jadwigo-learner-experience"]
    },
    {
      "title": "Engine: learner query verbs (learner_skills, learner_week, learner_mistakes, curriculum_topics, lesson_ideas) over packages/core, pod-scoped by the run",
      "scope": "packages/jadwigo-ai verbs returning existing contract types; scope from the run row; a compact formatter for Muse; widgets reuse apps/web/src/parent components",
      "done_when": "a scenario test answers 'what should we practise next' with proposals that cite the brief, with no level word or number outside the tool result",
      "depends_on": ["dl-z5ja.16", "dl-z5ja.19"],
      "labels": ["project:jadwigo-learner-knowledge"]
    },
    {
      "title": "Engine: an answer check that every number and status word in an agent message appears in that turn's tool results",
      "scope": "a pure function in packages/core over the turn's events, run before the message event is written; the dream.ts narrative validator is the model",
      "done_when": "a planted invented number and a planted level name are both refused in a scenario test",
      "depends_on": ["dl-z5ja.13", "dl-z5ja.16"],
      "labels": ["project:jadwigo-platform"]
    }
  ],
  "page_changes": [
    { "section": "ai-workflows workstream page, hosted engine", "change": "Link this note as the UX reference for the chat pane and for answers about a learner" },
    { "section": "learner-knowledge workstream page", "change": "Name the learner query verbs as the chat's way to read learner knowledge, reusing the closed vocabulary" }
  ]
}
```
