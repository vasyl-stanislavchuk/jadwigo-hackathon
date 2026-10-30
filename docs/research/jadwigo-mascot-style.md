# Which illustration style brings Queen Jadwiga and her class to life?

Issue: `dl-w0b4.18`

## The answer in 5 lines

- **The cast is decided, the style is not.** Queen Jadwiga and her cape heroes, Klasa Królowej, carry Jadwigo (`jadwigo-marketing/decisions/2026-10-30-queen-jadwiga-and-her-class-of-cape-heroes-klasa-krolowej-carry`). This note sets out what any style must meet and how to find the style.
- **Zeszyt sets hard limits.** No green or red on a character, the crown yellow kept apart from help's yellow, the margins only, a line that matches the lesson diagrams, and a silhouette that reads at 64 px.
- **10 styles, the same 3 subjects each.** The baseline doodle (S1), paper-cut diorama (S2, the owner's favourite), wycinanki, marginalia, risograph, kredki, linocut, clay, chalk and clean vector, plus a diorama scene for S2. They are compared side by side in one drop.
- **Images are made with shelestni's `s img`.** It runs Gemini 3 Pro Image with up to 14 references and keeps the exact prompt beside each image. The 31 prompts are ready in `~/projects/jadwigo-art/` and cost about $4–8 per take. The owner runs the batch (`dl-w0b4.69`).
- **Generated images only set the direction.** Every style ends as layered SVG (head, eyes, cape, crown) that the app animates in the margins. Styles that are textured (S2, S6, S8) cost the most to get there.

## Method

- **Read:**
  - the two design handoffs (`design_handoff_identity`, `design_handoff_mascots`, kept outside git), their 3 boards and their 10 style blocks;
  - Zeszyt in `packages/ui/src/styles/foundation.css`, and the lesson diagrams' line weights in `packages/lesson-kit/src/parts/` (`ClockFace.tsx`, `NumberLineSvg.tsx`, `BarGraph.tsx`);
  - the decisions in force, cited above and in the findings.
- **Read in shelestni-app**, the owner's other project, which makes children's-book illustrations:
  - `craft/methodology/visual-styles/visual-styles-methodology.md`: styles that differ on at least 3 dimensions, all shown on the same scene;
  - `craft/methodology/character-art/character-art-methodology.md`: the descriptor lock;
  - `craft/theory/illustration/gemini-mastery.md`: prompt order, reference priority and the consistency checkpoint;
  - `backend/crm/services/agent_image_service.py` (`_auto_inject_anchors`): the anchor rule;
  - the `s img` CLI in shelestni-dev-cli.
- **Built:**
  - the prompt pack in `~/projects/jadwigo-art/` (story, rules, 10 style blocks, 4 subjects, a descriptor lock per character, references);
  - `run-styles.sh`, whose `--dry-run` printed all 31 prompts with their references and spent nothing.
- **Not done:**
  - No image has been generated. That is the owner's paid step, `dl-w0b4.69`.
  - No style has been tried on a child.
  - No illustrator has been asked for a quote.

## What every style must meet

| Requirement | Where it comes from | How it is checked |
| --- | --- | --- |
| No green or red on a character | `--jw-right` and `--jw-miss` mean right and miss; `foundation.test.ts` keeps every other role off both hues | The palette check below |
| The crown is `--jw-crown` (#f5c84b) with 5 points; capes and wings are ink blue (`--jw-p-ink-650`) | The look decision (`…-jadwigo-wears-lockup-4a-…`) | Against `refs/crown.png` |
| No other yellow on a character; help keeps `--jw-help` | Help is the only other yellow in Zeszyt (`--jw-p-sun-*`) | The palette check below |
| Matches the lesson's line: the diagrams draw 3–4 px strokes with round caps (`NumberLineSvg.tsx`, `BarGraph.tsx`, `ClockFace.tsx`) | One page should feel like one hand | Lay it next to `03-lesson-moments.png` |
| Reads as a solid silhouette at 64 px | The handoff's rule, and the margin size | Fill it black, shrink it to 64 px |
| Margins only, never over the answer, options or action; the last frame only under reduced motion | The character decision; `--jw-dur-*` drops to 0 under `prefers-reduced-motion` | In the lesson-moment issues of `dl-7wlo.24` |
| No emblem, no text on clothing, never a sad face at the child | The character decision | When scoring |
| Patron only, no school; no real child or family member is drawn | `jadwigo-marketing/decisions/2026-10-27-the-jadwigo-repo-names-only-the-patron-queen-jadwiga-never-the-s`; house rules | In prompts and in review |

## The 10 styles

Each is tried on the same 3 subjects: T1 Jadwiga standing, T2 Ola flying with the dotted pencil trail, and T3 the crown slipping over Jadwiga's eyes. S2 also gets T4, the notebook-kingdom diorama.

| Style | What it brings | How it moves | Getting to layered SVG | Risk |
| --- | --- | --- | --- | --- |
| S1 Ballpoint doodle | The closest to the lesson diagrams | Line "boil": 3 redrawn frames | Easy: it is already line and flat fill | Can look too plain |
| S2 Paper-cut diorama | "Paper on a desk", taken into depth | A puppet rig, plus scene parallax | Hard: paper texture and soft shadows must be redrawn as flat layers with a texture image | The most to produce; scenery tints drift green |
| S3 Wycinanki modern | Royal and Polish ([wycinanki](https://en.wikipedia.org/wiki/Wycinanki)) | Symmetric shapes unfold | Easy: flat cut shapes | Motifs crowd at 64 px |
| S4 Illuminated marginalia | The cast literally lives in the margin ([drolleries](https://en.wikipedia.org/wiki/Marginalia)) | Climbing and swinging along a vine border | Medium | Can look old; gold drifts brown |
| S5 Risograph | The two brand inks with grain ([risograph](https://en.wikipedia.org/wiki/Risograph)) | Misregistration shimmer | Medium: grain becomes a texture layer | Blue over yellow makes green |
| S6 Kredki | Looks drawn by the child | Frame by frame | Hard: pencil strokes do not vectorise | Mush at 64 px |
| S7 Linocut | The teacher's stamp in a notebook | "Stamp in" with squash and spread | Medium | Heavy if overdone |
| S8 Clay | The most physical comedy | Stop motion at 12 fps | Not possible: stays raster or video | Leaves the flat lesson UI; heavy files |
| S9 Chalk on slate | A night-mode companion | Lines draw themselves on | Medium | Needs a dark ground that is not green |
| S10 Clean vector | The cheapest to animate | Fully rigged in [Rive](https://rive.app) | Native | Generic, like most app mascots |

The handoff also names pairings to try once 3 styles are shortlisted: S2 scenes with S1 in the lesson margin, S2 with S3, S1 line over S5 fills, S9 for night with any day style, and S7 stamps for rewards only.

## How the images are made, and how to keep them consistent

- **Prompt:** shelestni's order, kept to what a mascot needs:
  - the story block;
  - the style block;
  - the subject;
  - the character's descriptor lock, verbatim;
  - the rules;
  - a line naming each attached image ("Image 1 is…").

  Shelestni's consistency checkpoint asks for the descriptor to be copied word for word and every reference to be named. Both are built into `run-styles.sh`.
- **References:**
  - S1 gets the style board.
  - Every other style gets only the silhouettes and the crown, because the board pulls each result back to the doodle.
  - Gemini reads up to 14 references in priority order ([Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation)).
- **Anchor rule:** once a style is picked, the first approved front view of each character becomes its anchor. It is attached to every later render of that character: the turnaround, the expressions and the poses. This is shelestni's `_auto_inject_anchors`, which keeps a cast from drifting across dozens of images.
- **Cost:** 31 images at roughly $0.13–0.24 each on Gemini 3 Pro Image. `--model gemini-2.5-flash-image` is a cheaper first look. Existing images are skipped, so a stopped run never pays twice.
- **After generation** (none of this exists in shelestni):
  - remove the background ([rembg](https://github.com/danielgatis/rembg)) or ask for a plain cream ground;
  - vectorise flat styles with [vtracer](https://github.com/visioncortex/vtracer), and have an illustrator redraw textured ones;
  - split into named layers so [Rive](https://rive.app) or [Lottie](https://airbnb.io/lottie/) can move the head, eyes, cape and crown.

## How the styles are compared

- One drop (`docs/drops/mascot-style/`) with the 10 × 3 grid, styles as rows.
- Each image is also shown at 64 px beside the lesson UI, and as a black silhouette.
- Each image is scored 1–5, with fresh eyes the next day:
  - reads at 64 px;
  - silhouette;
  - fits the notebook story;
  - funny without being mean (T3);
  - can be animated;
  - T1 and T3 look like the same girl;
  - would not be mistaken for another app;
  - the child's vote: show the grid without explanation and see which one the child points at first.
- The owner shortlists 3. Those 3 then go through the full turnaround, expression and pose sheets (`dl-7wlo.24`).

## What this means for jadwigo

- Nothing changes in code yet.
- The board:
  - the owner runs the batch (`dl-w0b4.69`);
  - this issue then builds the comparison drop from `runs/`;
  - the owner's shortlist is recorded as a decision in jadwigo-marketing;
  - `dl-7wlo.24` locks the cast in the chosen style and files one issue per lesson moment.
- The streak rule the hero flight needs is a separate owner question (`dl-7wlo.23`).
- Images stay in `~/projects/jadwigo-art/`. Only final SVGs under 1 MB, and drop thumbnails, enter git.

```json jadwigo-outcome
{
  "issue": "dl-w0b4.18",
  "question": "Which illustration style brings Queen Jadwiga and her class to life?",
  "answer": "Any style must meet Zeszyt's limits (no green or red, the crown's yellow apart from help, margins only, the diagrams' line, a 64 px silhouette); 10 styles are set up to be compared on the same 3 subjects with a ready prompt pack, and the pick waits on the owner's run and the comparison drop.",
  "status": "partial",
  "sources": [
    "https://ai.google.dev/gemini-api/docs/image-generation",
    "https://en.wikipedia.org/wiki/Wycinanki",
    "https://en.wikipedia.org/wiki/Marginalia",
    "https://en.wikipedia.org/wiki/Risograph",
    "https://github.com/danielgatis/rembg",
    "https://github.com/visioncortex/vtracer",
    "https://rive.app",
    "https://airbnb.io/lottie/",
    "packages/ui/src/styles/foundation.css",
    "packages/lesson-kit/src/parts/NumberLineSvg.tsx"
  ],
  "owner_decisions": [
    {
      "question": "Which 3 styles go on to full character sheets, after the comparison drop",
      "options": [
        "S1 Ballpoint doodle",
        "S2 Paper-cut diorama",
        "S3 Wycinanki modern",
        "S4 Illuminated marginalia",
        "S5 Risograph",
        "S6 Kredki",
        "S7 Linocut",
        "S8 Clay",
        "S9 Chalk on slate",
        "S10 Clean vector",
        "A pairing from the handoff (for example S2 scenes with S1 in the lesson)"
      ]
    }
  ],
  "proposed_issues": [],
  "page_changes": [
    {
      "section": "docs/workstreams/marketing.md, identity",
      "change": "The look, the name story and the character are decided (2026-10-30); the illustration style is in exploration under dl-w0b4.18."
    }
  ]
}
```
