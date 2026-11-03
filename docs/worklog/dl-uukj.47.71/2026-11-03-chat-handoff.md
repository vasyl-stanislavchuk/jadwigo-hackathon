# dl-uukj.47.71: the chat design handoff (direction 1a, 2026-11-03)

> **Amended by the owner, 2026-11-03** (decision bead `dl-ih6po`; `jadwigo-hackathon/decisions/2026-11-03-the-lesson-opens-in-a-preview-modal-from-an-expand-button-on-the`): the lesson opens in the **preview modal** from the card's expand button, not in a 500 px side pane, and the phone has **no Rozmowa / Lekcja tabs**. Where this handoff draws the pane (s06, s07), its pane header's `minimize-2`, or the phone tabs (S20, S23, D8, §9 "Lesson side pane"), build the modal instead: S20's band and "nowe" / "zmienione" tags go into the modal. The rating keeps its 2 values in the DS toggle look until `dl-uukj.47.67.21` changes the contract (S8 waits). No contract change in this wave: a tool call joins the plan stage that is in progress when it is called.
>
> The screens, the HTML states sheet and the brief's screenshots are outside git (the worklog holds notes only): `~/projects/jadwigo-design-handoffs/2026-11-03-chat-ux-design/` (`screens/`, `design/`, `reference/`). The brief is `2026-11-03-chat-brief.md` beside this note.


Date: 2026-11-03 · Status: **direction 1a decided by the owner; ready to build.**
Repo: vasyl-stanislavchuk/jadwigo-hackathon (`main` at `2f6bee23` when the brief was written), chat code in `apps/web/src/chat/`. Design issue: `dl-uukj.47.71`.

## 0. Start here (for the implementing session)

**What this is.** A redesign of how the parent's chat with Jadwigo AI reads while a turn runs: what it is doing now, what it has done, what it needs, when it is done, and what went wrong. It answers the engineering brief in `reference/brief-2026-11-03-chat-ux.md` (§-numbers "brief §4.2" cite it).

**About the design files.** Everything in `design/` is a **design reference built in HTML**: static mock frames that show the intended look and behaviour. It is not production code to copy. Recreate it in the app's own stack (React + TypeScript, `packages/ui` = shadcn/ui on Radix, Tailwind tokens from the parent design system) following the repo's patterns. The PNGs in `screens/` are the same frames, exported.

**Fidelity: high.** Colours, type, sizes, radii, spacing and copy are final. Match them. Where a drawing and this README disagree, **this README wins**.

**Read in this order.**
1. This file, §1 (decisions) and §9 (shadcn mapping).
2. `reference/parent-design-system.md`: the adult design system of 2026-11-02 (DS D1–D20, S1–S23). Everything here builds on it; "DS S3" cites that file. Its tokens (§2 there) and Button variants (§6.1 there) are assumed.
3. `screens/`: one 1440 and one 390 PNG per state (§12 index).
4. §2–§8 while building; §10 for state shape; §14 for build order and acceptance.

**Hard rules that cut across everything.**
- No ids, step ids ("s01"), JSON, or engine/English text ever reaches the parent. Every visible word is a copy key in `packages/copy` (pl + en), §5.
- No red, green or help yellow in the chat except inside a result widget (DS S3). Failures are ink with an alert icon.
- One nesting level: spine → stage → line. A line never opens.
- Adult controls are flat (DS D4): no pressed edge, no translate on press. Focus is the soft 3 px halo (DS D15).
- Light only (DS D10). No Ukrainian in the parent app (DS D14).

---

## 1. Decisions

### 1.1 Owner decisions (D)

| # | Decision | Beat |
|---|---|---|
| D1 | **The plan is the spine of a turn (1a).** One card per turn. Its stages hold their own lines. Done stages fold to one summary; the active stage is open. Going back to a stage re-opens it with "drugi raz" / "trzeci raz". | 1b one block rewritten in place; 1c a timeline of agent sentences |
| D2 | **No "etap n z m" count.** The AI can add a stage mid-turn, so a count can go backwards. Header shows elapsed time only. | "Plan · 2 z 3" |
| D3 | **The open stage shows at most 3 lines.** Older lines fold into "{n} wcześniej", which opens them in place. | Unbounded growth (screen 13) |
| D4 | **Agent sentences during a turn become the now line**, replacing each other in place. Only the turn's last message (the reply, no tool call after it) is drawn as prose. | Bubbles between calls; dropping them |
| D5 | **When the turn ends the card folds in place** to one row "Zrobione w {n} etapach · {k} kroków · {t}". Below it: the reply, the lesson card, the rating. | Card stays open |
| D6 | **A follow-up sent mid-turn waits above the composer**: "Wyślę, gdy skończę", Wyślij teraz, ×. It enters the thread only when its own turn starts. | "Następne" list under the composer |
| D7 | **A failed turn is drawn inside its spine**: the failed stage gets the ink alert, stages that never ran stay hollow, the message and Spróbuj ponownie sit in the card foot. No red. | Three boxes (screen 50) |
| D8 | **Phone**: stage summaries wrap under the stage name; the time sits under the header title; cards are full width. | Same row layout squeezed |

### 1.2 Accepted from turn 1 (S1–S8)

| # | Rule |
|---|---|
| S1 | **Answers in view, work folded.** In view: learner widgets (week, skills, mistakes, ideas), the lesson card, and a check that needs fixing (inside the card, S16). Searches, reads, edits and drafts are lines in the spine. |
| S2 | **Repeated work merges**: one line per verb per stage with merged values ("Poprawiłam podpowiedzi w zadaniach 1 i 3"); an agent sentence identical to the previous now line is not drawn again. |
| S3 | **No JSON, ids, step ids or engine text** reach the parent. Every line is a copy key with values. Szczegóły is removed. A failed turn offers "Kopiuj szczegóły dla pomocy", which copies the run log to the clipboard. |
| S4 | **One level of nesting**: spine → stages → lines. A line never opens. |
| S5 | **Failure ladder**: a retry is a quiet line; a failed step the AI gets past is not shown while running (S13 after); a failed turn is one block (D7). Verdict hues never (DS S3). |
| S6 | **Stop lives in the composer**: outline "Zatrzymaj" while a turn runs (phone: 40 px icon button), Esc anywhere in the chat. The text box stays usable. |
| S7 | **One living lesson card**, in the newest turn that produced a version. Older versions become a one-line row "{title} · wersja {n} · jest nowsza". Only the living card has actions. |
| S8 | **Rating** is the DS toggle group: za łatwa · w sam raz · za trudna (DS S11). |

### 1.3 New in this sheet (S9–S20, accepted on review unless rejected)

| # | Rule | State |
|---|---|---|
| S9 | **The spine appears at send**, header "W kolejce · 0 s". It is the turn's one working indicator. The activity line and the band's phase repeat are removed from the chat column. | s01 |
| S10 | **Thinking words**: before a plan, the header says "Zastanawiam się nad lekcją" (or the verb's area: "…nad pytaniem" for U5). With a plan, the now line names the active stage in first person ("Układam…", "Sprawdzam…"). No shimmer; the seconds count. | s02, s03 |
| S11 | **Slow / stalled**: at 20 s without an event the open stage adds the line "To trwa dłużej niż zwykle. Pracuję dalej." At 60 s the card gets a foot: "Nic się nie dzieje od minuty." + Spróbuj ponownie + Czekaj dalej. | s04, s05 |
| S12 | **Awaiting input**: the choose form replaces the composer; the waiting stage takes the person icon and the line "Czekam na Twoją odpowiedź poniżej"; the header meta reads "czeka na Ciebie". | s10 |
| S13 | **A recovered failure** shows only after the turn, inside its opened stage, as a dash line in plain words. | s12 |
| S14 | **Search results are tags on the search line**, not a card. More than 4: the first 4 by fit, then an outline chip "+{n} więcej" (chevron-down) that opens the rest in place on the same line and becomes "Zwiń" (chevron-up). Closed by default every time the stage opens. Weak results read as tags too; no "Zestawy zadań" card. | s09, s09b |
| S15 | **Stopped**: the running stage takes the square; header meta "zatrzymane · {t}"; foot states which version stands: "Lekcja została w wersji {n}, nic w niej nie zmieniłam." or "…w wersji {n}, z tym, co zdążyłam zmienić." Focus moves to the composer. | s14 |
| S16 | **Lesson card states**: *ready* ("Lekcja gotowa", actions); *needs fixing* ("Lekcja do poprawy", the check's findings listed in the card, Daj lekcję disabled with its reason on the card, primary "Popraw za mnie" which sends a fix request as a new turn); *working* (label "Wersja {n} · Jadwigo robi wersję {n+1}", actions still give version n); *superseded* (one-line row, S7). Never "0 zadań": a card with no showable steps is *needs fixing*. Fixes `dl-uukj.47.69`. | s06, s15, s16 |
| S17 | **A steer is a line in the active stage**, label "Dopisane w trakcie", the parent's words in quotes. The next now line answers it. Fixes the photo-only empty row (`dl-uukj.47.70`): a photo-only steer reads "„{n} zdjęcia”". | s18 |
| S18 | **Attachments under the bubble**: photos 64 × 80 (phone 56 × 70), documents as same-height tiles with file icon, name and "{n} strony". One caption "Tak Jadwigo widzi zdjęcia" per bubble. | s19 |
| S19 | **Older turns** keep their bubble, the folded summary, the reply clamped to 2 lines in muted ink (opens on click), and the superseded row. A day divider ("Wczoraj", "Dziś", then dates) separates sessions. After reload the thread opens at the bottom. | s20 |
| S20 | **The lesson reflects the run**: desktop pane gets the band "Jadwigo zmienia tę lekcję. Wersja {n} pojawi się tutaj." and tags steps "nowe" / "zmienione" for the newest version until opened; phone Lekcja tab shows a spinner while a turn changes the lesson and a dot when a new version is unseen. | s06, s07 |
| S21 | **"Jadwigo AI widzi" chip removed**: Dla in the composer already says it. If "tę lekcję" context is needed, the breadcrumb names the lesson. | all |
| S23 | **The lesson opens from its card**: the icon button top-right on the lesson card opens the side pane; the top-bar "Pokaż lekcję" is removed. The pane may also open by itself the first time a lesson is ready (suggested, closable). Owner, 2026-11-03. | s07, s15 |
| S22 | **One focus ring on the composer**: the box's border goes #3a5fa8 with the DS halo; the textarea has none. Fixes `dl-uukj.47.73`. | s14, s17 |

### 1.4 Parked (P)

| # | Item |
|---|---|
| P1 | Token streaming of agent words: the now line is designed to accept it (replace in place) but nothing depends on it. |
| P2 | learner_skills, learner_mistakes and lesson_ideas widgets: same frame as Tydzień (§4.4); their bodies are drawn with the 8 parent screens. |
| P3 | Citations ("Dlaczego?" chips): kept under the reply only, unchanged until a run with citations is reviewed. |
| P4 | English copy read by a native speaker. |

---

## 2. The model the build needs (asks to engineering)

All from the existing log; brief §6 lists these as cheap.

1. **Turn title**: the first agent sentence of the turn, trimmed to one clause (≤ 60 chars). Until it exists the header shows the phase words.
2. **Group tool calls by plan stage**, across agent words. A call with no stage joins the active stage; a turn with < 3 stages has no stage rows, only lines under the header.
3. **Stage re-entry count**: a stage that was done and runs again shows "drugi raz", "trzeci raz".
4. **Merge** lines of one verb within one stage visit; **dedupe** a now line identical to the previous.
5. **Reply detection**: the last `message` after which no `tool_call` came in this turn.
6. **Recovered flag**: a failed `tool_result` followed by any successful call in the same turn.
7. **Card state** from the newest `lesson_revision` + its `lesson_check` result (S16).
8. **Plain-words lines**: each verb × outcome has a copy key with values (§5). The engine's own message is never a fallback; an unknown failure uses `chat_line_failed_generic`.

---

## 3. Behaviour that must hold (Playwright)

- The window never scrolls; only the thread does (`dl-uukj.47.68`).
- The thread follows the bottom while the parent is within 80 px of it. Scrolled up, it holds position (scroll anchoring on the growing card) and shows a "Najnowsze" pill above the composer.
- The spine is **not sticky**. It grows in place.
- A collapse at turn end keeps the reply's top where the card's foot was (no jump for a parent reading at the bottom).
- Focus stays in the composer when a turn ends, is stopped, or fails.
- Esc stops a running turn when focus is in the thread or composer, unless a menu or dialog is open.
- Enter on a focused summary row or done stage row toggles it; Space too. `aria-expanded` on both.
- One polite live region announces only: "Jadwigo pracuje", "Czeka na Ciebie", "Gotowe", "Zatrzymane", "Nie udało się", "Utknęło". Never each line.

---

## 4. Component specs

Type: Geist; body 14/22, rows 13.5/20, lines 13/19, small 12.5/18. Colours: ink #22252d, muted #50535c, faint #726f68, line #e8e2d5, input #d9d3c6, stone #f5f5f4 / #fafaf9 / #efeeeb, primary #3a5fa8 (hover #33549a), picked #dce8fb / #163a78. Focus = DS halo `0 0 0 3px rgb(58 95 168 / .28)`. Thread column max 768 (+24 padding); phone padding 16.

### 4.1 Turn spine (card)
- Border 1 px line, radius 10, white. Header #fafaf9, padding 10 × 14 (phone 12), 1 px line under it when it has a body.
- Header: icon 16 (loader blue while running, person blue while waiting, alert ink failed, square ink stopped) · title 13.5/600 · meta 12.5 muted tabular right (phone: under the title).
- Stage row: padding 6 × 14, icon 16 (check blue done, loader blue active, circle #8e897f todo, alert ink failed, square ink stopped, person blue waiting), name 13.5/500 (todo 400 muted), summary 12.5 muted, chevron 14 for done (right) / open (down).
- Lines: inset 40, gap 6, 13/19 muted with 14 icon; the now line ink 500 with the blue corner-arrow and a seconds count. Steer: label 12/500 faint above ink quote.
- Foot (failed, stalled, stopped): 1 px line above, padding 14, title 14/600, body 13 muted, buttons 32 (phone 36).
- Hover: done stage rows #f5f5f4. Focus: halo on the row, radius 6. Disabled: none. Loading: is the running state.

### 4.2 Turn summary row (folded spine)
- 36 tall (phone 40), padding 8 × 14, border 1 px line, radius 10, #fafaf9. Check blue 16 · title 13.5/500 · meta 12.5 muted · chevron-right. Opens to the full card with chevron-up.
- Hover #f5f5f4; focus halo; never disabled.

### 4.3 Widget frame
- Border 1 px line, radius 10, white. Header padding 10 × 14: icon 16 ink · title 13.5/600 · meta 12.5 muted; 1 px line under.
- Body rows padding 9 × 14, separator #f0ece3. Max body height 240; beyond it a ghost "Pokaż wszystkie ({n})" row, 28 tall.
- Tydzień row: date 44 · topic (ellipsis) · result bar 64 × 8 (DS result bar, hues allowed) · "{r} z {n} dobrze". Phone: date 40 · topic with the count under it · bar 56.
- Loading: none; a widget arrives whole with its result.

### 4.4 Lesson card
- Border 1 px line, radius 10. Top: 32 icon tile (#f5f5f4, book / alert / loader blue) · label 12.5/500 muted · title 16/600 · meta · first step (ellipsis) · an icon button in the top-right corner: 32 × 32 outline, `maximize-2` 16 (expand arrows), tooltip "Rozwiń lekcję" (DS tooltip, 400 ms), same words as its aria-label (phone: chevron button 36, opens the Lekcja tab).
- It opens the lesson pane beside the chat (500 wide, s06); with the pane open the card and the pane header show `minimize-2` (collapse arrows) with the tooltip "Zwiń lekcję", which closes it. The pair reads like fullscreen / exit fullscreen, even though the lesson opens as a side pane (owner, 2026-11-03). This replaces the top-bar "Pokaż lekcję" button, which is removed (S23).
- Findings (needs fixing): 1 px line above, inset 60 (phone 12), alert 14 ink, "**Zadanie {n}.** {finding}".
- Foot #fafaf9: Dla select, print icon, Daj lekcję primary. No "Zapisz na później": every lesson is already saved in Lekcje (owner, 2026-11-03). Phone: Dla on its own row, then Daj lekcję full-width 44 + print 44.
- Needs fixing foot: reason line 12.5 muted, Daj lekcję disabled (#f5f5f4 / #726f68, `aria-disabled`, tooltip with the same reason), Popraw za mnie primary with pencil.
- Superseded row: 36 tall, radius 8, book 14 muted · title 500 · "wersja {n} · jest nowsza" · ghost "Otwórz tę wersję".

### 4.5 Composer, Stop, queue
- Box: border 1 px input, radius 10, padding 10 × 12; focus border #3a5fa8 + halo (one ring, S22). Text 14 (phone 16).
- Row: Dla select 30 (phone 36) · photo button · Zatrzymaj (outline, square icon, only while running) · Wyślij (primary with text, quiet #f5f5f4 without; tooltip "Napisz coś albo dodaj zdjęcie."). Phone: Zatrzymaj and Wyślij are 40 square icon buttons with labels for screen readers.
- Zatrzymaj loading: "Zatrzymuję…" with spinner, width held, until `cancelled` arrives.
- Queue row: radius 8, #fafaf9, corner-arrow · text (ellipsis) · "Wyślę, gdy skończę" · Wyślij teraz ghost 28 · × 28. Phone: two lines, buttons 36.
- Choose form: replaces the box; "Jadwigo pyta" 12.5 muted, question 14.5/600, options 40 (phone 48) outline radius 6 with key number, "polecane" muted; free-text field; ghost "Pomiń pytanie".

### 4.6 Error and retry rows
- Retry: a line in its stage, rotate icon, muted. Never a box.
- Failed turn and stalled: the spine foot (4.1). Buttons: Spróbuj ponownie (outline, rotate), Kopiuj szczegóły dla pomocy (ghost; toast "Skopiowane" on success), Czekaj dalej (ghost).
- Offline / send failed / limits: one muted line above the composer with an info icon and one action ("Spróbuj ponownie"), never inside the thread.

---

## 5. Copy (pl · en)

Values in braces. Polish uses the feminine first person for Jadwigo, as today.

| Key | pl | en |
|---|---|---|
| chat_phase_queued | W kolejce | Queued |
| chat_phase_queued_line | Zacznę za chwilę. | Starting in a moment. |
| chat_phase_thinking_lesson | Zastanawiam się nad lekcją | Thinking about the lesson |
| chat_phase_thinking_question | Zastanawiam się nad pytaniem | Thinking about your question |
| chat_phase_waiting_meta | czeka na Ciebie | waiting for you |
| chat_phase_stopped_meta | zatrzymane · {t} | stopped · {t} |
| chat_phase_failed_meta | przerwane · {t} | stopped early · {t} |
| chat_slow_line | To trwa dłużej niż zwykle. Pracuję dalej. | This is taking longer than usual. Still working. |
| chat_stalled_title | Nic się nie dzieje od minuty. | Nothing has happened for a minute. |
| chat_stalled_body | Możesz poczekać albo zacząć tę prośbę od nowa. To, co już jest w lekcji, zostanie. | You can wait or start this request again. What is already in the lesson stays. |
| chat_wait_more | Czekaj dalej | Keep waiting |
| chat_stage_again_2 / _3 | drugi raz / trzeci raz | second time / third time |
| chat_stage_failed_sum | nie wyszło po {n} próbach | didn't work after {n} tries |
| chat_stage_stopped_sum | zatrzymane | stopped |
| chat_lines_earlier | {n} wcześniej | {n} earlier |
| chat_line_waiting | Czekam na Twoją odpowiedź poniżej | Waiting for your answer below |
| chat_line_retry | {stage} trwało za długo, próbuję jeszcze raz | {stage} took too long, trying again |
| chat_stage_retry_sum | druga próba | second try |
| chat_line_recovered_types | Nie dało się sprawdzić rodzajów zadań, więc ułożyłam lekcję bez tego | Couldn't check the question types, so I built the lesson without them |
| chat_line_failed_generic | Ten krok się nie udał, poszłam dalej bez niego | This step didn't work, I carried on without it |
| chat_line_search | Szukałam „{query}” w klasie {grade}: {n} zestawy | Searched "{query}" in grade {grade}: {n} sets |
| chat_tags_more | +{n} więcej | +{n} more |
| chat_tags_less | Zwiń | Show less |
| chat_line_search_pick | Wybrałam {n} zestawy, które pasują do {grade} klasy | Picked {n} sets that fit grade {grade} |
| chat_line_draft | Ułożyłam {n} zadania z {topic} | Built {n} questions on {topic} |
| chat_line_edit_added | Dodałam zadanie {n}: {topic} | Added question {n}: {topic} |
| chat_line_edit_hints | Poprawiłam podpowiedzi w zadaniach {list} | Fixed the hints in questions {list} |
| chat_line_check_found | Sprawdziłam lekcję: {n} rzeczy do poprawy | Checked the lesson: {n} things to fix |
| chat_line_check_ok | Sprawdziłam lekcję: wszystko w porządku | Checked the lesson: all good |
| chat_line_read | Przeczytałam lekcję: {n} zadania | Read the lesson: {n} questions |
| chat_steer_label | Dopisane w trakcie | Added while working |
| chat_steer_photos | „{n} zdjęcia” | "{n} photos" |
| chat_summary_done | Zrobione w {n} etapach | Done in {n} stages |
| chat_summary_done_fix | Zrobione, {n} zadania do poprawy | Done, {n} questions to fix |
| chat_summary_meta | {k} kroków · {t} | {k} steps · {t} |
| chat_failed_title | Nie udało się ułożyć lekcji. | Couldn't build the lesson. |
| chat_failed_body | Jadwigo próbowała {n} razy. Twoja prośba jest zapisana, możesz spróbować jeszcze raz. | Jadwigo tried {n} times. Your request is saved, you can try again. |
| chat_retry | Spróbuj ponownie | Try again |
| chat_copy_support | Kopiuj szczegóły dla pomocy | Copy details for support |
| chat_copied | Skopiowane | Copied |
| chat_stopped_none | Zatrzymane. Lekcja została w wersji {n}, nic w niej nie zmieniłam. | Stopped. The lesson is still version {n}; I didn't change anything. |
| chat_stopped_some | Zatrzymane. Lekcja została w wersji {n}, z tym, co zdążyłam zmienić. | Stopped. The lesson is now version {n}, with what I managed to change. |
| chat_stop | Zatrzymaj | Stop |
| chat_stopping | Zatrzymuję… | Stopping… |
| chat_send_disabled | Napisz coś albo dodaj zdjęcie. | Type something or add a photo. |
| chat_queue_label | Wyślę, gdy skończę | I'll send this when I'm done |
| chat_queue_now | Wyślij teraz | Send now |
| chat_queue_photos_wait | Zdjęcia wyślę dopiero po tej odpowiedzi. | I'll send photos after this answer. |
| chat_newest | Najnowsze | Newest |
| card_ready | Lekcja gotowa | Lesson ready |
| card_fix | Lekcja do poprawy | Lesson needs fixing |
| card_working | Wersja {n} · Jadwigo robi wersję {n+1} | Version {n} · Jadwigo is making version {n+1} |
| card_superseded | wersja {n} · jest nowsza | version {n} · newer exists |
| card_open_version | Otwórz tę wersję | Open this version |
| card_expand | Rozwiń lekcję | Expand lesson |
| card_collapse | Zwiń lekcję | Collapse lesson |
| card_fix_reason | Daj lekcję będzie można, gdy zadania będą poprawione. | You can give the lesson once the questions are fixed. |
| card_fix_reason_short | Najpierw trzeba poprawić {n} zadania. | {n} questions need fixing first. |
| card_fix_action | Popraw za mnie | Fix it for me |
| lesson_pane_band | Jadwigo zmienia tę lekcję. Wersja {n} pojawi się tutaj. | Jadwigo is changing this lesson. Version {n} will appear here. |
| lesson_tag_new / _changed | nowe / zmienione | new / changed |
| rating_label | Ta lekcja jest | This lesson is |
| rating_easy / ok / hard | za łatwa / w sam raz / za trudna | too easy / just right / too hard |
| choose_label | Jadwigo pyta | Jadwigo asks |
| choose_recommended | polecane | recommended |
| choose_own | Albo napisz własnymi słowami… | Or say it in your own words… |
| choose_skip | Pomiń pytanie | Skip question |
| attach_caption | Tak Jadwigo widzi zdjęcia | This is how Jadwigo sees the photos |
| attach_pages | {n} strony | {n} pages |
| day_yesterday / today | Wczoraj / Dziś | Yesterday / Today |
| live_working / waiting / done / stopped / failed / stalled | Jadwigo pracuje / Czeka na Ciebie / Gotowe / Zatrzymane / Nie udało się / Utknęło | Jadwigo is working / Waiting for you / Done / Stopped / Didn't work / Stuck |

Polish plurals (zestawy/zestawów, zadania/zadań, kroki/kroków, etapach) go through the copy package's plural rules; the table shows the 2–4 form.

Removed keys: `card_save_later` ("Zapisz na później"), `chat_phase_thinking` ("Myślenie…"), `chat_details` (Szczegóły), `chat_sent_data`, `chat_returned`, `chat_context_chip` (S21), `chat_next` ("Następne"), `rating_good` / `rating_bad`. Unused keys from brief §3 stay unused except `chat_plan_progress`, which is deleted (D2).

---

## 6. Motion

| Moment | Motion | Reduced motion |
|---|---|---|
| Spine appears (send) | Fade 160 ms, height from 0, ease-out | Appears |
| A line lands in a stage | Fade 160 ms; the stage grows 160 ms ease-out | Appears |
| Now line changes | Cross-fade 120 ms, height held at the taller of the two | Text swaps |
| Line folds into "{n} wcześniej" | The oldest line fades 120 ms while the count updates | Swaps |
| Stage completes | Loader → check (no scale), its lines collapse to the summary 200 ms; the next stage opens 200 ms | Swaps |
| Turn ends | Card collapses to the summary row 240 ms ease-out, anchored to its top; reply fades in 160 ms after 80 ms; lesson card fades 160 ms | All appear at once |
| Loader | Rotates 1 s linear | Static arc; the seconds still count |
| Old card → superseded row | Height to 36, 200 ms | Swaps |
| Queue row leaves (Wyślij teraz) | Fades 120 ms; steer line lands as above | Swaps |

Nothing moves sideways; nothing bounces or shakes. The elapsed time ticks once a second and is not announced.

---

## 7. Screen map (brief → state)

| Brief screen | State in `Chat States.dc.html` |
|---|---|
| 10 queued, empty thread | s01 |
| 11 running, plan, groups, thinking, queue | s02, s03, s17 |
| 12 ready card, rating | s15 |
| 13, 14 long turn | s06, s07 |
| 15 plan unfolded | s09 |
| 16 group / line / Szczegóły open | s09 (Szczegóły removed, S3) |
| 17 widget cards in view, failed step | s08, s09, s09b, s12 |
| 20, 21 photos | s19 |
| 30 split view | s06 |
| 40, 41 ready card over failed check | s16 |
| 50 every try failed | s11, s13 |
| 60 phone chat | 390 column of every state |

## 8. Code to change (brief §9)

| File | Change |
|---|---|
| `ChatPane.tsx` | Draws turns as bubble · spine · reply · card · rating; removes step groups, the activity line and the context chip |
| `PlanCard.tsx` | Becomes the spine (4.1, 4.2); no sticky, no count |
| `phase.ts` | Phase words → header/now line copy (§5); live region per §3 |
| `toolLine.ts` | Sentences → copy keys with values, merged per stage (§2.4, §2.8) |
| `widgets/Widgets.tsx` | Learner widgets in the frame (4.3); search / edit / read widgets become line tags or lines |
| `objects/LessonCard.tsx`, `LessonActions.tsx` | Four states (S16) |
| `ChooseForm.tsx` | Look per 4.5 |
| `Rating.tsx` | Toggle group (S8) |
| `queue.ts` | Queue row above the composer (D6); steer as a stage line (S17) |
| `attachments/ThreadAttachments.tsx` | Document tiles (S18) |


---

## 9. shadcn/ui mapping

Every part below is built from `packages/ui` (shadcn/ui, Radix underneath) restyled only through the parent DS variables. Nothing new is hand-rolled where a shadcn part exists. "New" = a chat composite in `apps/web/src/chat/` assembled from these parts.

| Part (this README) | shadcn/ui parts | Notes |
|---|---|---|
| Turn spine card (4.1) | **Card** (no CardHeader padding defaults: use 10 × 14) + **Collapsible** per done stage | New `TurnSpine`. Card is the frame; the header is a plain div while running. Each done stage row is a `CollapsibleTrigger` (`aria-expanded`). |
| Turn summary row (4.2) | **Collapsible** (root wraps the whole spine) | Folded spine = `CollapsibleTrigger` rendered as the row; `CollapsibleContent` = the stages. Animate height with the Collapsible's `--radix-collapsible-content-height` (§6). |
| Stage row / lines | plain markup + Lucide icons | Not buttons unless done (S4). Loader = Lucide `loader` spinning. |
| "{n} wcześniej" fold | **Collapsible** (nested trigger inside the open stage) | Only exception to one-level nesting: it reveals siblings of the same level, not a deeper level. |
| Search tags + "+{n} więcej" | **Badge** variant `secondary` for each set; **Button** `outline` size `xs` (24) for the chip | Chip toggles local state; first 4 by fit (S14). |
| Widget frame (4.3) | **Card** + **ScrollArea** (max 240) or **Collapsible** for "Pokaż wszystkie" | Tydzień row uses the DS **result bar** (DS §6.9). |
| Lesson card (4.4) | **Card**, **Button** (`default` = primary, `outline`, `secondary`), **Select**/Combobox for Dla (DS §6.4), **Tooltip** on the icon button and on disabled Daj lekcję | Expand/collapse icon button = `Button variant="outline" size="icon"` 32, Lucide `maximize-2` / `minimize-2`. Disabled = `aria-disabled` + Tooltip (DS S5), never `disabled`. |
| Superseded row | **Button** `ghost` inside a bordered row | |
| Rating | **ToggleGroup** `type="single"` (DS §6.7 Segmented) | Second tap clears (Radix allows empty value). |
| Composer (4.5) | **Textarea** (borderless inside a bordered wrapper), **Button**, Dla **Select** | One focus ring: `:focus-within` on the wrapper; Textarea gets `focus-visible:ring-0` (S22). |
| Zatrzymaj | **Button** `outline` + **Tooltip** "Zatrzymaj · Esc" with **Kbd** | Phone: `size="icon"` 40 with `aria-label`. |
| Queue row | plain row + **Button** `ghost` size `sm` (28) | |
| Choose form | **RadioGroup** rendered as option cards (DS Radio Cards, S9 there) + **Input** + **Button** `ghost` | Keys 1–9 pick, Esc skips. |
| Spine foot (failed / stalled / stopped) | **Button** `outline` / `ghost` | Not an **Alert**: it sits inside the spine (D7). |
| "Kopiuj szczegóły dla pomocy" | **Button** `ghost` + **Sonner** toast "Skopiowane" (DS §6.10, kind Zrobione) | |
| Offline / send failed / limits | plain line above the composer | Not an Alert. |
| Day divider | **Separator** with label | |
| Lesson side pane (s06) | layout column (not a Sheet on desktop); phone = **Tabs** Rozmowa / Lekcja | Tab trigger gets the spinner or dot (S20). |
| Photo dialog | **Dialog** | Unchanged from today. |
| Live region | `<div aria-live="polite" class="sr-only">` | One per page (§3). Keep it inside the message list's positioned box (fixes `dl-uukj.47.68`). |

Lucide names used: `check`, `loader` (spin), `circle`, `alert-circle`, `square`, `user`, `corner-down-right`, `rotate-ccw`, `minus`, `more-horizontal`, `info`, `chevron-right/down/up`, `book-open`, `calendar`, `printer`, `pencil`, `maximize-2`, `minimize-2`, `send`, `image`, `file-text`, `x`, `crown` (AI header, colour #c79a1e). Sizes: 16 in rows and buttons, 14 in lines and small buttons, 12 in the tag chip.

---

## 10. State model (what the components take)

Derived on the client from the run log (brief §2) by the fold in `packages/core/src/run/index.ts`, extended per §2 asks. Suggested shape:

```ts
type StageStatus = 'todo' | 'active' | 'done' | 'failed' | 'stopped' | 'waiting';
type LineKind = 'done' | 'now' | 'retry' | 'skip' | 'slow' | 'wait' | 'steer' | 'earlier';

interface SpineLine {
  kind: LineKind;
  copyKey: string; values: Record<string, string | number>;   // never raw text
  startedAt?: number;              // 'now' lines show elapsed seconds
  tags?: { id: string; copyKey: string; values: Record<string, unknown> }[]; // search sets, sorted by fit
  steerLabel?: boolean;            // 'Dopisane w trakcie'
}
interface Stage { id: string; nameKey: string; status: StageStatus; visit: number; // 2 → "drugi raz"
  summary?: { copyKey: string; values: Record<string, unknown> }; lines: SpineLine[]; }

interface TurnSpine {
  phase: 'queued' | 'thinking' | 'tool' | 'slow' | 'stalled' | 'awaiting_input' | 'done' | 'failed' | 'cancelled';
  titleKey: string; titleValues?: Record<string, unknown>;   // §2.1
  startedAt: number; endedAt?: number; stepCount: number;
  stages: Stage[];                 // [] when the plan has < 3 stages: lines go under the header
  looseLines: SpineLine[];         // used when stages is []
  foot?: { kind: 'failed' | 'stalled' | 'stopped'; tries?: number; versionStands?: number; changed?: boolean };
  open: boolean;                   // UI state: folded summary vs open, default false when done
}

type LessonCardState =
  | { kind: 'ready'; lessonId: string; version: number; title: string; count: number; first: string }
  | { kind: 'fix';   lessonId: string; version: number; title: string; count: number; findings: { step: number; copyKey: string }[] }
  | { kind: 'working'; lessonId: string; version: number; nextVersion: number; title: string; count: number; first: string }
  | { kind: 'superseded'; lessonId: string; version: number; title: string };

interface Turn { id: string; parent: { text: string; photos: Photo[]; docs: Doc[] };
  spine: TurnSpine; reply?: { text: string; citations?: unknown[] };
  widgets: Widget[];               // learner widgets only (S1)
  card?: LessonCardState; rating?: 'easy' | 'ok' | 'hard' | null; dayLabel?: string; }

interface Composer { text: string; attachments: Attachment[]; child: ChildId | null;
  running: boolean; stopping: boolean; queued: { id: string; text: string; photos: number }[];
  choose?: { questionKey: string; options: { id: string; labelKey: string; recommended?: boolean }[] }; }
```

Rules the fold must apply: §2 items 1–8. The living card is the one on the newest turn whose `lesson_revision` is the lesson's latest; every earlier card renders as `superseded`. A card with 0 showable steps is `fix`, never `ready`.

---

## 11. Tokens used (all from the parent DS; no new tokens)

| Role | Value | Where |
|---|---|---|
| ink | #22252d | text, failed/stopped icons |
| muted | #50535c | secondary text, line text, meta |
| faint | #726f68 | placeholders, labels above steer, disabled text |
| control-edge | #8e897f | todo stage circle, dashed "Bez dziecka" disc |
| line | #e8e2d5 | card borders, separators |
| line-soft | #f0ece3 | widget row separators, split pane rows |
| input | #d9d3c6 | outline buttons, composer, select, chips |
| stone 100 / 50 / 150 | #f5f5f4 / #fafaf9 / #efeeeb | hover + bubble + disabled fill / card header + summary row + queue row / photo placeholder + tag "zmienione" |
| primary | #3a5fa8 (hover #33549a), text #fff | Daj lekcję, Wyślij, Popraw za mnie; running/done icons |
| picked | #dce8fb fill · #9fbaeb ring · #163a78 text | rating pick |
| result hues | #3f8a46 / #a07c14 / #c4402f | result bar inside widgets only |
| crown | #c79a1e | AI header crown |
| child tone (Ola) | fill oklch(0.92 0.055 200), initial oklch(0.40 0.11 200) | Dla disc |
| focus | 0 0 0 3px rgb(58 95 168 / .28) | every focusable |
| tooltip shadow | --shadow-float | tooltips |
| radius | 4 rating segment · 6 controls, tags · 8 queue row, superseded row · 10 cards, composer, bubble | |
| type | Geist 400/500/600; body 14/22 · row 13.5/20 · line 13/19 · small 12.5/18 · label 12/16 · card title 16/22 · composer 14 (phone 16) | tabular-nums on every time and count |
| layout | sidebar 232 · top bar 56 · thread max 768 + 24 padding each side, bottom-anchored · lesson pane 500 · phone padding 16, tabs 34 tall | |

---

## 12. Screens index

`screens/{id}-{name}-1440.png` (1440 × 900) and `-390.png` (390 × 844 at 2×). Frames show the bottom of the thread, as when the chat follows the newest row.

| Id | State | Rules shown |
|---|---|---|
| s01 | queued | see the note above the frame in `design/Chat States.dc.html` |
| s02 | thinking | see the note above the frame in `design/Chat States.dc.html` |
| s03 | tool-running-plan | see the note above the frame in `design/Chat States.dc.html` |
| s04 | slow | see the note above the frame in `design/Chat States.dc.html` |
| s05 | stalled | see the note above the frame in `design/Chat States.dc.html` |
| s06 | long-turn-midway | see the note above the frame in `design/Chat States.dc.html` |
| s07 | long-turn-finished | see the note above the frame in `design/Chat States.dc.html` |
| s08 | widget-in-view | see the note above the frame in `design/Chat States.dc.html` |
| s09 | turn-expanded | see the note above the frame in `design/Chat States.dc.html` |
| s09b | many-sets-folded / -opened | see the note above the frame in `design/Chat States.dc.html` |
| s10 | awaiting-input | see the note above the frame in `design/Chat States.dc.html` |
| s11 | retrying | see the note above the frame in `design/Chat States.dc.html` |
| s12 | failed-step-recovered | see the note above the frame in `design/Chat States.dc.html` |
| s13 | failed-turn | see the note above the frame in `design/Chat States.dc.html` |
| s14 | stopped | see the note above the frame in `design/Chat States.dc.html` |
| s15 | done-ready | see the note above the frame in `design/Chat States.dc.html` |
| s16 | done-needs-fixing | see the note above the frame in `design/Chat States.dc.html` |
| s17 | followup-queued | see the note above the frame in `design/Chat States.dc.html` |
| s18 | followup-steered | see the note above the frame in `design/Chat States.dc.html` |
| s19 | photos-docs | see the note above the frame in `design/Chat States.dc.html` |
| s20 | three-turns-restored | see the note above the frame in `design/Chat States.dc.html` |
| components-states.png | Component states grid | default / hover / focus / disabled + why / loading for the 10 interactive parts |

`reference/before/` holds the brief's screenshots of today's build (numbered as in brief §3–5); §7 maps them to these states.

---

## 13. Files in this package

- `README.md` — this file; the source of truth.
- `screens/` — 43 PNGs: every state at 1440 and 390, plus the component states grid.
- `design/Chat States.dc.html` — the states sheet (open in a browser from this folder; it needs `support.js`, `icons.js`, `ChatScreen.dc.html` beside it and an internet connection for Geist. Design-system stylesheet links under `_ds/` will 404 outside the design project; nothing visible depends on them).
- `design/ChatScreen.dc.html` — the one drawn screen, data-driven: rows of `user / ai / spine / text / textOld / widget / card / old / rating / day`, a composer, and the split pane. Its logic class shows how each state maps to icons and colours.
- `design/icons.js` — the Lucide subset used by the drawings.
- `reference/parent-design-system.md` — the adult DS handoff (tokens, Button variants, Tooltip, Toast, Toggle Group, result bar, child tones).
- `reference/brief-2026-11-03-chat-ux.md` + `reference/before/` — the engineering brief and its screenshots.

---

## 14. Build order and acceptance

1. **Fold** (`packages/core/src/run`): stage grouping, visit count, merge/dedupe, reply detection, recovered flag, card state, copy keys (§2, §10). Add golden logs for a long turn (screen 13 replay) and a failed turn (screen 50 replay).
2. **Copy** (`packages/copy`): add every key in §5 (pl + en), delete the removed ones.
3. **TurnSpine + summary row** with Collapsible; remove step groups, the activity line, the sticky plan, Szczegóły and the context chip from `ChatPane.tsx`.
4. **Lesson card** 4 states + expand/collapse into the side pane; remove "Pokaż lekcję" from the top bar and "Zapisz na później" from the card.
5. **Composer**: Zatrzymaj, queue row, single focus ring, choose form restyle.
6. **Widgets**: learner widgets in the frame; search/edit/read become lines/tags.
7. **Phone**: Tabs with spinner/dot; 390 layouts per screens.
8. **Motion** (§6) last, behind `prefers-reduced-motion`.

Acceptance (add to Playwright in `apps/web/e2e`):
- Replaying the screen-13 log renders **one** spine card, ≤ 3 lines in the open stage, no repeated sentence, and folds to one row at the end.
- No text node in the chat matches `/[a-z_]+\(|\{|"[a-z_]+":|s\d{2}\b/` (JSON, verb ids, step ids) or contains English when `lang=pl`.
- No element in the chat (outside widgets) has a computed colour of #c4402f, #3f8a46 or #a07c14.
- Esc during a run sends cancel; the composer keeps focus; the foot names the version that stands.
- A lesson whose check failed never shows "Lekcja gotowa" and never "0 zadań".
- The window scroll position stays 0 during a run; the thread follows the bottom only within 80 px of it.
- The composer shows exactly one focus ring.
- Every state in §12 matches its PNG at 1440 and 390 within normal font-rendering tolerance.
