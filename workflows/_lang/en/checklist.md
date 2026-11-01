# English review checklist

The reviewer (`workflows/jadwigo-lesson-review`) checks every English line a child or a parent
reads against these items. A line passes only when no item flags it. A flag names its item by
id, quotes the words that break it, and gives one reason. Only a line that passes is marked
`reviewed: true`, and only a reviewed line reaches a family.

The AI reviewer is the only English reader: no person reads samples before English goes live,
and parents flag what sounds wrong
(`jadwigo-question-bank/decisions/2026-11-01-english-text-is-checked-by-the-ai-reviewer-only-with-an-english`).
The items are the Polish checklist's
(`david-learns/decisions/2026-10-04-polish-lines-are-reviewed-by-an-ai-skill-against-a-cited-checkli`),
written for English rather than translated. Each flag carries one of MQM's categories, as
GEMBA-MQM uses them: accuracy, fluency, style, terminology, locale
([GEMBA-MQM, Kocmi and Federmann 2023](https://arxiv.org/abs/2310.13988)).

## Items

**en-1 English only.** The line is in English, apart from a quote of a child, which keeps its own
language and is marked as a quote. No Polish word, no code, no level name (`mastered`,
`proficient`).
Category: accuracy. Source: the language-confusion study, which found models drift out of the
target language ([Marchisio et al. 2024](https://arxiv.org/abs/2406.20052)).

**en-2 US English.** Spelling and words are American, to match the Khan Academy questions an
English lesson copies whole: `color`, `practice` (noun and verb), `math`, `favorite`,
`center`. Never `colour`, `practise`, `maths`.
Category: locale. Source: the owner's answer of 2026-11-01 (decision draft `dl-rok6`), and
Merriam-Webster as the spelling dictionary ([merriam-webster.com](https://www.merriam-webster.com/)).

**en-3 A nine-year-old's register.** A child's line is short, one idea per sentence, in
everyday words a child of 6 to 9 knows, in the active voice and the present tense, and speaks
to the child as `you`. A parent's line is plain and direct, and calls the child `your child`.
Category: style. Source: the Polish decision above ("a nine-year-old's register"), and the US
federal plain language guidance: active voice, present tense, short sentences, familiar words
([digital.gov, Writing for understanding](https://digital.gov/guides/plain-language/writing)).

**en-4 Grammar.** Agreement, articles (`a`, `an`, `the`), plurals after a number (`1 apple`,
`2 apples`), and tense are correct.
Category: fluency. Source: Merriam-Webster ([merriam-webster.com](https://www.merriam-webster.com/)).

**en-5 No gendered guess.** A line about the child uses `you`, or `your child` and `they` for a
parent, never `he` or `she` the run did not give.
Category: accuracy. Source: the Polish decision above ("the profile's grammatical form or neutral
phrasing"), and singular `they` as standard usage
([APA Style, singular "they"](https://apastyle.apa.org/style-grammar-guidelines/grammar/singular-they)).

**en-6 No pressure words.** No score, time or failure: no `score`, `points`, `percent`, `%`,
`hurry`, `quick!`, `time is running out`, `3 days left`, `fail`. Never a bare `wrong`,
`incorrect` or `no`; the line says what to try instead.
Category: style. Source: the Polish decision above ("no pressure words (score, time, failure)"),
and the house rule in `AGENTS.md` (text a child reads is never a bare "wrong").

**en-7 Warm, not gushing.** Praise is for what the child did and the evidence shows (`You counted
every row.`), never for being smart, and never after a miss (`Awesome!`). No task is called easy
(`easy`, `simple`, `just`, `obviously`).
Category: style. Source: the Polish decision above ("warm, not gushing"); praise for intelligence
lowers children's persistence after a miss, praise for effort does not
([Mueller and Dweck 1998](https://doi.org/10.1037/0022-3514.75.1.33)).

**en-8 Question text spoken exactly as written.** A line read aloud (`say`) states the same
question as the text on screen, with the same numbers and objects. A line never gives the
answer away.
Category: accuracy. Source: the Polish decision above ("question text spoken exactly as
written").

**en-9 The lesson's words and signs.** Math words and signs are the ones US grades 1 to 3 use,
and the question's own: `×` for times, `groups of`, `rows of`, `in all`, `÷` for division.
See `workflows/_lang/en/glossary.md`.
Category: terminology. Source: the Common Core State Standards for Mathematics, grade 3,
Operations and Algebraic Thinking ("interpret 5 × 7 as the total number of objects in 5 groups of
7 objects each", [3.OA.A.1](https://www.thecorestandards.org/Math/Content/3/OA/)), and
`workflows/_lang/en/glossary.md`.

**en-10 Punctuation and numbers.** Every sentence ends with `.`, `?` or `!`, and a question with
`?`. Counts and the question's numbers are digits (`18 questions`), except where the question
itself spells a number out. The decimal separator is a point (`2.5`), and thousands take a
comma (`1,200`).
Category: locale. Source: `workflows/jadwigo-lesson-compose/SKILL.md`, and US usage in the Common
Core standards ([thecorestandards.org](https://www.thecorestandards.org/Math/)).

**en-11 No private data.** No child's name or words outside a marked quote, no surname, school or
place a family could be found by.
Category: accuracy. Source: the house rule in `AGENTS.md` on real learner data, and draft
decision `dl-2uq1`.

## How a flag is written

```json
{"id": "<line id>", "verdict": "flag", "item": "en-2", "category": "locale",
 "quote": "colour", "reason": "Jadwigo writes US English: color."}
```

A pass is `{"id": "<line id>", "verdict": "pass"}`. A line with 2 faults gets one flag per item.
