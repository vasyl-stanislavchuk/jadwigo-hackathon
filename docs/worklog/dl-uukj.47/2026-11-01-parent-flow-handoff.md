# dl-uukj.47: the parent-flow design handoff, as the owner decided it on 2026-11-01

Copied from the owner's design handoff (`design_handoff_parent_flow/README.md`) so a fresh session needs
nothing outside the repo. Decision in force: `dl-xo0q`. Its drawings (`Parent Flow.dc.html`) were not
handed over; the engine brief it cites is `docs/worklog/dl-z5ja/2026-11-01-ux-handoff-homework-to-lesson.md`.
The example names in the frame drawing are the brand cast's, not a family's.

Decided 2026-11-01. This file is the source of truth for the parent side of Jadwigo: the layout, the concepts behind it, the shared patterns, and the first-lesson flow. Child details, lesson lists and history are **TBD in content**; only their patterns are agreed here.

- **Drawings:** `Parent Flow.dc.html` (project root). Section **5a** shows the decided flow. "The screens that follow" shows the later screens; they are drawn to show the patterns only, and their content is not final.
- **Engine rules:** `docs/worklog/dl-z5ja/2026-11-01-ux-handoff-homework-to-lesson.md` (AI-workflow brief). This file wins on layout. The brief wins on engine behaviour: typed widgets, cost in words, AI and parent edits labelled, ratings, retry, drafts that survive.
- **Code:** `vasyl-stanislavchuk/jadwigo-hackathon`. It builds on `apps/web/src/playground/chat/` (ChatScreen, ChatPane, LessonPane) and `apps/web/src/parent/` (ParentScreen, learner/). All words come from `packages/copy`.
- **Lesson screen:** the child's lesson screen is out of scope (`design_handoff_jadwigo_lesson/`).

---

## 1. Concepts

| Thing | What it is | Rules |
|---|---|---|
| **Parent** | The signed-in adult. Owns everything below. | The account and settings live at the foot of the sidebar. Language is chosen in settings only. Consent to the AI is given once, at sign-up. |
| **Lesson** | A list of steps built in a conversation with Jadwigo. | It belongs to the family, **not to a child**. It can be made, kept, given and printed with no child at all. States: Szkic → Gotowa (passed its checks) → Czeka na {imię} → Zrobiona / Przerwana. |
| **Conversation** | The chat that made the lesson. One per lesson. | The AI never talks to the child. Nothing reaches the child until the parent gives the lesson. AI changes are labelled as the AI's; the parent's changes as "Ty · Twoja zmiana". |
| **Child (learner)** | First name and class. Optional. | The real name reaches the AI and the chat. It **never** enters a stored or published lesson. A family usually has one or two children. |
| **Assignment** | A lesson given to a child. | A lesson can be assigned when it is made ("Dla"), later (details column), or by the child picking their name before starting. |
| **Attempt** | One go at an assignment. | It goes into the child's history and feeds their skills. |
| **Goals and skills** | A child's goals, each a chain of skills: Umie już → Nad czym pracujemy → Co dalej. | **Only with a child.** Without one there is no overnight report ("dreams"), no skills on steps and no skill chain. Goal states use the code's words: Idzie dobrze / W drodze / Potrzebuje uwagi / Jeszcze nie zaczęty. No scores, levels or percentages. |

The core promise: **describe the homework → get a lesson.** A child, goals and skills add a layer on top and are never a gate.

---

## 2. Layout

### 2.1 App frame
```
┌──────────────┬───────────────────────────────────────────────┐
│ logo     [▯] │ breadcrumb                                     │ ← 56 px; one line across
├──────────────┼───────────────────────────────────────────────┤
│ Lekcje       │                                                │
│ Historia     │                main area                       │
│              │                                                │
│ DZIECI   [+] │                                                │
│ (O) Ola   2kl│                                                │
│ (T) Tymek 4kl│                                                │
│              │                                                │
│ ──────────── │                                                │
│ (R) Rodzic  │                                                │
└──────────────┴───────────────────────────────────────────────┘
 232 px (folds to 60)
```
- **Sidebar** 232 px, `--page`, 1 px right line. Groups (logo row, menu, Dzieci, account) are 22 px apart; items are 6 px apart.
- **The 56 px line.** The sidebar's logo row and the main area's top bar are both 56 px with a 1 px bottom line, so one line runs across the page and the logo sits level with the breadcrumb.
- **The top bar holds the breadcrumb and title only.** No buttons, no account, no language switch. **No call to action in the top-right corner, anywhere.**

### 2.2 Lesson workspace (three columns)
```
┌─ sidebar ─┬─ chat 360 ───────┬─ lesson (flex) ─────────────┬▯┐
│           │ messages         │ title                        │ │ ← details,
│           │ read-back (fold) │ ▸ 1  13 − 5 = ?        Wpisz │ │   folded by
│           │ plan  2 z 4      │ ▾ 2  15 − 7 = ?   z poprawką │ │   default
│           │                  │   [child view] [answer, help]│ │   (52 strip,
│           │ ┌ composer ────┐ │ ▸ 3  …                       │ │   290 open)
│           │ └──────────(↑)─┘ │ ┆ 4  ghost while building    │ │
│           ├──────────────────┼──────────────────────────────┤ │
│           │ run state/rating │ status line   [Zapisz] [Daj] │ │ ← 68 px band, one line
└───────────┴──────────────────┴──────────────────────────────┴─┘
```
- **Chat**, 360 px, left. Folds to a 52 px strip. It **stays open** when the lesson is ready, until the parent folds it.
- **Lesson**, the middle column, flex, `--page`. This is the artifact.
- **Details**, 290 px, right. **Folded by default** to a 52 px strip.
- **The 68 px band.** The foot of the chat and the foot of the lesson column are both 68 px with a 1 px top line, so one line runs under both columns.
  - **Chat band:** the run state in words while building, then the turn rating once done.
  - **Lesson band:** a muted status line on the left; the actions on the right.
- **Steps scroll** between the lesson's title and its footer. The footer is pinned.

---

## 3. Patterns

| Pattern | Rule | Used in |
|---|---|---|
| **Sidebar menu** | Design-system SideMenu with **no border or fill of its own**. Items: Lekcje, Historia. **No "Nowa lekcja" item**: a new lesson lives under Lekcje, and the breadcrumb says so ("Lekcje / Nowa lekcja"). Active item = picked fill + picked edge. | every page |
| **Section with an add action** | Small uppercase heading ("DZIECI") with a dashed 28 × 28 "+" on its right. **The add action is never a list row**, so it can't be mistaken for an item. | Dzieci |
| **Entity row** | Initial disc · name · secondary info (class) at the end. On hover or keyboard focus the disc swaps its initial for a pencil: the disc edits, the rest of the row opens the item. Edit tools appear on hover only. | child rows |
| **Breadcrumb** | `Section / Page` in the top bar. The section is a link; the current page is bold with `aria-current="page"`. | every page below a section |
| **Fold to a strip** | Any side panel folds to a strip using a panel-icon button in its header. The strip keeps the unfold button, the panel name written vertically, and one key fact. | sidebar (60), chat (52), details (52) |
| **Default fold state** | Sidebar open · chat open · details **folded**. The parent's choice is remembered per device. | workspace |
| **Pinned column footer** | Actions belong to the column they act on, in a 68 px footer at its bottom. Muted status on the left; secondary then primary on the right. **One primary per screen.** | lesson column |
| **Quiet button with a reason** | A disabled main action is quiet (`--action-quiet`, muted text, 1 px dashed outline), with a short line beside it saying what is missing. It never stays silently grey. | "Zrób lekcję", "Daj lekcję" while building |
| **Collapsed list** | Long item lists show one line per item; click to open; "Rozwiń wszystkie" toggles all. The row: chevron · number · title (min 140 px, ellipsis) · tag · kind. | lesson steps |
| **Ghost rows** | Items still being written show as dashed placeholder rows, so the parent sees how many are coming. | steps while building |
| **Folded card in chat** | Long machine output (the read-back, the plan, step details) shows folded to one line with a count. Opening it never blocks the run. | chat |
| **Status in words** | Run and lesson state always as words ("Jadwigo pisze lekcję", "Gotowe", "3 z 6 zadań gotowe"), never a coloured dot alone. | chat band, lesson footer, chips |
| **Small creation = dialog** | Making something with 1–3 fields opens a dialog (440 wide, r14, 40 % ink scrim) and leaves the page as it was. | Dodaj dziecko |
| **Optional selector** | An optional choice sits inline as "Label: Value ▾", defaulting to the no-choice value ("Dla: Bez dziecka"). Its menu ends with a "Dodaj…" item. | Dla |
| **Per-child detail = tabs** | A child's page uses the design-system Tabs: **Przegląd · Umiejętności · Lekcje · Historia**. The tab set is agreed; the content of each tab is TBD (§6). | child page |
| **Lists = table + filter** | Lists of lessons or attempts are one table with a segmented filter above it (Wszystkie / each child / Bez dziecka) and a search field on the right. "Bez dziecka" rows are in muted ink. | Lekcje, Historia (TBD) |
| **Outcome tiles** | One small tile per question: full `--right-edge` = right first time; `--right-edge` outline = right after help; `--wrong-edge` outline = Jeszcze nie; dashed muted = not answered. Always shown with the legend. | anywhere results show |
| **Empty state** | Show the structure and add one muted line saying what will appear. Never a big illustration or a sales pitch. | sidebar before the first lesson |

---

## 4. Type, colour, spacing (parent app)
- **Adult density inside the signed-in app:** body 14, small 12.5, page question 32, section titles 15–20, 1 px lines, r10.
  - Set on the parent root: `--fs-body:14px; --fs-small:12.5px; --tap-min:34px; --radius:10px; --radius-sm:8px; --border:1px`.
  - Sign-in and public pages keep 28 / 22 / 17 (Spec §6).
- **Main action:** the design system's `--action` / `--on-action` on a 3 px `--action-edge`. One per screen.
- **Chat send:** a 32 px round button, `--text` fill, `--surface` arrow-up icon; quiet while empty. It is deliberately **not** the blue action.
- **Paper:** sidebar and lesson column `--page`; chat, details, footers and cards `--surface`.
- **Strong tones** (`--right-edge`, `--wrong-edge`) for tiles and dots. The pale band fills are too faint on white.
- **The lesson preview** inside an opened step keeps the child's sizes, because it shows what the child will see.
- **Logo:** the 3a wordmark (Identity), 22 px. Folded sidebar: the crown alone.

---

## 5. The first-lesson flow (decided)

### 5.1 First screen: signed in, nothing yet
- **Sidebar:** Lekcje is active; Historia is shown. Under the menu, a muted line: "Lekcje i historia pojawią się tu po pierwszej lekcji."
- **Dzieci:** "+" only, with a muted line: "Dodaj dziecko, żeby Jadwigo śledziło, co umie. Nie jest potrzebne do lekcji."
- **Top bar:** "Lekcje / Nowa lekcja".
- **Main area**, centred:
  - The question "Jaką lekcję przygotować?" (32 bold), then **one box**, 720 wide.
  - Nothing else: no subtitle, no starters, no consent line.
- **The box:** `--surface`, 2 px `--text-muted` outline, r16. The caret is in it on load.
  - **Placeholder, the only example:** "Np. Odejmowanie przez 10. Pomyliła się w 15 − 7 i 12 − 5."
  - **Under the text:** "Dodaj zdjęcie", then "Dla: Bez dziecka ▾", then on the right the reason and "Zrób lekcję →".
- **Empty:** "Zrób lekcję" is quiet, with "Najpierw opisz zadanie albo dodaj zdjęcie" beside it.
- **Ready** (text or a photo): the outline turns `--focus`, the button turns `--action`, and the reason goes. Enter sends; Shift+Enter makes a new line.
- **Photos:** photos, pastes (Ctrl+V) and drops show as 64 × 80 thumbnails, each with ×.

### 5.2 Dla
- Default "Bez dziecka ✓". The menu then lists each child, then "Dodaj dziecko…" ("Imię i klasa. Jadwigo zacznie śledzić, co umie.").
- **With a child:** the lesson links to that child's goals.

### 5.3 Dodaj dziecko (dialog)
- **Fields:**
  - **Imię**, with the note "Widzisz je tylko Ty i Jadwigo w rozmowie. Nie trafia do lekcji."
  - **Klasa**: 1–6 as one row of options.
- **Buttons:** Anuluj, Dodaj.
- **After Dodaj:** the child appears under Dzieci. If the dialog was opened from Dla, Dla shows the child. The box keeps its text.

### 5.4 Send → the workspace, in place
- **Send builds at once.** The breadcrumb stays the same, and a chip reads "Jadwigo pisze lekcję".
- **Chat:**
  - the parent's message and photos ("Ty")
  - the assistant's one-line summary
  - the **read-back as a folded card**: "Odczytane zadania · odznacz, co nie jest domowe · 5"; unticking an exercise starts a follow-up turn
  - the plan as a checklist ("2 z 4")
  - **Failures** stay visible in plain words with a red dot.
  - **The composer stays live** ("Możesz pisać dalej…"). Messages queue under "Następne" (brief).
  - **No Stop button on screen.** Esc in the composer stops a run (code).
- **Lesson:**
  - The title, then step rows as they land; ghosts mark the ones still coming.
  - The rows of this revision are tagged.
  - **Collapsed by default.**
- **Footer while building:** "3 z 6 zadań gotowe · „Daj lekcję” zadziała, gdy lekcja przejdzie sprawdzenie", and a quiet "Daj lekcję".

### 5.5 Ready
- **An opened step** shows two columns:
  - **Left:** the child view.
  - **Right:** the right answer, the help rungs, the skill (only with a child), where the step came from, and Zmień ten krok · Przenieś · Usuń.
- **Chat band:** "Jak poszło? Dobrze · Źle · Spróbuj jeszcze raz" (brief: "what was missing?" follows Źle).
- **Lesson footer:** "Zapisz na później" plus the primary action:
  - **No child:** "Daj lekcję".
  - **With a child:** "Pokaż {imię}".
- **Details** (when unfolded):
  - **Dla kogo:** "Bez dziecka" with "Dodaj dziecko", or the child card with "Zmień".
  - **Co ćwiczy ta lekcja:** the skill chain, only with a child.
  - **O lekcji:** source, steps, version, change history.

### 5.6 Daj lekcję (no child)
- **Two choices:** Otwórz na tym komputerze · Wydrukuj.
- **On this computer:** before the first step, the child **picks their name** from the family's children, or "Nikt z listy". A pick puts the attempt into that child's history.
- This name-pick screen is a child screen in the Zeszyt frame. **Not drawn yet.**

---

## 6. TBD (pattern agreed, content open)

| Area | Agreed now | TBD |
|---|---|---|
| **Child page** | Reached from a child's row. Breadcrumb "Dzieci / {imię}". A header with the disc, name, class and "Nowa lekcja dla {imię}" (a page action, not top-right). DS **Tabs**: Przegląd · Umiejętności · Lekcje · Historia. | What each tab shows. Przegląd is drawn as an example only (what's waiting, skills in motion, recent results). |
| **Umiejętności** | Goal cards with the code's three lists and one status word. No scores. | Layout of the skill graph, adding and editing goals. |
| **Lekcje (all)** | Table + segmented filter + search. "Bez dziecka" rows muted. A way to start a new lesson from here (placement TBD; not top-right). | Columns, sorting, bulk actions, drafts vs. given. |
| **Historia** | Table of attempts, newest first, with outcome tiles and the legend; a row opens the attempt question by question (existing `AttemptReview`). | Grouping (by week / by child), filters. |
| **Settings** | At the sidebar foot. Holds the language and the AI consent switch. | Everything else. |
| **Phone** | One column, as `ChatScreen` already does below lg: the box first; after sending, a "Rozmowa / Lekcja" switch with a badge when the lesson changes. The sidebar becomes a drawer. | Drawing. |
| **Child name pick** | Before the first step of an unassigned lesson. | Drawing and copy. |

---

## 7. Keyboard and screen readers
- **Every fold button** is a real `<button>` with `aria-label` ("Zwiń menu", "Rozwiń rozmowę", "Zwiń szczegóły").
- **The edit pencil** on a child row appears on keyboard focus too.
- **Enter** sends from the box; **Esc** stops a run.
- **Step rows** are buttons with `aria-expanded`.
- **Breadcrumb:** a `nav` with `aria-current` on the current page.
- **Run state:** in a polite live region, announced when a turn finishes or needs the parent, not on every step (code: `announcementOf`).
- **Dialog:** focus is trapped; Esc closes; focus returns to the "+".

---

## 8. Copy (PL · EN)
| Key | PL | EN |
|---|---|---|
| question | Jaką lekcję przygotować? | What lesson should we make? |
| placeholder | Np. Odejmowanie przez 10. Pomyliła się w 15 − 7 i 12 − 5. | E.g. Subtracting across 10. She got 15 − 7 and 12 − 5 wrong. |
| attach | Dodaj zdjęcie | Add a photo |
| for | Dla: | For: |
| no child | Bez dziecka | No child |
| add child | Dodaj dziecko | Add a child |
| add child hint | Imię i klasa. Jadwigo zacznie śledzić, co umie. | Name and class. Jadwigo will start following what they can do. |
| send | Zrób lekcję | Make the lesson |
| send reason | Najpierw opisz zadanie albo dodaj zdjęcie | Describe the homework or add a photo first |
| menu | Lekcje · Historia · Dzieci | Lessons · History · Children |
| empty menu | Lekcje i historia pojawią się tu po pierwszej lekcji. | Lessons and history appear here after the first lesson. |
| children hint | Dodaj dziecko, żeby Jadwigo śledziło, co umie. Nie jest potrzebne do lekcji. | Add a child so Jadwigo can follow what they can do. Not needed for a lesson. |
| name note | Widzisz je tylko Ty i Jadwigo w rozmowie. Nie trafia do lekcji. | Only you and Jadwigo in the chat see it. It never goes into a lesson. |
| breadcrumb | Lekcje / Nowa lekcja | Lessons / New lesson |
| writing | Jadwigo pisze lekcję | Jadwigo is writing the lesson |
| read-back | Odczytane zadania · odznacz, co nie jest domowe | Exercises found · untick what isn't homework |
| composer | Możesz pisać dalej… | Keep typing… |
| expand all | Rozwiń wszystkie | Expand all |
| change step | Zmień ten krok | Change this step |
| details | Szczegóły lekcji | Lesson details |
| for whom | Dla kogo | For whom |
| skills | Co ćwiczy ta lekcja | What this lesson practises |
| save | Zapisz na później | Save for later |
| give | Daj lekcję | Give the lesson |
| show | Pokaż {imię} | Show {name} |
| this computer | Otwórz na tym komputerze | Open on this computer |
| print | Wydrukuj | Print |
| rating | Jak poszło? Dobrze · Źle · Spróbuj jeszcze raz | How did it go? Good · Bad · Try again |

The chat lines (status, tools, errors) already exist in `packages/copy` as `chat_*`. Every line here is a draft until a parent has read it.

---

## 9. Checklist
- [ ] Sidebar: Lekcje, Historia; Dzieci heading with a dashed "+" (not a row); child rows with the edit pencil on hover/focus; account at the foot; folds to 60.
- [ ] The 56 px line across the sidebar and the top bar; the top bar holds the breadcrumb only.
- [ ] No call to action in any top-right corner.
- [ ] First screen: question + one box; the placeholder is the only example; quiet "Zrób lekcję" with its reason.
- [ ] "Dla" defaults to "Bez dziecka"; no skills, no chain and no dreams without a child.
- [ ] Dodaj dziecko dialog: first name + class.
- [ ] Send builds at once; the read-back is a folded card; there is no Stop button on screen.
- [ ] Workspace: chat (open) · lesson · details (folded); the 68 px band under the chat and the lesson.
- [ ] Steps collapsed by default; ghost rows while building.
- [ ] The lesson footer holds the actions; one primary; "Daj lekcję" without a child, "Pokaż {imię}" with one.
- [ ] Daj lekcję: this computer + print; the child picks their name before starting.
- [ ] Chat send is the round ink button, not the blue action.
- [ ] Adult density tokens on the parent root.
