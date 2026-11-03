# dl-uukj.47.71: the engineering brief the chat design answers (2026-11-03)

**For:** the Claude design session that made the parent design system (`docs/worklog/dl-uukj.47.67/2026-11-02-parent-ds-handoff.md` in the repo).
**From:** an engineering session that ran the chat end to end on 2026-11-03 (`make dev-all`, prod's model and prod's question bank, Polish UI, 1440 × 900 and 390 × 844).
**Repo:** vasyl-stanislavchuk/jadwigo-hackathon, `main` at `2f6bee23`. Chat code: `apps/web/src/chat/`.
**Screens:** `screens/` beside this file, numbered by the section that uses them. Made-up data only: a test parent, no child, a made-up homework sheet.

## The ask

Redesign how the parent's chat with Jadwigo AI **reads while it works**:

- **The run as one story.** What it is doing now, what it has done, what it needs from the parent, and when it is done.
- **Widgets.** Which results earn a card in view, and which stay folded.
- **The collapsible blocks.** The plan, the step groups, the step lines and "Szczegóły": their defaults, their nesting, and what each summary says.
- **Every state below**, from "thinking" to "failed".

Keep the design system from 2026-11-02 (adult layer: Geist, flat controls, ink-blue primary, radius 6/8/10, verdict hues only in results). This handoff adds the chat's own parts to it.

Hand back what §8 lists. The format is the same as the last handoff: decisions as D/S/P rows, a states sheet at 1440 and 390 in Polish, and the copy.

---

## 1. Who uses the chat and for what

The parent lands on "Jaką lekcję przygotować?" (screen 01). They type a request, optionally pick the child (Dla) and add homework photos, then press Zrób lekcję. The lesson workspace opens: chat first, with the lesson beside it on desktop and as a tab on the phone (screens 30, 60). Jadwigo AI builds a lesson from the question bank, checks it, and ends with a lesson card that can be given to a child, saved or printed.

Use-cases to design for, in order of frequency:

| # | Use-case | Typical turn |
|---|---|---|
| U1 | **New lesson from words** ("Mnożenie przez 2 i 5, 4 pytania, druga klasa") | 3–6 model calls: search, draft, check, words, card. About 30 s. |
| U2 | **New lesson from a homework photo** ("Zrób lekcję z tego zadania" + photo) | The same, with the photo shown back to the parent. |
| U3 | **Change the lesson** ("Dodaj jedno zadanie z mnożeniem przez 10") | Can run long: 18 calls, 20 step groups and 10 widget cards in one turn today (screens 13, 14). |
| U4 | **A follow-up typed while a turn runs** | Queued under the composer as "Następne", sent when the turn ends, or now with "Wyślij teraz". |
| U5 | **Ask about a child** ("Co Ola ćwiczyła w tym tygodniu?") | Read-only verbs whose widgets are the answer: the week strip, skills, mistakes, lesson ideas. |
| U6 | **Something goes wrong** | A step that retries, a check that fails, a turn that ends failed, a limit, the network. |
| U7 | **Coming back** | A reload restores the conversation, several finished turns above, each with its card and rating. |

## 2. How a run works (what the chat can know)

One parent message starts a **turn** (a "run"). The engine writes an ordered event log. The page folds it into a view, and every visible thing comes from that log. A turn is a loop: the model replies, maybe calls tools ("verbs"), and the results go back to the model. It stops when the model answers in words with no tool call, or when a limit or an error ends it.

```
parent message ─► status queued ─► status in_progress
   ┌─► model_response ─► message (agent words, optional)          ← "Szykuję krótką lekcję…"
   │      └─► tool_call (verb, input) ─► tool_result (view, output | error)
   │             └─► lesson_revision (when the lesson changed)
   │             └─► plan (3+ stages: Szukanie zadań w banku / Układanie lekcji / Sprawdzanie lekcji)
   │      └─► usage (spent, cap)
   └── repeat ─┘   (each repeat = one paid model call; 3 to 30 per turn today)
   └─► error (StepTimedOut "trying again" | StepFailed | RunTimedOut | RunIdle | …)
   └─► approval_request (a question for the parent: the choose form) ─► awaiting_input
status completed | failed | cancelled ─► turn_complete
```

- **Statuses:** queued, in_progress, awaiting_input, completed, failed, cancelled.
- **Chat items** (what the thread can draw): `message` (parent or agent), `tool` (pending, running, done, failed or rejected), `steer` (a budget note), `approval`, `error`.
- **Not items:** the plan (the latest replaces the last), the lesson revision, usage, and the model's own response events. **There is no "reasoning" in the log**: the model's thinking is not streamed. "Thinking" can only be shown as waiting.
- **The phase** (one value for the whole page, `phase.ts`) decides the activity line and the workspace band:

| Phase | When | Words today (pl) |
|---|---|---|
| connecting | restoring, or the live channel not up | Łączenie… |
| queued | status queued | W kolejce |
| thinking | open, no tool running | Myślenie… |
| tool | a tool is running | the verb's words, e.g. "Szukanie zadań" |
| slow | 20 s with no event | To trwa dłużej niż zwykle |
| stalled | 60 s with no event, or the channel failed | Utknęło |
| awaiting_input | the turn asks the parent | Czeka na Ciebie |
| done / failed / cancelled | the turn ended | Gotowe / Nie udało się / Zatrzymane |

The activity line shows "{phase words}  {n} s" with a shimmer, and nothing once the turn ends (screens 10, 11). There is no spinner.

The 11 verbs, with their plain names:

- **The lesson's:** question_search "Szukanie zadań", question_types "Sprawdzanie rodzajów zadań", lesson_draft "Układanie lekcji", lesson_show "Czytanie lekcji", lesson_edit "Zmienianie lekcji", lesson_check "Sprawdzanie lekcji", curriculum_topics.
- **A child's:** learner_skills, learner_week, learner_mistakes, lesson_ideas.

## 3. What the thread draws today

Each row lists its parts, behaviour and screens.

| Element | What it is | Collapsible? Default | Screens |
|---|---|---|---|
| Parent bubble | Right-aligned box. "Ty" is screen-reader only. A steer shows "Ty · Dopisane w trakcie". | — | 11, 12 |
| Photos under the bubble | 64×80 thumbnails and the caption "Tak Jadwigo widzi zdjęcia". A tap opens the photo full size in a dialog. | — | 20, 21 |
| AI header | Crown and "Jadwigo AI", once per turn. | — | 11 |
| Plan card | "Plan · n z m", each stage with a mark and a word (do zrobienia / w toku / zrobione / nie wyszło). Only with 3 or more stages. | While running it is open and **sticky**, and can't be folded. When the turn ends it is **folded**, with the summary as toggle. | 11, 15 |
| Agent message | Markdown prose. "Dlaczego?" citation chips sit under it when it cites. | — | 11–14 |
| Step group | Zap icon, "1 krok · ostatni: {sentence}", chevron. Groups only *consecutive* tool calls, so agent words between calls open a new group. | **Closed** | 11, 13, 16 |
| Step line, inside the group | Icon, sentence, mark (spinner, check or red dot). A failed line shows its reason **in view, raw**. | **Closed** | 16, 17 |
| Widget, inside a line or in view | lesson_check findings, lesson_edit "Krok s01" tags, question_search set tags, learner_week, learner_skills, learner_mistakes, lesson_ideas ("Ułóż tę lekcję"). | "keepVisible" widgets draw **in view under the group, one per call**. A clean check folds. | 13, 17, 40 |
| Szczegóły | "Wysłane dane" and "Co wróciło" as **raw JSON**. | **Closed**, nested 3 deep | 16 |
| Activity line | "{phase} {n} s", shimmer. | — | 10, 11 |
| Lesson card | "Lekcja gotowa", title, "{n} zadań · Wersja n", "Na początek: …", Otwórz. Its foot holds Dla kogo, **Daj lekcję**, Zapisz na później and Wydrukuj (the newest card only). | — | 12, 40, 41 |
| Rating | Dobrze / Słabo, plus "Spróbuj jeszcze raz". | — | 12 |
| Error row | role=alert box with plain words and "Kopiuj szczegóły". | — | 50 |
| Retry row | "Tej tury nie udało się dokończyć… Spróbuj ponownie". | — | 50 |
| Choose form | Replaces the composer when the AI asks: numbered options, "· polecane", "Własnymi słowami", "Pomiń pytanie". | — | (none captured) |
| Context chip | "Jadwigo AI widzi: bez dziecka / Ola / tę lekcję", with ×. | — | 11 |
| Composer | "Możesz pisać dalej…", Dla, Wyślij. Enter sends, **Esc stops**. There is **no Stop button** in the parent chat. | — | 11 |
| Następne | Under the composer: each queued follow-up with Wyślij teraz / Zmień / Usuń. | — | 11 |
| Band, outside the thread | The workspace band repeats the phase: "{words} · {n} s". | — | — |

Copy keys that exist but nothing uses: `chat_tool_count`, `chat_why`, `chat_plan_progress`, `chat_card_details`, `chat_readback_title`, `chat_footnote`, `chat_approve` ("Zgoda"), `chat_reject` ("Nie teraz").

## 4. The states to design

For each state: what happens today (screen), what is wrong, and what to decide.

### 4.1 Queued and thinking: before anything is visible

- **Today** (screen 10): the bubble, the AI header and "W kolejce 0 s", then "Myślenie… 18 s" between calls (11). For 2 to 10 seconds a parent sees only a grey line.
- **Wrong:** "Myślenie…" reads as a status label, not as the AI working. A thinking gap comes between every call, so the line jumps up and down the thread as rows land above it.
- **Decide:** one persistent "working" indicator per turn (where, and how it moves); how first-call latency feels; whether the words name the stage from the plan ("Szukam zadań…") rather than the generic "Myślenie".

### 4.2 Preparing: tools running, plan forming

- **Today** (11): the plan card (sticky, open), a sentence of agent words, then "1 krok · ostatni: Układanie lekcji o: …" groups, repeated per call.
- **Wrong:**
  - Each call adds an agent sentence and its own "1 krok" group, so a 3-call turn shows 3 groups of 1 step.
  - The plan is the only progress summary, yet in screen 13 it reads "3 z 3", all done, while the turn keeps working.
  - The sticky plan overlaps the text scrolling under it (13, top) and is narrower than the thread.
- **Decide:**
  - Does the plan become *the* progress surface, with steps nested under their stage, instead of separate step groups?
  - What happens when the AI goes back to a stage (edit, then check again)?
  - Do in-between agent sentences stay as chat bubbles, or become the plan's "now" line?

### 4.3 A widget is shown, in view

- **Today** (17, 13): lesson_edit draws a "Zmienianie lekcji · Krok s01" card per call, and question_search draws "Zestawy zadań" with all its set tags (24 in 17), both in view under their group.
- **Wrong:**
  - Cards repeat per call: the same "Krok s01" card 3 times in screen 13.
  - A card for an intermediate search is as loud as the result.
  - The cards have no hierarchy against the lesson card.
- **Decide:**
  - Which widgets are *answers*, in view (U5's week, skills, mistakes and ideas; a failed check), and which are *work*, folded (searches, edits, reads)?
  - Merge repeated cards of one verb within a turn ("Zmienione kroki: s01, s03").
  - Widget anatomy: title, icon, density, max height and "pokaż więcej".

### 4.4 A widget is expanded

- **Today** (16): group, then line, then Szczegóły, then raw JSON of the tool's input and output, 3 levels of `<details>`.
- **Wrong:** 3 nested disclosures to reach data that no parent can read. The JSON is the developer's view.
- **Decide:**
  - Should a parent ever see Szczegóły? Options: drop it; keep it behind a "for support" affordance; or replace it with a plain-words summary ("Szukałam 'mnożenie przez 2 i 5' w klasie 2: 4 zadania").
  - How deep can nesting go: 1 level?

### 4.5 Run states: the turn as a whole

| State | Today | Decide |
|---|---|---|
| running | Activity line, plan and groups. The band shows "Myślenie · 18 s". | One clear "Jadwigo pracuje" affordance with **Stop** (there is no visible Stop today; Esc stops). |
| slow (20 s) / stalled (60 s) | "To trwa dłużej niż zwykle" / "Utknęło", with Spróbuj ponownie on stalled. | Tone, and whether slow is shown at all. |
| retrying (StepTimedOut) | A full error box, "Ponowna próba.", with "Kopiuj szczegóły" for every retry (50). | Retry as a quiet inline note, not an alert box. |
| failed (StepFailed) | "Jadwigo nie dała rady dokończyć tej prośby, mimo kilku prób." plus the retry row (50, new today). | Visual weight; one block instead of 3 boxes. |
| failed step inside a turn | The red dot and the **raw English engine message** to a Polish parent (17: "nie udało się: question_types: the bank cannot list its question types yet; draw without question_types"). | Whether internal failures the AI recovers from are shown at all. |
| awaiting input | The choose form replaces the composer. "Czeka na Ciebie". | The question's look inside the thread; how the turn reads while it waits. |
| cancelled | "Zatrzymane". "Zapisane, zatrzymane." is announced to screen readers only. | |
| budget steer / stop | Rows "Kończenie lekcji z tym, co jest…" / "Zapisane, zatrzymane…". | |
| completed | The lesson card and rating (12). | See 4.6. |
| restoring / offline / send failed / limits | One-line rows. | Their placement against the composer. |

### 4.6 Done: the lesson card

- **Today** (12): "Lekcja gotowa" with title, count and "Na początek", then Daj lekcję / Zapisz na później / Wydrukuj, then the rating.
- **Wrong:**
  - **The card says "Lekcja gotowa" over a lesson that failed its check:** "Daj lekcję" is disabled, and the card counts "0 zadań" while the steps say "nie da się jeszcze pokazać" (40, 41). This is tracked as `dl-uukj.47.69`.
  - Older turns keep their cards without actions, so 3 turns show 3 cards.
- **Decide:**
  - The card's states: ready, needs fixing, working on a new version, superseded by a newer version.
  - Whether one living card replaces per-turn cards.
  - The rating's place and words (the DS already proposes "Za łatwa · W sam raz · Za trudna", waiting on a contract).

### 4.7 Long turns

- **Today** (13, 14): "Dodaj jedno zadanie z mnożeniem przez 10" ran 18 calls and drew 20 step groups, 10 widget cards and 22 agent sentences. The sentences repeat word for word ("Dodane zadanie zapiszę i zweryfikuję poprawki." ×3; "Poprawię jeszcze formatowanie i dokończę lekcję." ×2).
- **Decide:** the pattern for a turn that does a lot. Options: collapse the middle into "Jadwigo zrobiła 14 kroków" with the last state in view; dedupe identical sentences; a "working" region that rewrites in place instead of appending. This is the biggest win.

### 4.8 Follow-ups and the queue

- **Today** (11): words typed during a turn go to "Następne" under the composer, with Wyślij teraz (sent into the running turn as a steer), Zmień and Usuń. A message with photos skips the queue.
- **Decide:**
  - How a queued message reads in the thread, if at all. A photo-only queued row shows empty text, tracked as `dl-uukj.47.70`.
  - How a steer, "Dopisane w trakcie", shows inside the running turn.

### 4.9 Photos

- **Today** (01, 20, 21): chips with a progress ring on the first screen; under the sent bubble, the thumbnail and "Tak Jadwigo widzi zdjęcia"; a tap opens a dialog.
- **Decide:** the strip's weight; documents (PDF, DOCX) as chips; several photos.

### 4.10 Layouts: split view and phone

- **Today:** desktop shows the chat at 768 max with the lesson beside it when opened (30). The phone has Rozmowa / Lekcja tabs (60).
- **Decide:** how the run state shows on the Lekcja tab while the chat works (the dot on the tab in 60).

## 5. Problems seen today, with evidence

1. **Repetition in long turns:** same sentences, one group per call, one card per call (13, 14). (§4.7)
2. **The plan disagrees with the work:** "3 z 3" done while the turn continues (13).
3. **The sticky plan overlaps rows** and is narrower than the thread (13).
4. **Raw engine text reaches the parent** (`dl-uukj.47.72`), in English: failed step reasons (17), lesson_check findings such as "proposed:maths… is not a skill id… Write the skill id as lowercase words" (40), and the JSON in Szczegóły (16).
5. **"Lekcja gotowa" over a failed check,** with "0 zadań" and steps that can't be shown (40, 41). `dl-uukj.47.69`.
6. **Retries are alarms:** each "Ponowna próba." is a full alert box with Kopiuj szczegóły (50).
7. **No visible Stop** in the parent chat.
8. **The window scrolls away from the chat** when the AI follows to the bottom, leaving blank space. The cause is found: hidden screen-reader text escapes the message list. It is an engineering fix, not design, tracked as `dl-uukj.47.68`.
9. **Double focus ring** on the composer when focused (11, 13: an inner and an outer ring). `dl-uukj.47.73`.
10. **The bank's search results are off-topic** ("Zestawy zadań" for multiplication lists addition sets, 17). That is a bank fix (`dl-n9fr.76`), but the widget should still read well when results are weak.

## 6. Constraints

- **The design system of 2026-11-02 holds for everything adult.** The chat is adult; a lesson preview inside it is a kid subtree (S1). Verdict hues only in results (S3): a failed step is not red by that rule, yet it is today (the red dot). Disabled always says why (S5).
- **Every word comes from copy** (`packages/copy`, pl and en). Components type no words; new lines need a key each. Polish first, then English. Text a parent reads never shows ids, step ids ("s01"), JSON or engine messages.
- **Accessibility:** one polite live region announces the phase changes (done, waiting, stalled, failed), never each step. Rows enter with a fade only when motion is allowed. Every disclosure is keyboard-reachable. Photos and the chips are excluded from session replay.
- **What the log can't give:** no reasoning stream, no token streaming of agent words today (words arrive whole per call), no per-step duration beyond event times.
- **What engineering can add cheaply:** grouping across calls (by plan stage or by verb), deduping identical sentences, a per-turn summary, quieter retries, a Stop button. Ask for what the design needs; the log has the data.
- **Layout claims are tested in a real browser** (Playwright in `apps/web/e2e`), so say which behaviours must hold: sticky, follow to bottom, no window scroll.

## 7. Open questions for the design session

1. **The spine of a turn:** the plan (stages with steps nested), a timeline, or a single "working" block that rewrites in place and folds to a summary when done?
2. **Agent sentences between calls:** chat bubbles, the plan's "now" line, or dropped once the turn ends?
3. **Folded vs in view:** a rule for which tool results are answers (in view) and which are work (folded). Proposal to accept or reject: answers in view are the learner widgets (U5), a failed check, and the lesson card; everything else folds.
4. **Nesting depth:** 1 level (turn summary, then steps)? Is Szczegóły removed, kept for support, or turned into plain words?
5. **Failure ladder:** a retry the parent doesn't need to see; a recovered failed step (show it or not); a failed turn (one block with retry). And their weights.
6. **The lesson card's states:** ready, needs fixing, working on a new version, superseded. One living card, or one per turn?
7. **Stop:** where does it live (composer, activity line, band), and what does "Zatrzymane" leave behind?
8. **Several turns:** how earlier turns fold so the newest reads first.
9. **Phone:** the same run story in the Rozmowa tab; how the Lekcja tab signals that the chat changed the lesson.

## 8. What to hand back

1. **Decisions table**, D/S/P as in the last handoff, numbered for citing in the build.
2. **A states sheet in Polish at 1440 and 390** for: queued, thinking, a tool running with the plan, a long turn mid-way and finished, a widget in view, a widget expanded, awaiting input (the choose form), retrying, a failed step recovered, a failed turn, stopped, done with the card (ready and needs fixing), a follow-up queued and steered, photos, and 3 turns restored.
3. **Component specs** for the new or changed parts: the turn spine (plan, working block), the step row, the widget frame, the lesson card states, the activity and Stop, the error and retry rows. Each with default, hover, focus, disabled-with-reason and loading.
4. **Copy:** every new or changed line in pl and en, named by what it says.
5. **Motion:** what moves when a row lands, a stage completes, a turn ends; and what holds still under reduced motion.

## 9. References

- **Code** (`apps/web/src/chat/`): `ChatPane.tsx` (the thread), `PlanCard.tsx`, `phase.ts` (phases and announcements), `toolLine.ts` (sentences), `widgets/Widgets.tsx` (each widget), `objects/LessonCard.tsx`, `LessonActions.tsx`, `ChooseForm.tsx`, `Rating.tsx`, `queue.ts`, `attachments/ThreadAttachments.tsx`. The fold is `packages/core/src/run/index.ts`; event and status names are in `packages/contracts/src/run.ts`.
- **Research in the repo:** `docs/research/posthog-ai-ux-patterns.md` (§3 awareness, §6 widgets, §10 errors, §15.3 the chat pane) and `docs/research/chat-objects.md`.
- **Golden run logs** (`packages/testing/src/runs`): happy-turn, follow-up-mid-turn, cancel-during-a-verb, budget-steer-then-stop, plan-and-cite (a plan, a widget, citations, a choose form), steer-kept, stale-attempt, idle-vs-max-deadline. None yet for a long turn or a failed turn.
- **Issues:** `dl-uukj.47.68` (scroll), `dl-uukj.47.69` (the card over a failed check), `dl-uukj.47.70` (the photo-only queued row), `dl-n9fr.76` (bank search fit), `dl-uukj.47.72` (raw engine text in a failed step line), `dl-uukj.47.73` (the double focus ring), and `dl-uukj.47.71`, the design issue this handoff serves.
