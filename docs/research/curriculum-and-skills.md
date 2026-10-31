# Where does the shared curriculum live, how are lessons tagged with it, and how do skills that belong to each pod work?

Issue: `dl-e8ov.5.39`, under the goals-loop epic `dl-e8ov.5`

## The answer in 5 lines

1. The curriculum lives in Postgres, in `curriculum` and `topic` tables in Jadwigo's pod that every pod can read. It is seeded from versioned files in `packages/core/src/curriculum/`, first the 2017 podstawa programowa for klasy 1-3, edukacja matematyczna, with its 26 outcomes as topics under their official codes.
2. Skills sit in a `skill` table keyed by pod and code. Jadwigo's pod holds the catalogue every pod may copy from: the bank's skill ids, `proposed:` prefix stripped. A pod gets its own copy on first use, may edit it, and may define skills of its own.
3. Lessons and question sets are tagged by skill code, and through each skill's topic, by curriculum. A lesson's tags are derived from its questions. Tags are labels for planning and reporting, never search filters.
4. Mastery stays keyed by the code in `lesson_question.skill_ids`. A pod's edit keeps the code, so the history stays. An alias or a draft mapped to the catalogue resolves to one skill, and an unknown code is kept under its own string.
5. 5 questions stay with the owner, listed under "What this means for jadwigo". Most of the build is carried by the wave-1 lanes. 4 follow-ups are new or rewritten: the 2026 podstawa, a review workflow, the draft mapping (`dl-liwi.27`) and a drift check against the bank.

## Method

Read:

- the decisions under "Decisions in force", as files under `~/projects/medallion-context/`;
- `docs/research/goals-and-mastery.md`, its records and owner question 1;
- the wave-1 plan approved on 2026-10-30, its sections on records, the curriculum seed and the brain mapping;
- in the bank checkout `~/projects/jadwigo-bank` at commit `8a1d5fb`: the podstawa file and its README, every `sets/**/*.json`, `schemas/set.schema.json`, the docstring of `tools/skill_map.py`, `tools/enrich_common.py` and `tools/enrich_sets.py`;
- in `~/projects/dl-brain` at commit `671cce41`, the skill pages under `curriculum/math/`;
- in this repo: `packages/contracts/src/records.ts`, the v0 migration, `packages/lesson-import/src/lesson-file.ts`, the lessons in `packages/testing/src/lessons/`, `GLOSSARY.md` and the `db-seed` target in the `Makefile`.

Counted with short Python scripts that read the JSON files. Not done: no SQL was run, no search was sent to the bank, no model was called, and no learner's data was read.

The 2026 podstawa was not read. This note relies only on the bank file's own line about it.

## Decisions in force

- `jadwigo-hackathon/decisions/2026-10-29-the-curriculum-is-shared-across-pods-and-tags-every-lesson-skill`:
  - lessons are tagged with an up-to-date curriculum;
  - the curriculum is structured and shared across every pod and learner it fits;
  - skills live within the pod;
  - Jadwigo may offer skill templates, and each pod may adjust them or define its own.
- `jadwigo-hackathon/decisions/2026-10-30-the-shared-curriculum-lives-in-shared-postgres-tables-seeded-fro`, the owner's answer this note records: shared Postgres tables seeded from versioned files in the repo, the podstawa outcomes as topics, the bank's skill ids as the catalogue.
- `jadwigo-hackathon/decisions/2026-10-29-one-goal-s-curriculum-tags-may-span-several-subjects-and-the-pla`: one goal's tags may span subjects, and the planner splits searches by subject.
- `jadwigo-ai-workflows/decisions/2026-10-29-a-drafted-lesson-s-skill-ids-drop-the-bank-s-proposed-prefix-dl`: a lesson's skill ids are the bank's with `proposed:` stripped, and `SkillId` stays lowercase words joined by dots.
- `jadwigo-question-bank/decisions/2026-10-28-the-default-search-arm-is-c-keyword-search-over-every-language-p`: skills and curriculum tags are not search filters. Hard filters left 162 of 215 needs with 0 candidates.
- `david-learns/decisions/2026-10-22-goals-come-first-and-the-curriculum-is-a-set-of-tags-jadwigo-sug`: a goal carries 0 or more curriculum tags and works with none; school context sits on the learner; drafts are private to the pod until coverage arrives; mastery is keyed by skill.
- `david-learns/decisions/2026-10-22-curriculum-research-givens-draft-skills-shared-without-origin-sc`: a draft reaches other pods only as a new reviewed skill with no trace of its pod, and school context is inferred, never asked.
- `jadwigo-hackathon/notes/direction-curriculum-and-topics-live-with-the-question-bank-and` is the owner's earlier direction, "somewhere in the question bank". The decision of 2026-10-30 settles where for the first wave: Postgres, seeded from the repo. The bank keeps tagging its sets with the same ids, so the direction's tagging half stands.

## What exists today

### The curriculum: 26 outcomes, one file

`~/projects/jadwigo-bank/data/curriculum/pl/podstawa-2017-klasy-1-3-matematyka.json` holds:

- `source`: "Rozporządzenie MEN z 14 lutego 2017 r., Dz.U. 2017 poz. 356, załącznik 2, I etap edukacyjny: klasy I-III, II. Edukacja matematyczna";
- `url`: https://api.sejm.gov.pl/eli/acts/DU/2017/356/text.pdf;
- `applies_to`: "klasy 2 and 3 in 2026/27 (klasy 1 and 4 move to Dz.U. 2026 poz. 378)";
- `level`: "outcomes reached by the end of klasa 3, not split per klasa";
- `outcomes`: 26 entries, each with an `id` (`II.1.1` to `II.6.9`), the law's `text` and an `area_title`.

The ids fall into 6 areas:

| Area | Outcomes |
| --- | --- |
| `II.1` | 3 |
| `II.2` | 4 |
| `II.3` | 4 |
| `II.4` | 2 |
| `II.5` | 4 |
| `II.6` | 9 |

The bank's README calls it public law text, which is why the bank commits it. It was copied from david-learns on 2026-10-29 (`dl-n9fr.48`).

### The bank's skill ids: 138, all made by a model

Counted over `sets/**/set_*.json` (143 sets; `sets/khan/math/grade-3/index.json` is a JSON list and was skipped):

| | Distinct ids |
| --- | --- |
| all `enrichment.skill_ids.value` | 138 |
| with the `proposed:` prefix | 120 |
| without it | 18 |

- **The 18 without a prefix** are 13 multiplication ids and 5 alfik ids:
  - `maths.multiplication.row-1` to `row-10`;
  - `maths.multiplication.mistakes`;
  - `maths.multiplication.strategy-commutativity` and `strategy-doubling`;
  - `maths.alfik.clocks-and-calendars`, `number-puzzles`, `reading-the-task`, `shapes-and-space` and `word-problems`.
- **What "no prefix" means.** `tools/enrich_common.py` keeps an id bare only when a dl-brain skill page under `curriculum/math` names it. Every other id the model writes becomes `proposed:maths.<area>.<skill>`. No stripped id collides with a bare one.
- **None is reviewed.** All 143 sets carry `"made_by": "model:muse-spark-1.3-contributor"` and `"reviewed": false` on `skill_ids`. `schemas/set.schema.json` requires both fields on every filled enrichment field. The 18 dl-brain pages behind the bare ids each still carry "Draft: written by a model, not yet read by a parent."
- **This differs from the decision of 2026-10-30,** which counts "13 reviewed" and "125 model-proposed". In the files read here, the 18 bare ids are *known* ids, not reviewed ones. Their status in the seed is owner question 5.
- **The areas of the 120 proposed ids,** most common first: fractions 23, division 21, multiplication 18, geometry 13, data 9, measurement 7, subtraction 6, addition 5.

### The sets' curriculum tags: 2 curricula already

`enrichment.curriculum_tags.value` holds 44 distinct tags:

- 18 are `pl-2017:II.x.y`, every one an outcome in the file above;
- 26 are `ccss:` Common Core codes, such as `ccss:3.OA.C.7`;
- 8 of the 26 podstawa outcomes have no set tagged with them.

The most used tags are `pl-2017:II.3.1` (71 sets) and `pl-2017:II.3.3` (65 sets).

### This repo: one code format, 3 dialects

- **The code format.** `packages/contracts/src/records.ts` defines `SkillId` as the regex `^[a-z]+(\.[a-z0-9-]+)+$`, unbranded. Its comment says: "A curriculum table comes later, keyed by the same strings." The v0 migration enforces the same pattern in `app.skill_ids_valid` on `lesson.skill_ids` and `lesson_question.skill_ids` (`text[]`, no foreign key), with a GIN index `lesson_question_skill_ids`. A `proposed:` id fails the pattern because of its colon, which is why the prefix is stripped.
- **The playground's dialect.** `skillIdOf` in `packages/lesson-import/src/lesson-file.ts` turns a slash into a dot, `ł` into `l`, and drops marks. A brain path such as `curriculum/math/multiplication/row-2` becomes `curriculum.math.multiplication.row-2`.
- **The fixture lessons in `packages/testing/src/lessons/`** carry 27 distinct codes in 3 dialects:

| Dialect | Distinct codes | Example |
| --- | --- | --- |
| short facts | 4 | `maths.mul.3x4`, `maths.mul.equal-groups` |
| brain paths | 11 | `curriculum/math/multiplication/strategy-doubling` |
| pod drafts | 12 | `draft.ortografia.proof-word` |

- **The bank already resolves the brain-path dialect.** `tools/enrich_common.py` guesses `"maths." + sid.replace("/", ".").removeprefix("curriculum.math.")`, which turns `curriculum/math/multiplication/row-7` into the canonical `maths.multiplication.row-7`.
- **The glossary.** `GLOSSARY.md` defines a skill as "the smallest thing a learner gets a level on, such as `maths.mul.7x8`. Reviewed or draft". That example is the short-facts dialect, and the definition has no `proposed` status yet.

### The can-do lines: one per knowledge component, model-written

- **dl-brain's skill pages** have a "What is learned" table, one row per knowledge component. For example, `curriculum/math/alfik/word-problems.md` has the columns id, Component, "Umiem… (the child's line)" and Checked by.
- **The bank's sets** carry an `enrichment.can_do` per set, with a parent-register line in `pl` and `en` ("Dziecko potrafi…"), also `reviewed: false`.
- **What the child sees.** Only reached "Umiem…" lines, and the voice says "Już umiesz…". This is `david-learns/decisions/2026-10-11-can-do-lines-are-earned-per-knowledge-component`, cited in `docs/research/learning-data-model.md` in david-learns.

## The design

### Records

These are the plan's records, the ones step 0's migration builds. Shared rows live in Jadwigo's pod (`FEATURED_POD_ID`), and a `shared_read` select policy lets every pod read them. Every row keeps a `pod_id` (`packages/contracts/RULES.md` rule 12).

| Record | Columns | What it is for |
| --- | --- | --- |
| `curriculum` (`crc_`) | `id`, `pod_id`, `code`, `name`, `country`, `version`, `language`, `source_url`, `created_at` | One real curriculum. `code` is the bank's tag prefix, `pl-2017`, so a set's tag `pl-2017:II.3.3` names a topic without a lookup table. |
| `topic` (`top_`) | `id`, `pod_id`, `curriculum_id`, `code`, `area`, `text`, `created_at` | One outcome, such as `II.3.3`, with the law's text. It has no order. |
| `skill`, keyed `(pod_id, code)` | `pod_id`, `code`, `topic_id`, `kind` (`accuracy` or `speed`), `status` (`reviewed`, `proposed`, `draft`, `retired`), `can_do`, `aliases`, `prerequisites`, `source`, `created_at` | In Jadwigo's pod, the catalogue. In a family's pod, a copy or the pod's own skill. |
| `goal_skill`, `goal_topic` | `pod_id`, `goal_id`, then `skill_code` or `topic_id` | A goal's skills, and the curriculum tags the parent confirmed. |
| `learner` | adds `country`, `curriculum_id`, `school_grade`, `school_language`, all nullable | The school context that says which curriculum fits the learner. |

- **`can_do`** is `{pl: {child, parent, reviewed}}`, nullable:
  - `child` is the "Umiem…" line;
  - `parent` is the adult register;
  - `reviewed` stays false until a person has read both.

  A skill holds one line per language. dl-brain's lines per knowledge component stay in the bank's and brain's pages for now.
- **A skill has no uuid and no `skl_` prefix.** The code already is the id that `lesson_question.skill_ids` holds, and a prefix would collide with `SkillId`.

### How a skill moves from the catalogue into a pod

```
Jadwigo's pod (catalogue)                      a family's pod
maths.multiplication.row-7  proposed  ─copy─▶  maths.multiplication.row-7  proposed (editable)
                                                draft.ortografia.proof-word draft    (the pod's own)
```

1. **The copy.** The first time a pod uses a code, the store copies the catalogue row into the pod (`ensureSkills(pod, codes)` in the plan's Store). That happens when a goal names the code or when the first evidence carries it. A code the catalogue does not hold becomes a `draft` row in the pod.
2. **The pod's row wins for that pod.** A parent, or the goal-setting workflow with the parent's yes, may change its wording, can-do lines, prerequisites or kind. The code stays, so the evidence stays.
3. **A pod's own skill** is a `draft` under a code of its own, such as `draft.ortografia.proof-word`. It is invisible to every other pod (`david-learns/decisions/2026-10-22-curriculum-research-givens-draft-skills-shared-without-origin-sc`).
4. **Back to the catalogue.** A draft or an edited copy reaches the catalogue only as a new `reviewed` row in Jadwigo's pod. That row keeps the wording and a cited source. It never keeps the pod, the learner or the homework it came from. Who reviews is owner question 2. Whether an edited copy is offered back at all is owner question 3.

**No option here reads a family's data outside its pod.** The copy flows only from Jadwigo's pod into a family's pod. The way back is a new row with no trace of its origin. That clears the issue's "stop if".

### Mastery keyed by code when skills are per pod

- **The evidence.** It is the plan's `learner_skill_evidence` view: one row per judged try and per code in the asked question's `skill_ids`. The fold groups those rows by **canonical** code. `resolveSkill(code, skills)` maps a code to the skill whose `code` or `aliases` contain it. It looks among the pod's rows first, then the catalogue. A code with no match stays itself.
- **A pod's edit** changes the row and never the code, so levels and history carry on.
- **Aliases** absorb the older dialects. `maths.multiplication.row-7` lists `curriculum.math.multiplication.row-7`, so fixture lessons and bank-drawn lessons add up to one level. The 4 short-fact codes such as `maths.mul.3x4` name one fact, not a row. Whether one becomes an alias or stays its own skill is the core lane's call in `skills.json`.
- **A draft mapped to a catalogue skill** gets the draft's code as an alias on the pod's copy. Its evidence then counts toward the catalogue skill, with no evidence row rewritten. That is how "mastery carries over" from the goals-come-first decision is stored. The proposing and reviewing is `dl-liwi.27`.
- **An unknown code** keeps its evidence under its own string. When a skill with that code, or with it as an alias, appears later, its history is already there.

### Tagging lessons and question sets

- **A question set** is tagged in the bank, as today: `enrichment.skill_ids` (stripped of `proposed:` on the way in) and `enrichment.curriculum_tags` (`pl-2017:II.3.3`). The bank keeps those ids, so the catalogue and the bank share one vocabulary.
- **A lesson's skills** are the union of its questions' `skill_ids`, as `lesson.skill_ids` already is. Its topics are derived from those skills' `topic_id`, so there is no `lesson_topic` table. A lesson is tagged with the up-to-date curriculum because its skills are.
- **A goal** carries `goal_topic` rows, the tags the parent confirmed, and `goal_skill` rows.
- **Tags are labels, never filters.** The planner may put a skill's or topic's words into a need, or pass ids as a bounded boost (`tools/skill_map.py`'s `boost` mode). It never hard-filters, because filters left 162 of 215 needs with 0 candidates (`tools/skill_map.py` docstring and the search-arm decision).

### Which pods and learners a curriculum fits

- **Fit is per learner, not per pod.** 2 children in one pod may go to different schools.
- A learner whose inferred `curriculum_id` names `pl-2017` gets that curriculum's topics suggested for a goal, and the catalogue skills filed under them.
- A learner with no school context gets no tag suggestions, and their goals work without tags.
- `school_grade` narrows the suggestions only where a curriculum splits by grade. The 2017 file says its outcomes are "reached by the end of klasa 3, not split per klasa", so for now it does not narrow anything.

### How the catalogue stays current

1. **The data files.** They are versioned in `packages/core/src/curriculum/`:
   - `podstawa-2017-klasy-1-3-matematyka.json`, copied from the bank with its `source`, `url` and `pulled_at`;
   - `skills.json`.

   A change is a PR. A test checks that every `skill_ids` code in the testing lessons and bank fixtures resolves.
2. **Loading.** `make db-seed` loads the files into Jadwigo's pod beside the lesson seed (`packages/lesson-import/src/seed.ts`). Like that seed, it is safe to rerun.
3. **New bank ids.** The bank's enrichment can add a `proposed:` id at any time. Until `skills.json` holds it, a lesson carrying it keeps its evidence under its own string. A drift check, the 4th follow-up, lists bank ids that the catalogue lacks.
4. **Nothing is deleted.** A skill that leaves the curriculum becomes `retired`, because evidence is keyed by its code.
5. **A new curriculum version** is the 2026 podstawa for klasy 1 and 4. How it is stored is owner question 1.

## What this means for jadwigo

- **Carried by the wave-1 lanes under `dl-e8ov.5`, not new issues:**
  - the `curriculum`, `topic` and `skill` tables, `shared_read`, and the `Curriculum`, `Topic` and `Skill` contracts: step 0, `dl-e8ov.5.1` rewritten;
  - `packages/core/src/curriculum/` data, `catalogue()` and `resolveSkill`: the core lane, `dl-liwi.15` rewritten;
  - `ensureSkills` and the seed writer under `make db-seed`: the store-api lane;
  - pgTAP for `shared_read` and pod isolation on `skill`: the db lane.
- **New or rewritten follow-ups,** in the outcome block:
  - the 2026 podstawa load;
  - a review workflow for proposed skills;
  - `dl-liwi.27` rewritten against the `skill` table;
  - a drift check between the bank's ids and `skills.json`.
- **Glossary.** `GLOSSARY.md`'s "skill" entry should name the 4 statuses and use a canonical example (`maths.multiplication.row-7`). The lead's step 0 can carry that.
- **No option here moves learner data across pods.** Nothing in this design is a one-way door beyond step 0's migration and contract snapshots, which the step-0 PR names.

### The owner's questions

The outcome block lists the options only, as the research check requires.

1. **Versioning when the 2026 podstawa (Dz.U. 2026 poz. 378) replaces 2017 for klasy 1 and 4.** Klasy 2 and 3 stay on 2017 in 2026/27, per the bank file, so both are live at once.
2. **Who reviews a proposed skill and its can-do lines.** 120 ids are proposed and 18 are known but unread. A child sees the can-do lines.
3. **Whether a pod's edited copy of a shared skill is ever offered back to the catalogue.**
4. **Whether topics belong to one curriculum only, or are also shared across curricula.** The sets already carry 26 Common Core tags beside the podstawa ones (`dl-liwi.29`).
5. **The status of the 18 known ids in the seed,** given that every one is model-written and none is marked reviewed.

```json jadwigo-outcome
{
  "issue": "dl-e8ov.5.39",
  "question": "Where does the shared, structured curriculum live and stay current, how are lessons and question sets tagged with it, which pods it fits, and how do pod-owned skills seeded from templates work with mastery keyed by skill code?",
  "answer": "Curriculum and topic tables in Jadwigo's pod, readable by every pod and seeded by make db-seed from versioned files in packages/core/src/curriculum (the 2017 podstawa klasy 1-3 maths, 26 outcomes as topics), plus a skill table keyed by (pod_id, code) whose Jadwigo rows are the catalogue of the bank's ids and whose pod rows are editable copies made on first use or the pod's own drafts; lessons and sets are tagged by skill code and, through each skill's topic, by curriculum, as labels and never search filters; fit is per learner by inferred school context; mastery stays keyed by the evidence's code, resolved through the pod's row, then the catalogue, aliases and draft mappings, with unknown codes kept under their own string.",
  "status": "answered",
  "sources": [
    "https://api.sejm.gov.pl/eli/acts/DU/2017/356/text.pdf",
    "jadwigo-bank@8a1d5fb data/curriculum/pl/podstawa-2017-klasy-1-3-matematyka.json",
    "jadwigo-bank@8a1d5fb data/curriculum/pl/README.md",
    "jadwigo-bank@8a1d5fb sets/**/set_*.json (enrichment.skill_ids, enrichment.curriculum_tags)",
    "jadwigo-bank@8a1d5fb schemas/set.schema.json",
    "jadwigo-bank@8a1d5fb tools/skill_map.py",
    "jadwigo-bank@8a1d5fb tools/enrich_common.py",
    "dl-brain@671cce41 curriculum/math/multiplication/tree.md",
    "dl-brain@671cce41 curriculum/math/alfik/word-problems.md",
    "packages/contracts/src/records.ts",
    "supabase/migrations/20261027120000_core_v0.sql",
    "packages/lesson-import/src/lesson-file.ts",
    "packages/testing/src/lessons/",
    "GLOSSARY.md",
    "docs/research/goals-and-mastery.md",
    "jadwigo-hackathon/decisions/2026-10-29-the-curriculum-is-shared-across-pods-and-tags-every-lesson-skill",
    "jadwigo-hackathon/decisions/2026-10-30-the-shared-curriculum-lives-in-shared-postgres-tables-seeded-fro",
    "jadwigo-hackathon/decisions/2026-10-29-one-goal-s-curriculum-tags-may-span-several-subjects-and-the-pla",
    "jadwigo-ai-workflows/decisions/2026-10-29-a-drafted-lesson-s-skill-ids-drop-the-bank-s-proposed-prefix-dl",
    "jadwigo-question-bank/decisions/2026-10-28-the-default-search-arm-is-c-keyword-search-over-every-language-p",
    "david-learns/decisions/2026-10-22-goals-come-first-and-the-curriculum-is-a-set-of-tags-jadwigo-sug",
    "david-learns/decisions/2026-10-22-curriculum-research-givens-draft-skills-shared-without-origin-sc",
    "jadwigo-hackathon/notes/direction-curriculum-and-topics-live-with-the-question-bank-and"
  ],
  "owner_decisions": [
    {
      "question": "How is the catalogue versioned when the 2026 podstawa (Dz.U. 2026 poz. 378) replaces 2017 for klasy 1 and 4 while klasy 2 and 3 stay on 2017?",
      "options": [
        "A second curriculum row (pl-2026) beside pl-2017 with its own topics; each learner points at one; skills keep their codes and are filed under a topic of either",
        "One curriculum per country whose version moves forward; 2017 topics are retired as each grade moves over",
        "Skills hold no topic of their own; a skill-to-topic link table per curriculum version files each skill under both"
      ]
    },
    {
      "question": "Who reviews a proposed skill and its can-do lines before it becomes reviewed?",
      "options": [
        "A parent in the pod that uses it, for that pod's copy only",
        "The owner, for the shared catalogue",
        "An AI reviewer workflow against a cited source, with a human reading a sample"
      ]
    },
    {
      "question": "Is a pod's edited copy of a shared skill ever offered back to the catalogue?",
      "options": [
        "Never: the edit stays in the pod",
        "Offered as a proposal through the review workflow, stripped of its pod, learner and homework",
        "Only when the pod opts in, then through the review workflow"
      ]
    },
    {
      "question": "Are topics per curriculum only, or also shared across curricula such as Common Core (dl-liwi.29)?",
      "options": [
        "Per curriculum only; an alignment between curricula is a separate link table",
        "One shared topic set that each curriculum's outcomes map into"
      ]
    },
    {
      "question": "What status do the 18 bank ids that dl-brain already names get in the seed, given that all are model-written and none is marked reviewed?",
      "options": [
        "reviewed, as the 2026-10-30 decision reads",
        "proposed, until a person reads each page and its can-do lines"
      ]
    }
  ],
  "proposed_issues": [
    {
      "title": "Carried by the wave-1 lanes under dl-e8ov.5 (not new): curriculum, topic and skill tables with shared_read, and their contracts",
      "scope": "Step 0, dl-e8ov.5.1 rewritten: the migration's curriculum, topic and skill (keyed pod_id, code) tables and the Curriculum, Topic and Skill records",
      "done_when": "the contracts naming test and make pgtap pass; a second pod reads the catalogue but not another pod's skills",
      "depends_on": [],
      "labels": ["project:jadwigo-platform", "wave:dl-e8ov.5-1"]
    },
    {
      "title": "Carried by the wave-1 lanes under dl-e8ov.5 (not new): the curriculum seed files, catalogue() and resolveSkill",
      "scope": "Core lane, dl-liwi.15 rewritten: packages/core/src/curriculum/ with the 2017 podstawa file and skills.json (the bank's 138 ids stripped, aliases for the fixture dialects); the seed writer under make db-seed is the store-api lane's",
      "done_when": "every skill_ids code in packages/testing lessons resolves in a core test, and make db-seed loads the catalogue twice with no change the second time",
      "depends_on": ["dl-e8ov.5.1"],
      "labels": ["project:jadwigo-learner-knowledge", "wave:dl-e8ov.5-1"]
    },
    {
      "title": "Load the 2026 podstawa programowa (Dz.U. 2026 poz. 378) for klasa 1 maths as a curriculum with its outcomes as topics",
      "scope": "Pull the act's edukacja matematyczna outcomes into packages/core/src/curriculum/ with source, url and pulled_at, stored as the owner's versioning answer says; tell the bank so its curriculum_tags can name the new code",
      "done_when": "make db-seed loads both curricula, and a learner pointed at each gets that curriculum's topics",
      "depends_on": ["owner question 1 of docs/research/curriculum-and-skills.md"],
      "labels": ["project:jadwigo-learner-knowledge"]
    },
    {
      "title": "Review workflow for proposed skills: wording, topic, prerequisites and the child's and parent's can-do lines, to reviewed",
      "scope": "workflows/jadwigo-skill-review and the verb it calls, by whoever the owner names as reviewer; a promoted draft carries no pod, learner or homework",
      "done_when": "an eval reviews 10 proposed catalogue skills with a cited source each, and none of the outputs names a pod or learner",
      "depends_on": ["owner question 2 of docs/research/curriculum-and-skills.md"],
      "labels": ["project:jadwigo-ai-workflows"]
    },
    {
      "title": "Rewrite dl-liwi.27 against the skill table: mapping a pod's draft to a catalogue skill adds the draft's code as an alias on the pod's copy",
      "scope": "dl-liwi.27 in place: propose, review, apply (alias on the pod's row), recompute mastery, revert (remove the alias); no evidence row rewritten",
      "done_when": "a core test shows a draft's evidence counting toward the catalogue skill after mapping and back after revert",
      "depends_on": ["dl-liwi.15"],
      "labels": ["project:jadwigo-learner-knowledge"]
    },
    {
      "title": "Drift check: bank skill ids and curriculum tags that the catalogue does not hold",
      "scope": "A tools/ or make check step that reads the bank's distinct enrichment.skill_ids (prefix stripped) and pl-2017 tags and lists those missing from packages/core/src/curriculum/",
      "done_when": "the check lists 0 missing on the seeded catalogue and names a planted unknown id",
      "depends_on": ["dl-liwi.15"],
      "labels": ["project:jadwigo-question-bank"]
    }
  ],
  "page_changes": [
    {
      "section": "docs/research/goals-and-mastery.md, The records (the curriculum, topic and skill rows) and owner question 1",
      "change": "skill is keyed (pod_id, code) with status reviewed, proposed, draft or retired, aliases and prerequisites, and no maps_to (a mapping is an alias); curriculum gains code and source_url; topic has code, area and text; owner question 1 is answered by jadwigo-hackathon/decisions/2026-10-30-the-shared-curriculum-lives-in-shared-postgres-tables-seeded-fro; point at docs/research/curriculum-and-skills.md"
    },
    {
      "section": "docs/workstreams/learner-knowledge.md, Open",
      "change": "Add one line for dl-e8ov.5.39's 5 owner questions: curriculum versioning for the 2026 podstawa, who reviews proposed skills, edited copies offered back, topics across curricula, the 18 known ids' seed status"
    }
  ]
}
```
