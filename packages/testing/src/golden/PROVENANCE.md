# The golden judge corpus: where it comes from

`golden.json` is the playground's family golden test, resolved. `packages/core`'s
`src/families/golden.test.ts` holds the ported judges to it. Synced by `dl-e8ov.2.32.4`.

## Source

- Repo: the playground's source repo, where it lived before it was ported here, commit
  `e84829978511797e83f969116fa4533d5a9edbf5` (2026-10-27).
- Test: `frontend/src/playground/sim/familyGolden.test.ts`, both of its suites:
  - `golden`: every row of `sim/golden.json` (the Python grader's verdicts, `dl-w3.37.8`) for every
    built lesson with exercises, turned into a family question by `playground/adapt.ts` `toFamily`
    (with the lesson's `plannedProducts` as a times-table key's `recent`) and into a family value by
    `valueToFamily`;
  - `scenario`: every candidate lesson's scenarios with a value, localized, with a broken value's
    missing class written as `other_wrong`, as that test does.

## What was left out

- 198 golden rows whose value no family value can stand for (`valueToFamily` returns null). The
  playground's test skips the same rows.
- The lesson `lettered-*-style` (4 questions, 36 cases): its id and image paths carry a learner's
  name, and its pictures are contest tasks. `lettered-beads-core-loop` still covers
  `lettered_choice`.

## What is in it

- 66 questions, each `{question_type, family, data, key}`: 27 choose, 19 enter, 9 slots,
  6 sequence and 5 place. No group question has a golden row.
- 1233 cases: 1208 golden and 25 scenario. 271 of them carry `{invalid: x}`, the adapter's stand-in
  for a value the page cannot commit (a string where a number goes). The `/api/v1` wire refuses
  those values, so the test checks that they fail the contracts' value schema and that a judge
  handed one anyway calls it `other_wrong`.

## How to sync it again

The export walks the same rows as `familyGolden.test.ts` and checks every scenario against the
playground's own `judge()` before writing. Put this file in the playground's source repo as
`frontend/src/playground/sim/zzCoreGoldenExport.test.ts`, run it, then delete it:

```sh
GOLDEN_OUT=/tmp/golden-raw.json npx vitest run src/playground/sim/zzCoreGoldenExport.test.ts
```

```ts
import { writeFileSync } from 'node:fs'
import { it } from 'vitest'
import { candidateTypes } from '../candidates'
import { judge } from '@/families/judge'
import { toFamily, valueToFamily } from '../adapt'
import golden from './golden.json'
import { plannedProducts } from './judge'
import { localize } from './localize'
import { builtLessons } from './samples'

interface Row { lesson: string; step: string; value: unknown; correct: boolean; mistake_class: string | null }

it('exports the family golden corpus', () => {
    const questions: Record<string, unknown> = {}
    const cases: unknown[] = []
    let skipped = 0
    const put = (id: string, spec: { question_type: string; family: string; data: unknown; key: unknown }) => {
        questions[id] ??= { question_type: spec.question_type, family: spec.family, data: spec.data, key: spec.key }
    }
    for (const lesson of builtLessons.filter((l) => l.steps.some((s) => s.key !== null))) {
        const recent = plannedProducts(lesson)
        for (const row of (golden as Row[]).filter((r) => r.lesson === lesson.id)) {
            const step = lesson.steps.find((s) => s.page.id === row.step)!
            const spec = toFamily(step, recent)
            const value = valueToFamily(step.page.block, step.page.data as Record<string, unknown>, row.value)
            if (value === null) { skipped++; continue }
            const id = `${lesson.id}/${row.step}`
            put(id, spec)
            cases.push({ source: 'golden', question: id, value, correct: row.correct, mistake_class: row.mistake_class })
        }
    }
    const lessons = Object.values(candidateTypes).filter((t) => t.familyAdapter !== false).flatMap((t) => t.lessons.map((l) => localize(l)))
    for (const lesson of lessons) {
        for (const step of lesson.steps.filter((s) => s.key !== null)) {
            const spec = toFamily(step)
            const id = `${lesson.id}/${step.page.id}`
            for (const s of step.scenarios.filter((x) => x.value !== undefined)) {
                const value = valueToFamily(step.page.block, step.page.data as Record<string, unknown>, s.value)
                put(id, spec)
                const correct = s.outcome === 'correct'
                const mistake_class = s.outcome === 'incorrect' && s.mistake_class === null ? 'other_wrong' : s.mistake_class
                const v = judge(spec, value)
                if (v.correct !== correct || v.mistake_class !== mistake_class) throw new Error(`disagrees: ${id}`)
                cases.push({ source: 'scenario', question: id, value, correct, mistake_class })
            }
        }
    }
    writeFileSync(process.env.GOLDEN_OUT!, JSON.stringify({ questions, cases, skipped }, null, 1))
})
```

Then drop the learner-named lesson's questions and cases, sort the questions by id, and check the
file for a family member's name before committing.
