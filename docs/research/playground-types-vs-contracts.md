# Which playground question types, played on Khan Academy items, fit the v0 contracts?

Issue: `dl-w3.72`

## The answer in 5 lines

1. All 29 question types fit the v0 contracts of PR #31, data, key, value and help ladder included. No type needs a contract change.
2. 15 types play Khan Academy items: 178 items in all, every one of which parses. The other 14 types play only the playground's written examples. Those parse too: 84 examples and 303 scenario values.
3. The playground changes in 4 places, and each change is made once, in the loader, not per type. Each question takes one language, `credit` gains `licence`, the item's `id` moves to `based_on`, and `phase` is dropped. A help `twin` becomes a question of its own.
4. Choose, Enter and Slots all fit, so the issue's stop condition does not apply.
5. The port (`dl-w3.73`) carries all 29 types, as the owner decided on 2026-10-27. 15 play Khan items, and 14 play their written examples.

## Method

Measured, not read side by side.

- **The contracts.** PR #31's `packages/contracts` was taken from branch `dl-e8ov.2.32/wave-1` with `git archive` and run with its pinned `zod` 4.6.7. Nothing in this repo imports it.
- **What was parsed.** A throwaway bun script ran the following through the PR's schemas:
  - every playing item in david-learns `frontend/src/playground/khan/items.json`;
  - every written example from `frontend/src/playground/examples/index.ts` (`EXAMPLES`).
- **Each question was checked for:**
  - `{family, data, key}` through `FamilyQuestion`;
  - `help` through `Help`;
  - `credit` through `Credit` from `records.ts`;
  - `QUESTION_TYPE_FAMILY[question_type] === family`;
  - `say` as a string;
  - for written examples, each scenario's value through `valueFor(family)`.
- **Catching dropped fields.** Zod objects strip unknown keys, so after each parse the script compared the input with the output. Any path the parse dropped is listed below as a dropped field.
- **Languages.** Lines written in several languages were resolved to one before parsing. The script ran once for `pl` and once for `en`, and the two runs gave the same result.

The script is not committed. To re-run it, extract the contracts as above, then parse `items.json` and a JSON dump of `EXAMPLES` the same way.

Not measured:
- The judges. The `Verdict` and `PartVerdict` shapes were compared by reading. Both are field for field the same as david-learns `families/types.ts`.
- Whether each type renders in `apps/web`. That is `dl-w3.73`'s check.
- The 22 Khan items that wait:
  - 18 wait on parts that mix families (`dl-uukj.29.126`);
  - 3 wait on symmetry drawn on a grid (`dl-w3.57`);
  - 1 waits because no family fits (`dl-w3.70`).

  None of them plays today, so none is in the counts.

## One row per question type

"Khan" counts playing Khan items. "Written" counts the playground's written examples and, in brackets, their scenarios.

The verdict is about the type's data, key and value. Every row also takes the 4 loader changes listed after the table. Those are changes to the question record, not to the type. A `twin` count names the examples whose help carries a twin, which becomes its own question.

| Type | Family | Khan | Written | Verdict | Type-specific change |
| --- | --- | --- | --- | --- | --- |
| `true_false` | choose | 0 | 2 (4) | fits | twin in 2 |
| `recognition` | choose | 22 | 5 (17) | fits | twin in 4 |
| `lettered_choice` | choose | 0 | 1 (4) | fits | twin in 1 |
| `multi_select` | choose | 18 | 2 (7) | fits | twin in 2 |
| `mark_numbers` | choose | 0 | 2 (8) | fits | twin in 2 |
| `fraction_compare` | choose | 7 | 2 (6) | fits | twin in 2 |
| `production` | enter | 14 | 6 (23) | fits | twin in 5 |
| `short_text` | enter | 0 | 4 (21) | fits | twin in 2 |
| `expression` | enter | 6 | 2 (11) | fits | twin in 2 |
| `measure` | enter | 0 | 3 (12) | fits | twin in 3 |
| `fill_gaps` | slots | 27 | 8 (27) | fits | twin in 8 |
| `fill_table` | slots | 14 | 2 (6) | fits | twin in 2 |
| `label_picture` | slots | 6 | 1 (4) | fits | twin in 1 |
| `column` | slots | 0 | 4 (14) | fits | twin in 4 |
| `pyramid` | slots | 0 | 2 (6) | fits | twin in 2 |
| `clock_read` | slots | 0 | 1 (5) | fits | twin in 1 |
| `money_count` | slots | 0 | 2 (7) | fits | twin in 2 |
| `order` | sequence | 12 | 3 (12) | fits | twin in 3 |
| `bucket` | group | 12 | 6 (16) | fits | twin in 5 |
| `match` | group | 9 | 2 (6) | fits | twin in 2 |
| `number_line_place` | place | 7 | 5 (18) | fits | twin in 3 |
| `hotspot` | place | 3 | 3 (11) | fits | twin in 3 |
| `spatial_build` | place | 4 | 1 (4) | fits | twin in 1 |
| `draw_graph` | place | 11 | 5 (15) | fits | twin in 5 |
| `clock_set` | place | 0 | 2 (8) | fits | twin in 2 |
| `money_pay` | place | 0 | 2 (8) | fits | twin in 2 |
| `fraction_shade` | place | 0 | 2 (9) | fits | twin in 2 |
| `area_model` | place | 0 | 1 (5) | fits | twin in 1 |
| `explain` | explain | 0 | 3 (9) | fits | none |
| **29 types** | 7 families | **178** | **84 (303)** | **29 fit** | |

No Khan item carries a twin. Where a Khan item's last hint gives the answer, the playground's own `REWRITTEN_HINTS` already rewrites it, and those rewrites are plain `help.hints[].text`.

## The 4 loader changes

Each was found by the parse. Each is the playground's to make, under [[jadwigo-learner-experience/notes/the-playground-adapts-to-the-v0-data-model-and-plays-the-khan-ac]].

1. **One language per question.** 32 of the 178 Khan items, and written examples, hold a line in several languages (`{pl, uk, en}`). `LessonQuestion.say` and every string in `data` are one plain string, and the lesson carries the language. The loader resolves each question to `pl` or `en` before it is typed as a contract, and `uk` is never resolved, per [[jadwigo-learner-experience/decisions/2026-10-27-the-playground-narrows-to-question-types-and-moves-into-the-jadw]]. Unresolved lines fail `say: string`.
2. **`credit.licence`.** All 178 Khan credits fail `Credit`, because `licence` is missing. The item holds `source, ref, url, original_lang, checked`, and david-learns `content/sources.ts` holds the licence per source (`cc-by-nc-sa-4.0` for Khan). The loader copies the source's licence id onto each credit.
3. **The item's `id` and `phase`.** The spec's `id` (`khan-<ref>`) has no field on `FamilyQuestion`. A lesson question's id is a `lq_` id the database mints, and the Khan ref goes to `based_on.question` as `khan:<ref>`. `phase` (`practise`) is a lesson concern, and v0 has no field for it. The port leaves lessons out, so it drops `phase`.
4. **`help.twin` becomes its own question.** `Help` in PR #31 drops `twin` on purpose: "a twin is its own lesson question in the database". 74 written examples carry one. Rung 4 (`help_twin`) in the playground then plays a second question, not a field of the first.

The rest of what the playground carries matches field for field:
- the stem, figures, pictures and their labels;
- every family's options;
- the gap kinds and the table, column and pyramid bodies;
- `near`, `rule`, `forms`, `tolerance`, `why` and `worked_solution` in keys;
- the help ladder's `hints`, `look`, `boost`, `boost_by_mistake`, `give`, `worked` and `almost`;
- the verdict's `correct`, `mistake_class`, `parts` and `sides_swapped`;
- `PartMark`, which keeps a part's class off the page.

## What this means for jadwigo

- **`dl-w3.73` carries all 29 types.** The owner chose this on 2026-10-27 over "only the 15 with Khan items" and "15 now, the 14 as a follow-up". The decision is recorded at `jadwigo-learner-experience/notes/2026-10-27-the-playground-port-carries-all-29-question-types-15-play-khan-a`.
  - Its done-when reads: each Choose, Enter and Slots type plays its Khan items, or its written examples when it has none.
  - Statuses: Refined for the 17 types in Choose, Enter and Slots. Draft for the 12 types in Sequence, Group, Place and Explain. Idea for none today, because no type is only proposed.
- **The port types every question from `@jadwigo/contracts`.** It makes the 4 loader changes above in one module beside the Khan items, so a type page never sees a multi-language line, a missing licence or a twin field.
- **No contract change, and nothing for the owner beyond the port list.** Nothing in this note asks PR #31 to move.

The port carries these 29 types:
- **Choose (Refined):** `true_false`, `recognition`, `lettered_choice`, `multi_select`, `mark_numbers`, `fraction_compare`.
- **Enter (Refined):** `production`, `short_text`, `expression`, `measure`.
- **Slots (Refined):** `fill_gaps`, `fill_table`, `label_picture`, `column`, `pyramid`, `clock_read`, `money_count`.
- **Sequence (Draft):** `order`.
- **Group (Draft):** `bucket`, `match`.
- **Place (Draft):** `number_line_place`, `hotspot`, `spatial_build`, `draw_graph`, `clock_set`, `money_pay`, `fraction_shade`, `area_model`.
- **Explain (Draft):** `explain`.

```json jadwigo-outcome
{
  "issue": "dl-w3.72",
  "question": "Which playground question types, played on Khan Academy items, fit the v0 contracts in PR #31, and what does the playground change to fit?",
  "answer": "All 29 fit with no contract change: 178 Khan items (15 types) and 84 written examples with 303 scenario values parse. The playground makes 4 loader changes (one language per question, credit.licence, id to based_on and no phase, twin as its own question), and the port carries all 29 types, as the owner decided.",
  "status": "answered",
  "sources": [
    "https://github.com/vasyl-stanislavchuk/jadwigo-hackathon/pull/31",
    "jadwigo-learner-experience/decisions/2026-10-27-the-playground-narrows-to-question-types-and-moves-into-the-jadw",
    "jadwigo-learner-experience/notes/the-playground-adapts-to-the-v0-data-model-and-plays-the-khan-ac",
    "jadwigo-learner-experience/notes/2026-10-27-the-playground-port-carries-all-29-question-types-15-play-khan-a",
    "david-learns frontend/src/playground/khan/items.json",
    "david-learns frontend/src/playground/examples/index.ts",
    "david-learns frontend/src/content/sources.ts"
  ],
  "owner_decisions": [],
  "proposed_issues": [],
  "page_changes": [
    {
      "section": "dl-w3.73 done-when",
      "change": "Each Choose, Enter and Slots type plays its Khan items, or its written examples when it has none; the port carries all 29 types."
    }
  ]
}
```
