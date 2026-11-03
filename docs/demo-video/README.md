# Demo video assets, 4 November submission

The stills, animations and sound effects the demo video's script names (`dl-1eieq.10.2`, epic `dl-1eieq.10`).
The script itself is in the md context brain, `jadwigo-hackathon/notes/demo-video-script-4-november-submission-10-scenes-in-about-3-min`,
because it names people; nothing here does. Drag the files into Screen Hero (or any editor that takes PNG,
H.264 MP4, HEVC MOV with alpha and WAV).

- Every picture is 1920x1080. Every animation is 30 fps.
- An `.mov` carries alpha (HEVC, `hvc1`): lay it over a screencast. Its `.mp4` twin is the same motion on the
  cream page (#F4F1EC).
- Every sound is 48 kHz mono WAV, peaking at -3 dB.
- No family member, classmate, teacher or school appears in any file (fence 9). The class teacher's cape-hero
  cameo (A11) waits for her written consent (`dl-7wlo.24.1`) and stays outside git until then.

## Pictures and animations

| Id | File | Scene | What it is | Source |
| --- | --- | --- | --- | --- |
| A1 | `A1-title.png` | 1 | Wordmark and the line "A second lesson for every child, from a photo of their homework", over the key picture | Jadwigo wordmark (`packages/ui/src/brand/wordmark.svg`); key picture from world 2a, Jadwigo's own art |
| A2-1 | `A2-1-card-who.png` | 2 | Lower third, alpha: "Who Jadwigo is for" | Jadwigo's own, crown from `packages/ui/src/brand/crown.svg` |
| A2-2 | `A2-2-card-homework.png` | 4 | Lower third: "One homework, a second lesson for every child" | as A2-1 |
| A2-3 | `A2-3-card-minutes.png` | 5 | Lower third: "From a photo to a lesson in about 2 minutes" | as A2-1 |
| A2-4 | `A2-4-card-types.png` | 6 | Lower third: "29 question types, chosen for you" | as A2-1 |
| A2-5 | `A2-5-card-print.png` | 7 | Lower third: "Print it, work on paper, photo it back" | as A2-1 |
| A2-6 | `A2-6-card-ai.png` | 9 | Lower third: "Jadwigo from your own AI app" | as A2-1 |
| A3 | `A3-queen-fly-in.mov`, `.mp4` | 1 | Queen Jadwiga flies in and gives a thumbs-up, 4.0 s | The app's own queen animation (`packages/ui/src/brand/queen.mov`, `dl-7wlo.40`) |
| A4 | `A4-cast-lineup.mov`, `.mp4` | 3, 10 | Jadwiga, Ołówek, Gumka and Linijka pop in one by one, 3.5 s; stands in for the class while no photo has consent | World 2a cast anchors, Jadwigo's own art |
| A5 | `A5-one-homework-18-lessons.mp4` | 4 | One homework sheet becomes 18 different second lessons, 6.0 s | Jadwigo's own |
| A6 | `A6-stopwatch.mov`, `.mp4` | 5 | A stopwatch counting 0:00 to 2:00 in 4.0 s, top right, alpha | Jadwigo's own |
| A7 | `A7-engine.png` | 5 | A photo, Meta models, the question bank, the golden set and evals, a lesson for one child | Jadwigo's own |
| A8 | `A8-question-types.png` | 6 | 29 question types in 7 families, counted from `packages/lesson-kit/src/families/questionTypes.ts` on 2026-11-03 | Jadwigo's own |
| A9 | `A9-paper-loop.mp4` | 7 | Print, work on paper, photo it back, knowledge base, "the next lesson knows", 8.0 s | Jadwigo's own |
| A10 | `A10-comparison.png` | 8 | Khan Academy, Duolingo, Kahoot and Jadwigo side by side, words only, no logos; its footer says the columns are the family's experience and credits Khan Academy | Jadwigo's own; the other products are named, never pictured |
| A12 | `A12-end-card.png` | 10 | Wordmark, jadwigo.pl, "Lecimy!", parent and child, the queen | Jadwigo's own art |

Licence for every picture and animation above: Jadwigo's own work, made for this video. Andika is under the
SIL Open Font License 1.1 (`@fontsource/andika`).

## Sounds

Each one is synthesized from ffmpeg's signal generators (sine, noise, filters, envelopes), with no samples and no
recordings, so each is Jadwigo's own work with no third-party licence.

| File | Length | Use |
| --- | --- | --- |
| `sfx-whoosh.wav` | 0.9 s | the queen flying in; connecting the AI app |
| `sfx-crown-ding.wav` | 1.6 s | the wordmark landing; the end card |
| `sfx-pop.wav` | 0.18 s | a cast member, a column or a cut appearing |
| `sfx-page-turn.wav` | 0.45 s | between scenes |
| `sfx-paper-shuffle.wav` | 1.1 s | the 18 sheets fanning out |
| `sfx-sparkle.wav` | 0.9 s | the last sheet landing |
| `sfx-shutter.wav` | 0.16 s | the homework photo |
| `sfx-tick.wav` | 0.25 s | under the stopwatch, looped |
| `sfx-chime.wav` | 1.8 s | a lesson arriving; the play link opening |
| `sfx-printer.wav` | 2.2 s | the print |
| `sfx-pencil.wav` | 2.4 s | the child working on paper |

## Remaking them

The page and scripts that render these files live outside git with the rest of the art, in
`~/projects/jadwigo-art/demo-video/`: `stage.html` (every scene, seekable by time), `render.mjs` (stills and frames
through Playwright, then ffmpeg) and `sfx.sh` (the sounds). `node render.mjs <name>` remakes one asset.
