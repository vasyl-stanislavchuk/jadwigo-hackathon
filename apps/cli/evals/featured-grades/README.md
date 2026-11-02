# The 12 featured lessons, grades 1 to 3, in Polish and English (`dl-r772.43`)

Two lessons per grade in each language, for the landing pages of jadwigo.pl and /en/, each one
click to play with no login (`dl-w0b4.107`). They replace the 6 featured before them: 3 Polish
multiplication drills and their 3 English mirrors (owner decision `dl-w0b4.111`). Each Polish
lesson and its English twin draw from the same Khan Academy sets, pinned with
`jw lesson draft --set`.

The lesson files copy Khan questions whole, so they stay outside git, in `JADWIGO_DRAFTS_DIR` on
the machine that drafted them (draft decision `dl-jhnl`). This folder records which drafts they are
and what the reviewers found. The reviews quote Khan text, so they stay outside git too.

## The lessons

Every lesson follows these rules:

- It fits the Polish curriculum grade, not the US grade the Khan sets follow (owner, 2026-11-02,
  on `dl-w0b4.111`):
  - grade 1 stays within 20;
  - grade 2 stays within 100, with clocks and cm or m;
  - grade 3 covers the times table to 100, clocks to the minute, picture graphs and perimeter by
    counting.
- It has 6 to 8 questions, from the question families cleared for featured lessons (choose,
  enter, slots).
- At least half of its questions have a picture.
- Its first question is easy, has a picture and makes sense on its own, because its `say` is the
  teaser on the landing card.
- Its questions run from easy to harder (`jw lesson move`).
- It has no US money and no inches or feet.

| Grade | Lang | Title | Lesson file id | Draft file | Questions (Khan item ids) | Types |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | pl | Dodajemy i odejmujemy do 20 | `featured-lesson-grade-1-add-subtract-20-pl-2026-11-02` | `draft_8b8f4d39fad5.json` | 8: `xed2a3533c2180e58`, `x515f21eee0a051df`, `x4e490c35e76d7b0a`, `x5918e44d53343d87`, `x90ff64ecf4c11920`, `x2e8f235b1fddd72f`, `x32e0c8a1b19dc4ee`, `x0ac24a69264f7557` | choose.recognition, enter.production, slots.fill_gaps |
| 1 | en | Adding and taking away to 20 | `featured-lesson-grade-1-add-subtract-20-en-2026-11-02` | `draft_86e7f55eb741.json` | 8: the same items as the Polish lesson | choose.recognition, enter.production, slots.fill_gaps |
| 1 | pl | Kształty, połówki i zegar | `featured-lesson-grade-1-shapes-halves-clocks-pl-2026-11-02` | `draft_7b9ecf68c594.json` | 6: `x2376de23c9fc7823`, `x2fc1a16c332d45f3`, `x0b5c61c9c87056b7`, `x48bff5b8eb2af4ac`, `x0d290c278460160e`, `x144789bc61435c5d` | choose.recognition, slots.fill_gaps |
| 1 | en | Shapes, halves and clocks | `featured-lesson-grade-1-shapes-halves-clocks-en-2026-11-02` | `draft_93226f2f49d3.json` | 6: the same items as the Polish lesson | choose.recognition, slots.fill_gaps |
| 2 | pl | Dodajemy i odejmujemy na rysunkach | `dodajemy-i-odejmujemy-na-rysunkach-2026-11-01` | `draft_7308e256e700.json` | 8: `x2034728713d637ad`, `x3202066fc725b23d`, `x1b252dc0db695853`, `x0baff7f9f712fb01`, `x2fde5dc80e237970`, `x5e13c5ecf48a412f`, `x46e7ba151e0a979f`, `xb95296a691ec03f4` | choose.recognition, enter.production, slots.fill_gaps |
| 2 | en | Adding and taking away with pictures | `adding-and-taking-away-with-pictures-2026-11-01` | `draft_bde217406012.json` | 8: the same items as the Polish lesson | choose.recognition, enter.production, slots.fill_gaps |
| 2 | pl | Zegar i centymetry | `zegar-i-centymetry-2026-11-01` | `draft_b6495cea4033.json` | 6: `x4137605021bcc004`, `x11d341e68c171828`, `xc2586e9cc13cbf84`, `x3a4ba6b988a3fbbc`, `x576de5e05d73e77e`, `x0792044c99182e84` | choose.recognition, slots.fill_gaps |
| 2 | en | Clocks and centimeters | `clocks-and-centimeters-2026-11-01` | `draft_53c35799a752.json` | 7: `x4137605021bcc004`, `x11d341e68c171828`, `xc2586e9cc13cbf84`, `x193c104ef78af661`, `x8953c437b4808dc0`, `x576de5e05d73e77e`, `x0792044c99182e84` | choose.recognition, slots.fill_gaps |
| 3 | pl | Mnożenie na obrazkach | `lekcja-pokazowa-klasa-3-mnozenie-na-obrazkach-2026-11-01` | `draft_d89d2df2d8a2.json` | 8: `x88fb45ce64f58296`, `x6bb4ecb502cc076b`, `xaae46055ef372c7b`, `x038fd64ecf51c1d6`, `x72d3436c4ddb913e`, `x4a9554858cd647b4`, `x82f48635c33f6694`, `x489c7fc2134aabc4` | choose.multi_select, choose.recognition, slots.fill_gaps, slots.label_picture |
| 3 | en | Multiplying with pictures | `featured-lesson-grade-3-multiplying-with-pictures-2026-11-02` | `draft_fc06b58a8e75.json` | 8: the Polish items, with `x7e92b282c3e303d9` in place of `x4a9554858cd647b4` | choose.multi_select, choose.recognition, enter.production, slots.label_picture |
| 3 | pl | Zegar i wykresy | `lekcja-pokazowa-klasa-3-zegar-i-wykresy-2026-11-02` | `draft_c2e881c264d4.json` | 8: `x0d9f118fad7a9562`, `x2436ed27f71a4ab3`, `x014a6e991761809b`, `x2fdb1cdcc50ba064`, `x3f6762a26d399ae8`, `x10517d682a3c434c`, `x26848f1a5e7dc6cc`, `xb0350bee5ee0e558` | choose.multi_select, choose.recognition, slots.fill_gaps |
| 3 | en | Clocks and graphs | `featured-lesson-grade-3-clocks-and-graphs-2026-11-02` | `draft_b0f70bb498d7.json` | 8: the same items as the Polish lesson | choose.multi_select, choose.recognition, slots.fill_gaps |

Where a Polish lesson and its English twin use different items, it is because each item is ready
in only one of the two languages. The sets are listed in `dl-r772.43`'s notes.

## How they were made and checked

- **Drafting:** one session per grade drafted with
  `jw lesson draft --set … --question-type choose --question-type enter --question-type slots`,
  then ran `jw lesson check` until it answered `ok: true`.
  - `jw lesson move` set the order.
  - `jw lesson drop` took out 3 steps that a reviewer found outside the grade or repeated: a
    hexagon in grade 1, and in grade 2 a paperclip-unit question and a third identical clock
    question.
- **Bank text fixes:** the drafters fixed bank text that the lessons copy, recording each change
  with its reason. The fixes covered:
  - sentences cut off mid-sentence;
  - English labels on Polish graphs;
  - picture alts that contradict the picture;
  - a hint that said the opposite of the key.

  The faults in the bank's own copies are listed on `dl-r772.46`.
- **Review:** `workflows/jadwigo-lesson-review` reviewed each lesson against
  `workflows/_lang/{pl,en}/checklist.md`, in sessions separate from the drafters, over 2 to 3
  rounds. The reviewers worked out every answer key and twin key by hand. The final round left no
  blocker:

  | Grade | Pass | Pass with notes (nits only) |
  | --- | --- | --- |
  | 1 | en adding, en shapes | pl adding, pl shapes |
  | 2 | pl adding, en adding, en clocks | pl clocks |
  | 3 | pl and en multiplication | pl and en clocks and graphs |

- **Local import and play:** each lesson was imported into a local database with
  `make lesson-import FEATURED=1`.
  - `GET /api/v1/featured-lessons` listed all 12 with their grades.
  - Each opened at `/play/<assignment>` straight on its first question, with its pictures loaded.
  - Every picture ref in the 12 files answers 200 from the media URL.

**Known display issue:** in picture and bar graphs, an axis label that is wider than its column
can overlap the next one (`dl-uukj.48`). Two lessons have such graphs: grade 1 adding (bar graphs)
and grade 3 clocks and graphs (picture graphs).

## Import (the owner's step, `dl-w0b4.109`)

Follow `docs/runbooks/lesson-import.md` for each of the 12 draft files above, with `FEATURED=1`
every time:

1. Import it into jadwigo-dev and play it there.
2. Import it into prod from your own terminal. Running prod with `FEATURED=1` is the approval.
3. Withdraw the old 3 Polish lessons with `make lesson-withdraw` (`dl-9t2o.12`). Their assignment
   ids are on `dl-w0b4.109`. They stay playable at their old links.

The 3 English mirrors were never imported to prod, so there is nothing to withdraw for them. After
the prod import, `dl-w0b4.110` refreshes `apps/site/src/content/featured.json`.
