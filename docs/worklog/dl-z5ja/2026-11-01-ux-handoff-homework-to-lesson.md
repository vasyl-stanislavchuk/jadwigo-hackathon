# UX handoff: from a homework photo to a lesson that is ready (epic dl-z5ja)

A self-contained brief for a design session, written 2026-11-01. It describes what a parent sees
in Jadwigo's AI chat from the first message to a lesson their child can play, the rules the design
must keep, and the patterns borrowed from PostHog's AI chat, which has a year of lessons behind it.
Nothing here needs the codebase.

## What Jadwigo is, in 3 lines

Jadwigo is a learning app for children in the first school grades, in Polish and English. A parent
asks for a lesson in a chat; the AI builds it from a bank of checked questions; the child plays the
lesson. The AI never talks to the child, and nothing the AI writes reaches the child until the
parent publishes it.

## The goal, in the owner's words

"From registered screen, to chat with Jadwigo AI, and to a lesson as a result. Parents share a
topic, a request, maybe a screenshot, AI thinks, and the lesson is ready." Chat on the left, the
lesson on the right.

## The flow, 6 moments

1. **Consent, once per family.** One screen before the first message: what the AI reads (the
   child's data, names included), where it goes (Meta's AI models, which may learn from it), how
   long it is kept (until the family's account is deleted), and the switch that turns it off. Short,
   plain, no legal wall.
2. **Share.** An empty box scares people, so the first screen offers 3 starters drawn from the
   child's goals ("Odejmowanie do 20, tak jak w zeszycie") and one line on what will happen next.
   The parent types a sentence, or drops a photo of the notebook page. The photo appears as a
   thumbnail in the thread, labelled as what Jadwigo received. Several pages are fine; each is a
   thumbnail.
3. **Read-back.** Before building, the AI says in one short message what it saw: the exercises it
   found, which ones went wrong, the topic it infers. Each exercise is a small card the parent can
   untick ("this one is not homework"). This is where a misread photo is caught cheaply. At most 1
   question here, 2 at the very most, with a recommended answer first and a free-text option.
4. **Build.** The chat shows the process in plain sentences, collapsed by default: "Szukam zadań o
   odejmowaniu z przejściem przez dziesiątkę", "Sprawdzam lekcję". A failed step stays visible as a
   red line. Raw details are one tap away. The lesson pane fills on the right as each revision lands,
   the questions this revision changed highlighted. For a turn of 3 or more steps, a checklist
   ("2 z 4") instead of a spinner. A progress line, never silence. The parent may keep typing: the
   message queues under "Następne", with "Wyślij teraz" to push it into the running turn.
5. **Review and shape.** The lesson pane is the artifact. Every question has "Zmień ten krok": the
   parent says what to change and why, the AI applies it, the change is highlighted, "Cofnij" undoes
   one step. The lesson passes the same checks as a hand-written one before it can go further; a
   problem is shown as a sentence, never as a code.
6. **Lesson ready.** One card, readable in 2 seconds: the title, how many questions, what the child
   will see first, and 2 buttons: "Pokaż dziecku" (assign now) and "Zapisz na później". Publishing
   is the parent's click, never the AI's. Afterwards, at most one quiet suggestion ("Następnym razem:
   mnożenie przez 2?"), dismissable for the whole conversation.

## Layout

- **Laptop:** chat left, lesson right, the composer pinned at the bottom of the chat. Context chips
  above the composer: the child, the goal, the photo. A chip the parent closes stays closed.
- **Phone:** one screen with a switch "Rozmowa / Lekcja" and a badge when the lesson changed, or
  the lesson as a sheet over the chat. The composer stays above the keyboard. Widgets adapt to the
  column's width.
- **Run state as text** ("Jadwigo pisze lekcję", "Gotowe", "Czeka na Ciebie"), never only a coloured
  dot. A polite screen-reader announcement when a turn finishes or needs the parent, not on every
  word. Stop is reachable from the keyboard.

## Hard requirements

- Anything with a number or a status in it is drawn by the product's own component from a typed
  result; the AI never restates a number the widget already shows. An unknown or malformed result
  gets a plain "Szczegóły kroku" card with the raw input and output.
- Cost in words, never money or tokens: at half the budget "Kończę z tym, co mam", at the end
  "Zapisane, zatrzymane".
- No bare "wrong" anywhere a child or a parent reads; "Jeszcze nie" is the house line. No level
  names, scores, comparisons with other children, or diagnoses.
- Names: the child's real name reaches the AI and appears in the chat; it does not appear inside a
  stored or published lesson. Fictional names in a lesson (a Zosia or a Tomek in a word problem) are
  fine.
- Every AI action is labelled as the AI's; every parent edit as the parent's ("Ty · Twoja zmiana w
  lekcji"). Nothing the AI wrote reaches the child until the parent publishes it.
- Every error row has "Spróbuj ponownie" (retries the whole turn, not only the connection) and
  "Kopiuj szczegóły" (an id the team can trace).
- The language of the child's record throughout: Polish first, English second. The AI drifting into
  English is a defect, not a quirk.
- Each turn ends with Good / Bad / Try again, and "what was missing?" on Bad.
- A parent's unsent draft survives a locked phone or a lost connection and is never sent on its own.

## Patterns borrowed from PostHog's AI chat, and where each lands

| Pattern | Their lesson | In this flow |
| --- | --- | --- |
| Show it all | hiding failed steps and reasoning made people distrust the result | collapsed step lines, failures visible (moment 4) |
| Honesty is structural | the model asks, code computes, components draw | typed widgets, plain card otherwise |
| Show what the agent received | the user sees the same bytes the AI saw | the notebook photo thumbnail (moment 2) |
| Untrusted content is data | text from a page or a file is never an instruction | photo text and the child's words are fenced before the AI |
| Ask only when it changes the outcome | one question, recommended answer first, free text allowed | the read-back (moment 3) |
| Plan checklist for big turns | "N of M done" beats a spinner | turns of 3 or more steps (moment 4) |
| Diff, accept, one undo step | "a diff beats a paragraph" | highlights and "Cofnij" (moment 5) |
| Approval readable in 2 seconds | what, to whom, what they will see | the "Lesson ready" card (moment 6) |
| Queue, don't cancel | an "Up next" list and a Steer button | "Następne" and "Wyślij teraz" |
| Starter prompts | the empty box scares people | 3 starters from the child's goals |
| One AI pattern inside the product | they killed their mascot assistant | the chat is the lesson editor, not a bot beside it |
| Suggestions with caps | at most 2 per conversation, mute on dismiss | 1 card after "Lesson ready" |
| Autonomy by check and undo | act alone only when the work is easy to check and cheap to undo | the AI edits the lesson freely; anything reaching the child is the parent's click |

Where PostHog falls short and Jadwigo must do better: no screen-reader announcement of a finished
answer, no rule about the user's language, no retry of a whole turn, widgets that do not adapt to
the phone, and cost shown in dollars.

## What is already built

- The 2-pane chat page with the phone switch, the step lines, the widgets for lesson checks,
  question search and edits, the highlights and the edit form, the Polish and English copy.
- The engine behind it: a run per turn, every step recorded, follow-ups and steers, a budget that
  steers then stops, a check that refuses a number the tools did not give, lesson tools that run the
  same checks as a hand-written lesson, the routes and the live channel.

Not yet built, so free to design: the consent screen, the photo path and the read-back cards, the
"Lesson ready" card, ratings per turn, and the parent's edit applied instantly without the AI.

## Open for the owner's design

- Where the chat lives: its own screen beside the lesson, a side panel on the child's page, or both.
- What deleting a conversation about a child means to the parent.
- What "ready" means: assign to the child now, schedule it, print it, or all three.
- The photo path: one page or many, crop or whole page, and whether the read-back may ask the parent
  to retake a blurry photo.
