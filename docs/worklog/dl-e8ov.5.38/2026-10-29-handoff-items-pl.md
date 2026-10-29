# items-pl handoff: Polish item bodies as family steps (dl-e8ov.5.38.1)

State: DONE_WITH_CONCERNS. Commits `1b081be` and `b6e0259` on branch `items-pl` in jadwigo-bank
(`/Users/vasyl/.md/worktrees/jadwigo-bank/items-pl`). The repo has no remote, so there is no PR
and nothing was pushed.

## What landed

- `tools/khan/to_family_pl.py`: a separate entry point beside `to_family.py`, which is not
  changed. `PolishConverter` subclasses `Converter`. It speaks Polish (`spoken`, the default says,
  `DRAGS`, `FIRST_LAST`), reads `<KHAN_DIR>/pl/items/<id>.json`, and learns picture alts from Khan's
  own Polish items only. It converts the union of `items.ids` across
  `sets/khan/math/grade-3/set_*.json`, in `index.json` order.
- A waiting item (spec null, `status` naming the wait) is written with its status, as
  `converted.json` does (`b6e0259`, after the lead's note); there is nothing in it to check.
- The twin check: a playing item is written only if its English twin in `converted.json` plays and
  the two agree on family and question_type, `spec.key`, the sorted numbers in `spec.data`, and the
  pictures' addresses. Numbers ignore digit-group separators, picture addresses, drawing fields
  and `alt`, because Khan's Polish usually leaves alt empty. A twin with `language: "multi"` is
  compared through its `en` lines. If more than 5% of a set's items differ, the whole set stops.
- `make khan-items-pl` runs `uv run python -m tools.khan.to_family_pl`. The flags
  `--khan-dir` and `--sets-dir` default to the pull and to the sets in this repo.
- `tests/test_khan_to_family_pl.py` has 6 tests, one of them a waiting item. `tests/fixtures/khan_pl/` holds 3 invented items
  in Polish and English (a multiplication with Enter, an addition with Choose and no picture, and
  a division whose numbers differ from its twin, so it is refused), plus the expected files. The
  fixtures use no Khan text and no Khan ids.

## Outputs (outside git)

- `/Users/vasyl/projects/david-learns/media/khan/converted-pl.json` (3426 KB):
  `{generated_by: "tools/khan/to_family_pl.py", licence_note, items}`.
  Item fields: `credit{checked, licence, original_lang: "pl", ref, source, url}, exercise,
  exercise_title, family, grade, id, language: "pl", lesson_title, order, problem_type,
  question{pictures, text}, say_source, source_url, spec{data, family, help, id, key, phase,
  question_type, say} or null, status, unit_title`. 670 items play and 27 wait. The course fields
  (exercise, unit, lesson titles) are the manifest's English ones.
- `/Users/vasyl/projects/david-learns/media/khan/converted-pl.refused.json` (380 KB):
  `{generated_by, items: [{id, reason, sets}]}`.
- Checked: all 697 items have `language: "pl"`, `credit.original_lang: "pl"`, `credit.licence`
  and `status`. Converted and refused together cover all 2,720 listed ids, with no id in both. Two
  runs gave byte-identical files.

Families written: enter/production 298, choose/recognition 169, slots/fill_gaps 81,
slots/fill_table 59, choose/multi_select 36, choose/fraction_compare 20, group/match 7; 27 waiting.

## Totals

697 converted (670 play, 27 wait) and 2,023 refused, out of 2,720 ids in 143 sets. 52 sets have
at least one converted item, 18 sets stopped, and 91 sets have none.

| Refusal reason | Items |
| --- | --- |
| a hint picture has no alt text yet | 1078 |
| a picture was not pulled (run media.py) | 510 |
| in a stopped set (more than 5% differ) | 143 |
| no Polish raw item | 118 |
| not in the manifest, so no English twin | 96 |
| pl differs from en (any of family, key, numbers, pictures) | 73 |
| the figure on the grid has no alt text | 3 |
| the written worked lines need pl | 2 |

## For the lead

1. **Missing Polish hint alts are the main loss: 1,078 items.** Khan's Polish items carry hint
   pictures as markdown images with empty alt. Their English twins use image widgets that have
   alt. The pictures are the same files, but none of them is in `alt.json`. The converter refuses
   such an item, as it does in English. I did not borrow the English alt, because that would put
   English words into a Polish hint. Possible fixes, and the choice is yours: write `pl/uk/en` alt
   for those files into `alt.json` with the existing alt pass (dl-w3.70.10), which unlocks them
   with no code change; or decide that a Polish hint picture with no alt is decorative or dropped.
2. **510 items use localized pictures that were never pulled.** Pulling them takes `media.py`,
   which needs network, so I did not run it.
3. **18 sets stopped** under the 5% rule. They are listed below as `(stopped)`, and each refused
   item names its set. The 73 real differences are mostly of these kinds: Polish numbers written
   in words where English uses digits (fraction options), extra numbers in the Polish stem
   (division in contexts), changed units or values (area and perimeter, patterns, order of
   operations), different gap structure, and `\dfrac68`-style TeX read as 68. The check is strict
   on purpose. None of these was guessed.

## Commands and results

- `uv run pytest -q tests/test_khan_to_family_pl.py`: 6 passed; with `tests/test_khan_to_family.py`, 204 before the waiting test.
- `uv run pytest -q` (the repo's `make test`): 433 passed.
- `uvx ruff format --line-length 100` and `uvx ruff check` on the 2 new files: clean.
- `make khan-items-pl`: the totals above. Running it twice gave identical shasums.
- `git status`: clean after the commit. Nothing under `media/` was staged, and no file is over
  100 KB. `git diff --stat main` lists `Makefile`, `tools/khan/to_family_pl.py`,
  `tests/test_khan_to_family_pl.py` and `tests/fixtures/khan_pl/` (15 files).

Not run: `make gate` (search is not touched), `media.py`, any `gh` or `bd` write, any model call.

## Counts per set (converted with waiting, refused, of total)

```
set_khan_x83e28da65bed275e: 0 converted (0 waiting), 12 refused of 12
set_khan_xf17a412b735ff07d: 21 converted (0 waiting), 0 refused of 21
set_khan_x5bfe399187cdadca: 0 converted (0 waiting), 16 refused of 16 (stopped)
set_khan_213229225: 0 converted (0 waiting), 18 refused of 18
set_khan_x53f9b5bc: 0 converted (0 waiting), 21 refused of 21
set_khan_x9d0bb626117b07b2: 19 converted (0 waiting), 2 refused of 21
set_khan_x6949155042d628e0: 21 converted (0 waiting), 0 refused of 21
set_khan_xd578b25b: 1 converted (0 waiting), 22 refused of 23
set_khan_xcaf0d809f65385c7: 20 converted (0 waiting), 1 refused of 21
set_khan_xa852b4f5437c41c2: 9 converted (0 waiting), 3 refused of 12
set_khan_x2ec2adef9ed42f2b: 0 converted (0 waiting), 12 refused of 12
set_khan_x9beef8b9: 21 converted (0 waiting), 0 refused of 21
set_khan_xade69011: 20 converted (0 waiting), 0 refused of 20
set_khan_x17ef5a60: 21 converted (0 waiting), 0 refused of 21
set_khan_xe2a974c3: 13 converted (0 waiting), 8 refused of 21
set_khan_x71d0c14f99b89274: 20 converted (0 waiting), 0 refused of 20
set_khan_x761f4a33: 14 converted (0 waiting), 7 refused of 21
set_khan_x56f58db33b4b8810: 13 converted (0 waiting), 8 refused of 21
set_khan_x69d1a067293ca980: 20 converted (0 waiting), 0 refused of 20
set_khan_x9cbaa6d9: 21 converted (0 waiting), 0 refused of 21
set_khan_xa7200938: 21 converted (0 waiting), 0 refused of 21
set_khan_x7250b6df287296ce: 20 converted (0 waiting), 0 refused of 20
set_khan_x4a121673231ec0e4: 0 converted (0 waiting), 14 refused of 14
set_khan_x28621103: 14 converted (0 waiting), 0 refused of 14
set_khan_x59551e61: 1 converted (0 waiting), 20 refused of 21
set_khan_xd0351274: 0 converted (0 waiting), 21 refused of 21 (stopped)
set_khan_xf1ef41a6: 1 converted (0 waiting), 20 refused of 21
set_khan_13179357: 1 converted (0 waiting), 18 refused of 19
set_khan_xe434af5f: 4 converted (4 waiting), 19 refused of 23
set_khan_x6ab0d7b8: 0 converted (0 waiting), 27 refused of 27
set_khan_x37af7309: 0 converted (0 waiting), 20 refused of 20
set_khan_x6c1ecb09e1afaa3a: 21 converted (0 waiting), 0 refused of 21
set_khan_xb6cd2020: 20 converted (0 waiting), 0 refused of 20
set_khan_xa543efd6: 20 converted (0 waiting), 0 refused of 20
set_khan_x94f7921f: 0 converted (0 waiting), 21 refused of 21
set_khan_xdd1083e36ed9c9a4: 0 converted (0 waiting), 42 refused of 42
set_khan_2002: 19 converted (0 waiting), 0 refused of 19
set_khan_x3f125eba443a7819: 21 converted (0 waiting), 0 refused of 21
set_khan_x90f02f84de4e156b: 11 converted (0 waiting), 11 refused of 22
set_khan_x2ea3cd5c05ca14b7: 1 converted (0 waiting), 11 refused of 12
set_khan_x743a4eb230f46c7e: 0 converted (0 waiting), 32 refused of 32
set_khan_3005: 1 converted (0 waiting), 21 refused of 22
set_khan_xf498d857: 0 converted (0 waiting), 20 refused of 20
set_khan_xa434529d6b9e2545: 0 converted (0 waiting), 12 refused of 12
set_khan_x4cfd840c: 6 converted (0 waiting), 18 refused of 24
set_khan_xcf9e1cb73c15242a: 7 converted (0 waiting), 14 refused of 21
set_khan_x6f26d348: 0 converted (0 waiting), 20 refused of 20
set_khan_x2b47c4fb1c81066b: 0 converted (0 waiting), 21 refused of 21 (stopped)
set_khan_x8a03e0ba: 21 converted (0 waiting), 0 refused of 21
set_khan_x915c57a9f483c925: 21 converted (0 waiting), 0 refused of 21
set_khan_xa56655c72e747ad4: 0 converted (0 waiting), 22 refused of 22 (stopped)
set_khan_xd1c1ce9e: 0 converted (0 waiting), 21 refused of 21
set_khan_xb7391101: 11 converted (0 waiting), 0 refused of 11
set_khan_x759ac56b: 10 converted (0 waiting), 0 refused of 10
set_khan_xd6798f56: 0 converted (0 waiting), 10 refused of 10
set_khan_x087638d2: 10 converted (0 waiting), 0 refused of 10
set_khan_xe86ec6d1: 0 converted (0 waiting), 10 refused of 10
set_khan_x05eda038: 0 converted (0 waiting), 10 refused of 10
set_khan_x0530ef46: 0 converted (0 waiting), 10 refused of 10
set_khan_xcb67609f: 0 converted (0 waiting), 10 refused of 10
set_khan_x58a2b546: 0 converted (0 waiting), 10 refused of 10
set_khan_x8784bb1f: 0 converted (0 waiting), 10 refused of 10
set_khan_13179371: 0 converted (0 waiting), 25 refused of 25
set_khan_xad45033a: 5 converted (0 waiting), 30 refused of 35
set_khan_x014877eb: 20 converted (0 waiting), 20 refused of 40
set_khan_x21e07b7a102ae31c: 0 converted (0 waiting), 12 refused of 12 (stopped)
set_khan_196013736: 0 converted (0 waiting), 24 refused of 24
set_khan_363750329: 0 converted (0 waiting), 21 refused of 21
set_khan_x7a2560eb: 0 converted (0 waiting), 21 refused of 21 (stopped)
set_khan_x9f9615befd0f55b6: 0 converted (0 waiting), 12 refused of 12
set_khan_460972000: 0 converted (0 waiting), 14 refused of 14
set_khan_461002061: 0 converted (0 waiting), 18 refused of 18
set_khan_x22f67f5e: 0 converted (0 waiting), 22 refused of 22
set_khan_x33359221096bac08: 0 converted (0 waiting), 14 refused of 14
set_khan_x13be4fcf177e92b8: 0 converted (0 waiting), 28 refused of 28
set_khan_xc3737896: 0 converted (0 waiting), 25 refused of 25 (stopped)
set_khan_x3efddc8d: 20 converted (0 waiting), 0 refused of 20
set_khan_xba32b95a0f76e42e: 12 converted (12 waiting), 0 refused of 12
set_khan_x894ee778: 0 converted (0 waiting), 12 refused of 12
set_khan_x421716fd: 0 converted (0 waiting), 12 refused of 12
set_khan_196041692: 0 converted (0 waiting), 21 refused of 21
set_khan_xa37f30b5: 0 converted (0 waiting), 26 refused of 26 (stopped)
set_khan_x6870a2b0: 0 converted (0 waiting), 21 refused of 21 (stopped)
set_khan_x6222f5a3: 0 converted (0 waiting), 20 refused of 20
set_khan_xc725f83b539ed27e: 0 converted (0 waiting), 12 refused of 12 (stopped)
set_khan_x5bca99d100f3378d: 0 converted (0 waiting), 21 refused of 21
set_khan_2007: 15 converted (0 waiting), 6 refused of 21
set_khan_xee93d82d3f3e9808: 0 converted (0 waiting), 16 refused of 16
set_khan_x7d25bd6575ffa90b: 13 converted (0 waiting), 0 refused of 13
set_khan_x8447f160: 21 converted (0 waiting), 0 refused of 21
set_khan_x055f038e6eff073a: 0 converted (0 waiting), 13 refused of 13 (stopped)
set_khan_3006: 24 converted (0 waiting), 0 refused of 24
set_khan_xbbc79ded: 12 converted (0 waiting), 0 refused of 12
set_khan_xabdd2cb37ad08489: 0 converted (0 waiting), 21 refused of 21 (stopped)
set_khan_x4f8a3a1513c33c1f: 0 converted (0 waiting), 25 refused of 25
set_khan_xf7e1a19cf16f34b8: 0 converted (0 waiting), 13 refused of 13 (stopped)
set_khan_xe74783ef: 0 converted (0 waiting), 19 refused of 19 (stopped)
set_khan_xb55e9918: 14 converted (0 waiting), 7 refused of 21
set_khan_x77bb15d9815f63e8: 0 converted (0 waiting), 16 refused of 16 (stopped)
set_khan_x953c7e2fd1faf9cc: 0 converted (0 waiting), 12 refused of 12 (stopped)
set_khan_xae262957: 0 converted (0 waiting), 13 refused of 13 (stopped)
set_khan_xbc82feb759d48e64: 0 converted (0 waiting), 23 refused of 23
set_khan_x84e31b3e: 0 converted (0 waiting), 15 refused of 15
set_khan_x2f0dd9721dd7a711: 0 converted (0 waiting), 14 refused of 14
set_khan_xdf9001b98244b355: 0 converted (0 waiting), 13 refused of 13
set_khan_898677597: 0 converted (0 waiting), 37 refused of 37
set_khan_x06af65d1: 8 converted (8 waiting), 16 refused of 24
set_khan_xcdcfce8e: 3 converted (3 waiting), 17 refused of 20
set_khan_x3e15f349c73eed53: 0 converted (0 waiting), 22 refused of 22
set_khan_x73005801: 2 converted (0 waiting), 10 refused of 12
set_khan_x33225a4b: 0 converted (0 waiting), 21 refused of 21
set_khan_x0d3f50bf: 0 converted (0 waiting), 21 refused of 21
set_khan_x9c76746b: 0 converted (0 waiting), 17 refused of 17
set_khan_x3c023751: 0 converted (0 waiting), 23 refused of 23
set_khan_x910d00f4a7ff3f14: 0 converted (0 waiting), 12 refused of 12
set_khan_x90012c28: 0 converted (0 waiting), 24 refused of 24
set_khan_x5126dbf9: 0 converted (0 waiting), 31 refused of 31
set_khan_840068734: 0 converted (0 waiting), 14 refused of 14
set_khan_xddab0f04: 0 converted (0 waiting), 21 refused of 21
set_khan_x28e2eb94: 0 converted (0 waiting), 20 refused of 20
set_khan_x179b5ca36741ee29: 0 converted (0 waiting), 12 refused of 12
set_khan_xa8d2032c: 0 converted (0 waiting), 16 refused of 16
set_khan_x845b8e3691da5a26: 11 converted (0 waiting), 13 refused of 24
set_khan_xe18536f6: 0 converted (0 waiting), 20 refused of 20
set_khan_x052a6199b7f4fa09: 0 converted (0 waiting), 12 refused of 12 (stopped)
set_khan_x69d3089d4911ddb9: 0 converted (0 waiting), 29 refused of 29
set_khan_x34e9fee8: 0 converted (0 waiting), 21 refused of 21
set_khan_x2e507f9b: 0 converted (0 waiting), 29 refused of 29
set_khan_x0ed34f8c: 0 converted (0 waiting), 15 refused of 15
set_khan_xe36c6467: 0 converted (0 waiting), 21 refused of 21
set_khan_x9e90bef6: 0 converted (0 waiting), 18 refused of 18
set_khan_xdca7f2c8: 0 converted (0 waiting), 21 refused of 21
set_khan_x0b3d72ae: 0 converted (0 waiting), 18 refused of 18
set_khan_x364893d7: 0 converted (0 waiting), 21 refused of 21
set_khan_x0287481a: 0 converted (0 waiting), 21 refused of 21
set_khan_x3d19c3fa: 0 converted (0 waiting), 22 refused of 22
set_khan_458495355: 0 converted (0 waiting), 12 refused of 12
set_khan_458428444: 0 converted (0 waiting), 27 refused of 27
set_khan_xff40924e: 0 converted (0 waiting), 25 refused of 25
set_khan_458405550: 1 converted (0 waiting), 14 refused of 15
set_khan_x45cb04388a105b56: 0 converted (0 waiting), 12 refused of 12
set_khan_x4a62e72a: 0 converted (0 waiting), 18 refused of 18
set_khan_x28133d70e21ac355: 0 converted (0 waiting), 16 refused of 16
```
