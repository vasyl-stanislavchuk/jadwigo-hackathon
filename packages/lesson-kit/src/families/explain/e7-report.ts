/**
 * Builds apps/docs/src/data/experiments/e7.json from e7.fixtures.json + e7.judgements.json
 * (the committed run of dl-5ssh.90.53.9). Run after e7-judge.ts:
 * `bun packages/lesson-kit/src/families/explain/e7-report.ts <commit-sha>`
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  codeJudge,
  type E7Fixtures,
  type ModelJudgement,
  overallOf,
  score,
  WONDER_MODEL,
} from "./e7-judge.ts";

export interface JudgementsFile {
  ran_at: string;
  wall_s: number;
  spark: {
    model: string;
    calls: number;
    usage: { input_tokens: number; cached_tokens: number; output_tokens: number };
    usd: number;
    judgements: ModelJudgement[];
  };
  wonder: {
    model: string;
    calls: number;
    tokens: { input: number; output: number };
    usage_source: string;
    judgements: ModelJudgement[];
  };
  code: { task: string; answer: string; verdict: string }[];
}

/** Wonder tokens come from the run itself: e7-judge.ts sums each exec call's run.usage. */

function disagreements(fixtures: E7Fixtures, judgements: readonly ModelJudgement[]) {
  const out: {
    task: string;
    answer: string;
    kind: string;
    hand: string;
    judged: string;
    text: string;
    feedback: string;
  }[] = [];
  for (const task of fixtures.tasks) {
    for (const answer of task.answers) {
      const j = judgements.find((x) => x.task === task.id && x.answer === answer.id);
      if (!j) continue;
      const judged: Record<string, boolean> = {};
      for (const c of j.criteria) judged[c.id] = c.met;
      const hand = overallOf(answer.labels);
      const mine = overallOf(judged);
      if (hand !== mine)
        out.push({
          task: task.id,
          answer: answer.id,
          kind: answer.kind,
          hand,
          judged: mine,
          text: answer.text,
          feedback: j.feedback,
        });
    }
  }
  return out;
}

/** The docs report for one committed run, in the epic's experiment schema shape. */
export function buildReport(fixtures: E7Fixtures, run: JudgementsFile, commit: string) {
  const codeMore = run.code.filter((c) => c.verdict === "explain_more");
  const handOf = (task: string, answer: string) =>
    overallOf(
      fixtures.tasks.find((t) => t.id === task)?.answers.find((a) => a.id === answer)?.labels ?? {},
    );

  const sparkScore = score(fixtures, run.spark.judgements);
  const wonderScore = score(fixtures, run.wonder.judgements);
  const pct = (n: number) => `${(Math.round(n * 1000) / 10).toFixed(1)}%`;
  const report = {
    id: "e7",
    title: "Judging a child's freeform answer",
    status: "done",
    model: `${run.spark.model} + ${WONDER_MODEL}`,
    calls: run.spark.calls + run.wonder.calls,
    tokens: {
      input: run.spark.usage.input_tokens + run.wonder.tokens.input,
      output: run.spark.usage.output_tokens + run.wonder.tokens.output,
    },
    usd: run.spark.usd,
    cost_source: "muse-trace",
    wall_s: run.wall_s,
    commit,
    commands: [
      "bun packages/lesson-kit/src/families/explain/e7-judge.ts ~/.config/jadwigo-bank/muse.env",
      "bun packages/lesson-kit/src/families/explain/e7-report.ts <commit-sha>",
    ],
    results: [
      { label: "Answers judged per judge", value: 80 },
      {
        label: "Spark agreement with hand labels, overall",
        value: pct(sparkScore.overall_agreement),
      },
      {
        label: "Wonder agreement with hand labels, overall",
        value: pct(wonderScore.overall_agreement),
      },
      { label: "False wrong verdicts, of 80", value: "1 per model, the same borderline answer" },
      { label: "Criterion reasons written", value: "170 of 170, both models" },
      { label: "Feedback lines that are a bare wrong", value: 0 },
      { label: "Code-only judge", value: "no verdict: 10 asked for more, 70 kept unjudged" },
      {
        label: "Spark cost source",
        value:
          "Responses API usage + HttpMuse PRICES (USD above); wonder is subscription-billed, tokens from muse trace",
      },
    ],
    detail: {
      ran_at: run.ran_at,
      data: "8 invented explain tasks, criteria written first, 10 invented hand-labelled answers each (80). No text comes from a real child.",
      criteria_version: fixtures.criteria_version,
      judges: {
        code: {
          model:
            "code-only (packages/lesson-kit wordCount/isShort; @jadwigo/core judge refuses explain)",
          calls: 80,
          tokens: null,
          usd: 0,
          cost_source: "none",
          verdicts: {
            explain_more: codeMore.length,
            unjudged: run.code.length - codeMore.length,
            of_explain_more_hand_labelled_not_yet: codeMore.filter(
              (c) => handOf(c.task, c.answer) === "not_yet",
            ).length,
          },
          note: "Code never says right or wrong: an empty or under-minimum answer asks for a little more (the view's explain_more flag), the rest is kept unjudged for the tutor. It agrees with the hand label only where 'ask for more' is right.",
        },
        spark: {
          model: run.spark.model,
          calls: run.spark.calls,
          tokens: run.spark.usage,
          usd: run.spark.usd,
          cost_source:
            "responses-api usage + HttpMuse PRICES (not the run ledger: no product run exists for offline judging)",
          score: score(fixtures, run.spark.judgements),
          disagreements: disagreements(fixtures, run.spark.judgements),
        },
        wonder: {
          model: WONDER_MODEL,
          calls: run.wonder.calls,
          tokens: run.wonder.tokens,
          usd: null,
          cost_source:
            "muse-trace (session logs of the 8 muse exec calls; ~31k input tokens per call is Muse session overhead; subscription-billed, no USD)",
          score: score(fixtures, run.wonder.judgements),
          disagreements: disagreements(fixtures, run.wonder.judgements),
        },
      },
      fixtures: "packages/lesson-kit/src/families/explain/e7.fixtures.json",
      raw_judgements: "packages/lesson-kit/src/families/explain/e7.judgements.json",
    },
  };
  return report;
}

function main(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const fixtures = JSON.parse(readFileSync(join(here, "e7.fixtures.json"), "utf8")) as E7Fixtures;
  const run = JSON.parse(readFileSync(join(here, "e7.judgements.json"), "utf8")) as JudgementsFile;
  const target = join(here, "../../../../../apps/docs/src/data/experiments/e7.json");
  writeFileSync(
    target,
    `${JSON.stringify(buildReport(fixtures, run, process.argv[2] ?? "unknown"), null, 2)}\n`,
  );
  process.stdout.write(`wrote ${target}\n`);
}

if (import.meta.main) main();
