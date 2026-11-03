/**
 * Experiment E7 (dl-5ssh.90.53.9), committed checks: the fixtures are complete and honestly
 * labelled, the code-only judge says what the product says today, and the committed model
 * judgements cover every answer and keep the child's feedback short and kind.
 * Re-run the models with e7-judge.ts (never in CI), then e7-report.ts for the docs JSON.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { judge } from "../../../../core/src/index.ts";
import { codeJudge, type E7Fixtures, type ModelJudgement, overallOf, score } from "./e7-judge.ts";
import { buildReport, type JudgementsFile } from "./e7-report.ts";
import { wordCount } from "./model.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(readFileSync(join(here, "e7.fixtures.json"), "utf8")) as E7Fixtures;

const run = JSON.parse(readFileSync(join(here, "e7.judgements.json"), "utf8")) as JudgementsFile & {
  spark: { judgements: ModelJudgement[] };
  wonder: { judgements: ModelJudgement[] };
};

describe("E7 fixtures: 8 tasks, criteria first, 10 hand-labelled answers each", () => {
  it("has 8 tasks and 80 answers", () => {
    expect(fixtures.tasks).toHaveLength(8);
    expect(fixtures.tasks.flatMap((t) => t.answers)).toHaveLength(80);
  });

  it("labels every criterion of every answer, and covers the hard kinds", () => {
    const kinds = new Set<string>();
    for (const task of fixtures.tasks) {
      expect(task.criteria.length).toBeGreaterThanOrEqual(2);
      for (const c of task.criteria) expect(c.cite.length).toBeGreaterThan(0);
      for (const answer of task.answers) {
        kinds.add(answer.kind);
        expect(Object.keys(answer.labels).sort()).toEqual(task.criteria.map((c) => c.id).sort());
      }
    }
    for (const kind of ["right", "partly", "right-misspelt", "off-topic", "too-short"])
      expect([...kinds].some((k) => k.startsWith(kind))).toBe(true);
  });

  it("has hand-labelled correct answers a spelling slip does not spoil", () => {
    const misspelt = fixtures.tasks.flatMap((t) =>
      t.answers.filter((a) => a.kind === "right-misspelt"),
    );
    expect(misspelt.length).toBeGreaterThanOrEqual(6);
    for (const a of misspelt) expect(overallOf(a.labels)).toBe("correct");
  });
});

describe("E7 code-only judge: what code decides today, without a model", () => {
  it("the core judge refuses explain, kept for later without a verdict", () => {
    const task = fixtures.tasks[0];
    if (!task) throw new Error("no task");
    expect(() =>
      judge(
        {
          family: "explain",
          question_type: "explain_typed",
          data: { input: "text", min_words: task.min_words },
          key: { criteria: task.criteria, criteria_version: fixtures.criteria_version },
        } as never,
        { text: "x" },
      ),
    ).toThrow(/no code judge/);
  });

  it("code asks for more only on empty or short answers, and judges nothing else", () => {
    expect(run.code).toHaveLength(80);
    for (const row of run.code) {
      const task = fixtures.tasks.find((t) => t.id === row.task);
      const answer = task?.answers.find((a) => a.id === row.answer);
      if (!task || !answer) throw new Error(`missing ${row.task}/${row.answer}`);
      expect(row.verdict).toBe(codeJudge(task, answer.text));
      if (row.verdict === "explain_more")
        expect(wordCount(answer.text)).toBeLessThan(task.min_words + 1);
    }
    const more = run.code.filter((c) => c.verdict === "explain_more");
    expect(more.length).toBeGreaterThan(0);
    expect(more.length).toBeLessThan(20);
  });
});

describe("E7 model judges: the committed run", () => {
  for (const [name, judgements] of [
    ["spark", run.spark.judgements],
    ["wonder", run.wonder.judgements],
  ] as const) {
    it(`${name} judged all 80 answers, with cited reasons and kind feedback`, () => {
      expect(judgements).toHaveLength(80);
      const s = score(fixtures, judgements);
      expect(s.overall_agreement).toBeGreaterThan(0.85);
      expect(s.false_wrong).toBeLessThanOrEqual(2);
      expect(s.reasons_with_words).toBe(s.criteria_total);
      expect(s.feedback_bare_wrong).toBe(0);
      expect(s.feedback_long).toBe(0);
      for (const j of judgements) {
        expect(j.feedback.length).toBeGreaterThan(0);
        expect(wordCount(j.feedback)).toBeLessThanOrEqual(30);
      }
    });
  }

  it("the docs report carries the same scores and both cost sources", () => {
    const report = buildReport(fixtures, run, "test");
    expect(report.id).toBe("e7");
    expect(report.status).toBe("done");
    expect(report.calls).toBe(88);
    expect(report.usd).toBeGreaterThan(0);
    expect(report.detail.judges.spark.score.overall_agreement).toBeGreaterThan(0.85);
    expect(report.detail.judges.wonder.tokens.input).toBeGreaterThan(0);
    expect(report.detail.judges.code.verdicts.unjudged).toBe(70);
  });
});
