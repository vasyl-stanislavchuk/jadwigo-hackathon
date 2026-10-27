# What does Jadwigo look and sound like, and what story does its name tell?

Issue: `dl-w0b4.27`

## The answer in 5 lines

- **Look:** 3 options, each built on Zeszyt, so the site and the lesson read as one product:
  1. **Zeszyt**, plain Andika on squared paper.
  2. **Królewski zeszyt**, a Fraunces wordmark with a paper-cut crown and a sprout, on cream.
  3. **Ślad**, a Baloo 2 wordmark with a trail of blue-ink footprints that also becomes the lesson's step bar.
- **Voice:** 3 registers, each writing the same 6 lines plus a message for the class chat. Spokojny przewodnik is a calm guide, Życzliwa nauczycielka a kind teacher, and Ciekawy towarzysz a curious companion that plays with the "go" in the name.
- **Name:** 3 stories about a school's patron, Queen Jadwiga: the queen whose jewels helped reopen the Kraków Academy, "Jadwigo, go!" as a call, and the footprint legend as a trail. Each comes with and without a character. Each also sits beside the family's own story: made first for one child, then his class, then his school.
- **The rings shape everything:** Jadwigo began at the Meta Global AI Developer Hackathon. It reaches its first families through the class chat and on paper, not through ads. So every look is also tried on a chat link card, a printed invitation and a school poster. Each is judged on whether it feels made by a parent.
- **What only the owner can choose:** the look, the voice, the name story and whether a character carries it. These are `dl-w0b4.35` to `dl-w0b4.38`, and each is judged against the lead message the owner has yet to pick (`dl-w0b4.30`).

## Method

- **Read:**
  - The jadwigo-marketing charter (struggle-not-pressure: "characters that make a child smile") and its decisions in force:
    - `jadwigo-marketing/decisions/2026-10-27-parents-decide-and-children-study-both-feel-at-home-on-the-landi`
    - `david-learns/decisions/2026-10-26-the-playground-system-page-is-the-latest-vision-for-the-zeszyt-t`
    - `david-learns/decisions/2026-10-26-zeszyt-replaces-the-grape-palette-the-2026-10`
    - `jadwigo-marketing/decisions/2026-10-27-jadwigo-s-copy-goes-through-human-voice-and-numbers-are-digits`
  - The naming note `david-learns/notes/jadwigo-is-the-owner-s-pick-for-the-product-name`, and `docs/research/jadwigo-go-to-market.md`.
  - The Zeszyt system, both as the running System page at `/playground/system` and in its source: david-learns `frontend/src/playground/views/system/` and `frontend/src/styles/foundation.css`. The issue names a `system/data.ts` path, but the folder is in fact `views/system/`. Also `frontend/src/copy/harsh.ts`, `copy/pl.ts`, `docs/research/lesson-theme.md` and `reference-themes.md`.
- **Decided in this sitting (owner, 2026-10-27), and written to the brain:**
  - The repo names only the patron, never the school: `jadwigo-marketing/decisions/2026-10-27-the-jadwigo-repo-names-only-the-patron-queen-jadwiga-never-the-s`.
  - Jadwigo grows by doing things that don't scale, starting with the child, then the class, then the school: `jadwigo-marketing/decisions/2026-10-27-jadwigo-does-things-that-don-t-scale-the-child-first-then-his-cl`.
  - jadwigo.pl gets an "O nas" story with the family's photos: `jadwigo-marketing/decisions/2026-10-27-jadwigo-pl-will-have-an-o-nas-story-with-the-family-s-photos-why`.
  - The project began at the Meta hackathon (`david-learns/notes/jadwigo-is-accepted-to-the-meta-hackathon`).
- **Built and measured:**
  - 22 mocks, written by `docs/drops/identity/build.ts` from 1 data file and rendered with a headless browser. Each look appears on the jadwigo.pl hero (laptop and phone), a lesson card, a chat link card, an A6 invitation and a school poster. The 3 name stories and an "O nas" page make up the rest.
  - The contrast of every text pair by day and by night, to WCAG 2. Every text pair reaches at least 5.3:1. A first gold for the crown came out at 2.5:1 on cream and was darkened to pass 3:1.
- **Web research (2026-10-27):** Queen Jadwiga, the footprint legend, wycinanki, how 3 children's products use characters and type, and font licences. All of it is cited below.
- **Not done:**
  - No line was tested on a child, a parent or a teacher.
  - No native speaker has read the Polish yet (`dl-w0b4.40`).
  - No mark has been checked against trademark registers.
  - No real photo is in this repo.

## 1. Look: 3 options on Zeszyt

Zeszyt stays the lesson's look in every option. Lessons keep white paper, blue ink for the one thing to press, the teacher's green and red pen, and Andika. An option changes only 3 things: the wordmark, what the site wraps around the lesson, and where the brand touches the lesson frame.

**The 3 looks**

| | 1. Zeszyt | 2. Królewski zeszyt | 3. Ślad |
| --- | --- | --- | --- |
| Wordmark | "jadwigo" in Andika 700, "go" in blue ink, a ruled line under it | "jadwigo" in Fraunces 700, next to a paper-cut crown with a sprout | "jadwigo" in Baloo 2 700, followed by 3 footprints |
| Site ground | white with a faint 24 px squared grid | cream #fbf6ea, royal blue #2a4ea0, gold #ad7f1f for the crown only | white with the squared grid |
| On the lesson | the wordmark small in the top bar, otherwise nothing | a small crown in the top bar | the step bar becomes a trail of footprints |
| Fonts and licences | Andika (SIL OFL 1.1) | Fraunces (SIL OFL 1.1) for the wordmark and site headlines, Andika for the rest | Baloo 2 (SIL OFL 1.1) for the wordmark and site headlines, Andika for the rest |
| Leans toward | B, calm | C, trust (heritage) | A, clarity (you can see how far you have walked) |

- **All 3 faces are licensed for web and app use.** Each is SIL OFL 1.1 and self-hosted, with no Google Fonts call. Their woff2 files and licences sit in `docs/drops/identity/fonts/`: Andika from SIL International, [Fraunces](https://github.com/undercasetype/Fraunces) and [Baloo 2](https://github.com/EkType/Baloo2). Each renders every Polish letter: the mocks set "ą ć ę ł ń ó ś ź ż" in all 3.
- **Contrast** is listed in full in `docs/drops/identity/data/contrast.json`. Zeszyt's lowest text pair is 5.3:1, which is Zeszyt's own blue button at night.
- **Kept clear of other brands:** no option uses a typeface or crest that belongs to a school. Duolingo built its wordmark from its owl's feathers, in a custom face ([Creative Bloq](https://creativebloq.com/news/feather-bold)). Jadwigo uses open fonts and shapes drawn for it.
- **Wycinanki** are Polish folk paper cuts: single-colour in Kurpie, layered in Łowicz ([Wikipedia](https://www.wikipedia.org/wiki/Wycinanki)). They inspire option 2's crown, which matches Zeszyt's "paper cut-outs" metaphor. No regional pattern is copied in the crown.

## 2. Voice: 3 registers

Each register writes the same 6 lines. They are a landing headline, a parent's call to action, a child's welcome, a right answer, a miss and a pause. A 7th line, the message a parent posts in the class chat, is added because that chat is where the first families come from. You'll find the full sheet in `docs/drops/identity/data/identity.json` and on the drop's voice page.

**3 of the 7 lines in each register**

| | Spokojny przewodnik | Życzliwa nauczycielka | Ciekawy towarzysz |
| --- | --- | --- | --- |
| Child's welcome | Cześć. Zaczniemy od kilku zadań. Masz tyle czasu, ile chcesz. | Dzień dobry! Rozwiążmy razem kilka zadań. | Gotowi? Go! Pierwsza zagadka już czeka. |
| A miss | Jeszcze nie. Spójrz na zaznaczone miejsce. | Jeszcze nie. Popraw zaznaczone miejsce, dasz radę. | Jeszcze nie. Coś tu się nie zgadza, spójrz jeszcze raz. |
| A pause | Lekcja poczeka. Wrócisz, kiedy zechcesz. | Zróbmy przerwę. Lekcja zaczeka na ciebie. | Przerwa! Zagadka poczeka na ciebie. |

- **The house rules hold in every line.** No line uses a word from `harsh.ts` (źle, zły, błąd, błędnie, niepoprawnie, nie tak, porażka). There are no points, clocks or streaks. The child is "ty" and the parent "Ty". No line asks a child to get anything from a parent, which UOKiK enforces (see `docs/research/jadwigo-go-to-market.md` §3).
- **The miss starts with "Jeszcze nie" in all 3 registers.** That is the lesson's own line today (david-learns `copy/pl.ts`), so the registers differ in warmth, not in the rule.
- **Khan Academy Kids** gives its bear, Kodi, the job of cheering a right answer ([Khan Academy blog](https://blog.khanacademy.org/supporting-english-language-acquisition-with-khan-academy-kids/)). After a miss, Kodi puts a paw to her chin to show thinking. Our kind-teacher register does the same in words.

## 3. The name story and a character

Jadwigo is named after a school's patron, Queen Jadwiga. In Polish you call a Jadwiga "Jadwigo!", and in English the name reads as "Jadwiga, go!". The facts each story rests on:
- She was crowned "King" of Poland in Kraków on 16 October 1384 ([Wikipedia](https://en.wikipedia.org/wiki/Jadwiga_of_Poland), [Britannica](https://www.britannica.com/biography/Jadwiga)).
- The sale of her jewellery helped restore the Kraków Academy, whose charter was issued on 26 July 1400, a year after her death.
- She was canonised on 8 June 1997.
- A folk legend says a footprint in the wall of Kraków's Carmelite church is hers. She left it, the legend says, when she helped a poor stonemason ([Trasa dla Bobasa](https://www.trasadlabobasa.pl/en/tab/articles/legend_of_queen_jadwiga's_footprint/5), [Interia](https://wydarzenia.interia.pl/religia/news-8-czerwca-w-kosciele-szczegolne-wspomnienie-w-tle-jedna-z-kr,nId,23492381)). It is a legend, and the stories say so.

**3 name stories, each with and without a character**

| Story | What it says | Character, if any |
| --- | --- | --- |
| Królowa, która dała szkole klejnoty | the patron gave up her jewels so a school could reopen; learning for every child | Latarenka, a paper-cut lantern that lights the next step |
| Jadwigo, go! | the vocative as a call: you ask, you try, you go on; "go" as in gotowi? and dlaczego? | Kiełek, a soft crown with a sprout that grows a leaf |
| Stopka | the footprint legend; each step in a lesson leaves a small print on the squared paper | Ślady: no figure, the footprints are the character |

- **There are 5 character options in all:**
  1. No character.
  2. Latarenka.
  3. Kiełek.
  4. Ślady.
  5. The class draws and names it, which is a do-things-that-don't-scale option. It needs the parents' and the teacher's consent, and the drawings stay outside git.
- **What weighs on the choice:**
  - The charter wants characters that make a child smile.
  - Zeszyt keeps decoration off the lesson ("decoration costs attention", `lesson-theme.md`).
  - The go-to-market note warns that under lead B (calm) a loud mascot fights the message.
  - No option draws the queen as a portrait or looks like another product's character.

## 4. Rings

Jadwigo began at the Meta Global AI Developer Hackathon, whose "Build for Your World" theme asks for a problem the builder knows first-hand. A parent building for his own child is that. Our owner's direction is to do things that don't scale ([Paul Graham](https://paulgraham.com/ds.html)): first the child, then his class (the 18-child pilot, `dl-e5c4`), then his school. It does not start with a market. That gives the identity 3 jobs the hero alone does not test:

- **It has to look handmade, not polished.** A parent in the class chat trusts another parent, not a startup. Each look is judged on whether it feels made by a family: marks drawn as if on squared paper, and "we" meaning the family.
- **It has to work in the class chat and on paper.** A parent pastes jadwigo.pl into the class chat and sees a link card (1200×630). That card and a printed A6 invitation reach the class before any ad. Both are mocked for every look (`dl-w0b4.43`).
- **The school comes after the pilot verdict.** A notice-board poster is mocked for each look, marked "po pilotażu w jednej klasie".
- **The founder story binds the rings.** "Tę aplikację zrobiliśmy najpierw dla naszego syna. Teraz otwieramy ją dla jego klasy, a potem dla całej szkoły." It goes on an "O nas" page with the family's photos (`dl-w0b4.42`). How those photos are kept and shown is the owner's call (`dl-w0b4.41`). In the drop, the photos are empty, labelled frames.

## 5. "Go" in the name: 7 ideas

| Idea | Where it lives | Fits |
| --- | --- | --- |
| "Jadwigo, go!": the call | the wordmark sets "go" apart in blue ink (all 3 looks) | every lead |
| GOtowi?: "gotowi" starts with "go" | the child's welcome, "Gotowi? Go!" (curious companion) | A, C |
| dlaczeGO?: Polish questions end in "-go" | the headline "Każde „dlaczego” to dobry początek." | A |
| Krok po kroku: going means walking | the footprint trail and the step bar (Ślad, Stopka) | A, B |
| A Go board on squared paper: each answer a stone | a quiet alternative to footprints on the step bar | B |
| A paper plane folded from a zeszyt page | a celebration move for the illustration style (`dl-w0b4.18`) | B, C |
| Green for go | **left out**: green means "right" only in Zeszyt, and a green-light "go" would blur the verdict | none |

## Fit with each lead

Choosing the lead message is still the owner's call (`dl-w0b4.30`), so every option is read against all 3 leads.

**Fit with each lead**

| | A. Clarity | B. Calm | C. Trust |
| --- | --- | --- | --- |
| Look 1, Zeszyt | good: nothing gets between the parent and the picture of the child | best: quiet, the lesson's own paper | good, but adds no heritage |
| Look 2, Królewski zeszyt | good | weaker: the crown and gold are a statement | best: the patron's story and a book-like serif |
| Look 3, Ślad | best: progress you can see, never a score | good if the trail stays small | good |
| Voice: przewodnik | good | best | good |
| Voice: nauczycielka | best | good | good: it names the sources |
| Voice: towarzysz | good | weaker: exclamation and play | good |
| A character | helps a child, neutral for a parent | weakest: a loud mascot fights calm | neutral |

## What this means for jadwigo

- The owner picks look, voice, name story and character (`dl-w0b4.35` to `dl-w0b4.38`), after or alongside the lead (`dl-w0b4.30`).
- A follow-up carries the picks into `apps/site` (`dl-w0b4.39`). The lesson tokens in `packages/ui` belong to learner-experience, so any change there is a request to that workstream.
- A native speaker reads every Polish line before it ships (`dl-w0b4.40`).
- A class invitation kit, the chat link card and the A6 card, comes before any ad (`dl-w0b4.43`), alongside the pilot letter (`dl-w0b4.34`).
- The "O nas" page waits on the owner's answers about photos (`dl-w0b4.41`, `dl-w0b4.42`).
- The illustration style (`dl-w0b4.18`) now also waits on the character decision.

```json jadwigo-outcome
{
  "issue": "dl-w0b4.27",
  "question": "What does Jadwigo look and sound like, and what story does its name tell?",
  "answer": "3 looks on Zeszyt (Zeszyt, Królewski zeszyt, Ślad), 3 voices (calm guide, kind teacher, curious companion) writing the same 6 lines, and 3 name stories about a school's patron, Queen Jadwiga, with and without a character, all made for the child, his class and then his school; the owner picks each.",
  "status": "answered",
  "sources": [
    "https://en.wikipedia.org/wiki/Jadwiga_of_Poland",
    "https://www.britannica.com/biography/Jadwiga",
    "https://www.trasadlabobasa.pl/en/tab/articles/legend_of_queen_jadwiga's_footprint/5",
    "https://wydarzenia.interia.pl/religia/news-8-czerwca-w-kosciele-szczegolne-wspomnienie-w-tle-jedna-z-kr,nId,23492381",
    "https://www.wikipedia.org/wiki/Wycinanki",
    "https://blog.khanacademy.org/supporting-english-language-acquisition-with-khan-academy-kids/",
    "https://creativebloq.com/news/feather-bold",
    "https://paulgraham.com/ds.html",
    "https://github.com/undercasetype/Fraunces",
    "https://github.com/EkType/Baloo2",
    "docs/research/jadwigo-go-to-market.md",
    "docs/drops/identity/data/identity.json",
    "docs/drops/identity/data/contrast.json"
  ],
  "owner_decisions": [
    {
      "question": "Which look does Jadwigo wear: wordmark, palette and type?",
      "options": [
        "1. Zeszyt: Andika wordmark, Zeszyt as it is, a squared grid on the site",
        "2. Królewski zeszyt: Fraunces wordmark, paper-cut crown with a sprout, cream with royal blue and gold on the site",
        "3. Ślad: Baloo 2 wordmark, blue-ink footprints, the step bar as a trail"
      ]
    },
    {
      "question": "Which voice does Jadwigo speak in?",
      "options": [
        "Spokojny przewodnik (a calm guide)",
        "Życzliwa nauczycielka (a kind teacher)",
        "Ciekawy towarzysz (a curious companion)"
      ]
    },
    {
      "question": "Which story does the name tell, beside the family's own story?",
      "options": [
        "Królowa, która dała szkole klejnoty",
        "Jadwigo, go!",
        "Stopka"
      ]
    },
    {
      "question": "Does a character carry Jadwigo, and which?",
      "options": [
        "No character",
        "Latarenka, a paper-cut lantern",
        "Kiełek, a crown with a sprout",
        "Ślady, the footprints alone",
        "The class draws and names it"
      ]
    },
    {
      "question": "How do the family's photos and names appear on the O nas page?",
      "options": [
        "Photos from a site-asset bucket outside git, first names shown",
        "Photos from a site-asset bucket outside git, no names",
        "An illustrated family drawn from the photos, no names"
      ]
    }
  ],
  "proposed_issues": [
    {
      "title": "Apply the chosen identity to jadwigo.pl: wordmark, palette, fonts and voice",
      "scope": "Filed as dl-w0b4.39: carry the picks into apps/site; packages/ui is a request to learner-experience",
      "done_when": "The built site shows the chosen wordmark, palette and fonts, contrast is checked, and the owner has seen it",
      "depends_on": ["dl-w0b4.35", "dl-w0b4.36", "dl-w0b4.37", "dl-w0b4.38", "dl-w0b4.30"],
      "labels": ["project:jadwigo-marketing", "site"]
    },
    {
      "title": "Native speaker reviews Jadwigo's Polish voice sheet and name stories",
      "scope": "Filed as dl-w0b4.40: every line in docs/drops/identity/data/identity.json",
      "done_when": "Every line has a reviewer's mark and corrections are merged",
      "depends_on": ["dl-w0b4.27"],
      "labels": ["project:jadwigo-marketing", "site"]
    },
    {
      "title": "The O nas page on jadwigo.pl: why we build Jadwigo and for whom",
      "scope": "Filed as dl-w0b4.42: the founder story and the family's photos served from outside git",
      "done_when": "jadwigo.pl/o-nas serves the page and the no-names checks pass",
      "depends_on": ["dl-w0b4.35", "dl-w0b4.37", "dl-w0b4.41"],
      "labels": ["project:jadwigo-marketing", "site"]
    },
    {
      "title": "The class invitation kit: the Open Graph card and a printed A6 card",
      "scope": "Filed as dl-w0b4.43: the chat link card and the A6 card for the pilot class",
      "done_when": "The OG image shows in a chat preview and the A6 PDF prints at 105x148 mm",
      "depends_on": ["dl-w0b4.35", "dl-w0b4.31"],
      "labels": ["project:jadwigo-marketing", "site"]
    }
  ],
  "page_changes": [
    {
      "section": "docs/workstreams/marketing.md, Open",
      "change": "Add the identity choices dl-w0b4.35 to dl-w0b4.38 and the O nas photo question dl-w0b4.41"
    }
  ]
}
```
