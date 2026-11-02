# How does PostHog make rich widgets native to its AI chat, and how does Jadwigo let a parent open a lesson, a learner or a skill from the chat?

Issue: `dl-uukj.47.58`

## The answer in 5 lines

1. PostHog has **2 separate layers**:
   - **tool widgets**: a registry keyed by tool name that draws a typed tool result;
   - **object references**: a registry of object kinds, each with a path template and an id guard, that turns a link the model writes into a link or a chip.
2. A tool returns **2 channels**:
   - short text for the model;
   - the full typed object for the UI, in `_meta['com.posthog.mcp/app_data']`, plus a note that "the user already sees this", so the model doesn't restate it.
3. A widget draws **the product's own component**, and draws it live. `<Query readOnly embedded>` re-runs the query node the tool echoed back, so the chat, an insight page and a dashboard share one renderer keyed by `kind`.
4. Clicks either **leave the chat** (a new tab, or a modal on the current page) or **open a panel inside the app** (the desktop app's `openPostHogObjectTab`). Pages opt into changes from the chat (`useMcpToolApplyBack`), and the page reaches the chat only as ids (`maxContext`).
5. Jadwigo already had layer 1 (`dl-z5ja.24`, `TOOL_VIEW_DATA`). It now has layer 2:
   - an `ObjectRef` (lesson, learner, skill, assignment, attempt) kept in `?open=`;
   - a kind registry;
   - one inspector that opens the workspace's right column;
   - the first object card, "Lekcja gotowa", which opens the lesson beside the chat.

## Method

**Read:** PostHog at `/Users/vasyl/projects/posthog-analytics/src/posthog` (written `PH/`):
- `products/posthog_ai/frontend/components/tool/toolRegistry.tsx`, `widgets/*`, `utils/getToolOutputRecord.ts`;
- `frontend/src/posthogAiToolRenderers.ts`;
- `frontend/src/queries/Query/Query.tsx` and `posthog/hogql_queries/query_runner.py`;
- `frontend/src/lib/components/AgentObjectTags/rewriteAgentObjectTags.ts`;
- `products/desktop/packages/ui/src/utils/remarkObjectTags.ts`;
- `packages/agent/packages/agent-contracts/src/rich-output-prompt.ts`;
- `products/posthog_ai/frontend/hooks/useMcpToolApplyBack.ts`;
- `services/mcp/src/lib/build-tool-result.ts`.

**Builds on:** `posthog-ai-ux-patterns.md` section 6 and `posthog-ai-runtime.md`; it doesn't repeat them.

**Not done:** no PostHog code was run. Line numbers are left out because they drift.

## 1. Tool widgets (PostHog's layer 1, Jadwigo's `dl-z5ja.24`)

| PostHog | Jadwigo |
| --- | --- |
| `ToolRegistryEntry {key, displayName, icon, Renderer?, keepVisible?, pinned?, requiresPostHogOrigin?}`; products contribute arrays, and one file spreads them | `REGISTRY` in `apps/web/src/chat/widgets/Widgets.tsx`: `{verb, title, read, Widget, keepVisible}` |
| Lazy renderers in `Suspense` with a skeleton | Not needed yet: 7 small widgets |
| A widget draws only when `status === 'completed'` and its extractor passes; otherwise `GenericMcpToolRenderer` | `toolResult()`: done and `toolViewData` parses, else the plain "Szczegóły" card |
| No spoofing: a third-party tool named like a first-party one gets the plain card | A view whose `kind` names another verb never borrows that verb's widget |
| `_meta.app_data` for the UI, compact text for the model | `tool_result.view` (`TOOL_VIEW_DATA`), and `output` for the model |

## 2. Object references (PostHog's layer 2, new here)

- **A kind registry.** PostHog's `posthog/object_tags/kinds.py` generates `objectKinds.generated.ts`. Each kind has a `pathTemplate`, an `idPattern`, and `block` / `idIsBody` flags.
  - The model writes `[label](…/insights/<id>)`.
  - The web app rewrites it into a link, holding back a tag that is still half-streamed.
  - The desktop app turns it into an `EvidenceRefChip`: a hover fetches a live preview, and a click opens an in-app tab.
  - A link alone in its own paragraph becomes a full card that runs live, capped at 10 per message.
- **Jadwigo's form** (`apps/web/src/chat/objects/`):
  - `ref.ts` defines `ObjectRef {kind, id}`. The kinds are `lesson` (named by its conversation), `learner`, `skill`, `assignment` and `attempt`. Each id is parsed through its branded id in `@jadwigo/contracts`. `?open=<kind>:<id>` carries the ref, so a reload or a shared link opens the same thing.
  - `registry.tsx` holds each kind's name, icon and full page (`lessonPath`, `childPath`, `assignmentPath`, `attemptPath`). `ObjectFallback` draws a kind that has no panel yet: its name and a link to its page. This is the counterpart of the plain card.
  - `LessonCard.tsx`, "Lekcja gotowa", draws under a finished turn whose `lesson_draft` or `lesson_edit` wrote a revision. It shows the title, how many questions, which version and the first question. **Every fact comes from the turn's own revision, not from the model's text**: the "never restate the object" rule, enforced by structure.
- **The kinds line up with `Citation`** (attempt, skill, goal), so cited claims become chips that open their object (`dl-uukj.47.62`).

## 3. The page and the chat

- **PostHog:**
  - The page reaches the chat as ids only: `maxContext` → `{type, id, name}` chips in the composer.
  - The chat reaches the page through `useMcpToolApplyBack`. A page names the tools it accepts, the target is fixed when the message is sent, and if 2 targets claim one tool, neither gets it.
- **Jadwigo already sends the page as context:** a message's `context`, `dl-z5ja.107`.
- **The chat reaches the page through the inspector** (`apps/web/src/parent/workspace/inspector.ts`):
  - `open(ref)` sets `?open`, opens the lesson column (`usePanel("lesson")`) and fires `jw:inspect`, which brings the Lekcja pane to the front on a phone.
  - "Pokaż lekcję" in the top bar goes through the same door. Shutting the column forgets what was open.
  - That turns the chat-first page (decision `dl-hz9ks`) into chat plus details with one click, and back.

## 4. What PostHog leaves undone, and what Jadwigo does instead

- **PostHog's web widgets mostly leave the page** (a new tab or a modal). Only the desktop app opens objects in a panel. The owner asked for the panel, so Jadwigo's default is the panel, and the full page is the fallback.
- **The model restates what the widget shows.** PostHog appends `UI_APP_RENDER_NOTE`. Jadwigo's engine doesn't tell the model about the card yet, so its last message still lists the questions and the play link (`dl-z5ja.141`).
- **Widgets don't adapt to width.** The lesson card is one column at every width, and on a phone its click switches the pane instead of opening a column.

## What this means for jadwigo

| What | PostHog | Jadwigo | Issue |
| --- | --- | --- | --- |
| Tool widgets | Registry, typed app data, plain fallback | `Widgets.tsx` + `TOOL_VIEW_DATA` | `dl-z5ja.24` (done) |
| Object kinds | Generated kind registry, path template, id guard | `ObjectRef`, `registry.tsx`, ids from contracts | `dl-uukj.47.58` |
| Open beside the chat | Desktop's in-app tab | The inspector: `?open`, the right column, the phone's Lekcja pane | `dl-uukj.47.58` |
| Lesson ready | `CreateNotebookWidget`: a title and "Open" | "Lekcja gotowa": the title, the count, the version, the first question; actions in its foot | `dl-uukj.47.58`, `dl-uukj.47.55` |
| Learner, skill, assignment, attempt | Record previews bound to the product's logic | A panel and a card per kind, drawn with the parent pages' own parts | `dl-uukj.47.59`, `.60`, `.61` |
| Citations as chips | `EvidenceRefChip` with a live hover | A quiet chip per citation that opens its object | `dl-uukj.47.62` |
| Older revisions | — | An older turn's card opens the revision it made | `dl-uukj.47.63` |
| "The user already sees it" | `UI_APP_RENDER_NOTE` | The engine stops restating the lesson the card shows | `dl-z5ja.141` |

```json jadwigo-outcome
{
  "issue": "dl-uukj.47.58",
  "question": "How does PostHog make rich widgets native to its AI chat, and how does Jadwigo let a parent open a lesson, a learner or a skill from the chat?",
  "answer": "PostHog keeps 2 layers: a tool-widget registry that draws typed app data (with a plain fallback and no spoofing), and an object-kind registry (path template, id guard) that turns the model's links into links or, in the desktop app, chips that open an in-app panel; widgets draw the product's own components live, and a note tells the model the user already sees the result. Jadwigo had the first layer (dl-z5ja.24) and now has the second: an ObjectRef kept in ?open, a kind registry with a fallback to each kind's page, one inspector that opens the workspace's right column (and the phone's Lekcja pane), and the 'Lekcja gotowa' card, drawn from the turn's own revision, that opens the lesson beside the chat.",
  "status": "answered",
  "sources": [
    "https://github.com/PostHog/posthog/blob/master/products/posthog_ai/frontend/components/tool/toolRegistry.tsx",
    "https://github.com/PostHog/posthog/blob/master/frontend/src/lib/components/AgentObjectTags/rewriteAgentObjectTags.ts",
    "https://github.com/PostHog/posthog/blob/master/products/posthog_ai/frontend/hooks/useMcpToolApplyBack.ts",
    "https://github.com/PostHog/posthog/blob/master/services/mcp/src/lib/build-tool-result.ts"
  ],
  "owner_decisions": [],
  "proposed_issues": [],
  "page_changes": [
    {
      "section": "learner-experience workstream page, the parent's chat",
      "change": "Link this note: tool widgets and chat objects are the 2 ways the chat shows a parent details, and the inspector is the one way the chat opens the right column"
    }
  ]
}
```
