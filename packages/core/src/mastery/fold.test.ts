import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { rank } from "./fold.ts";
import { type Answer, event, row } from "./golden.ts";
import { foldLearner, masteryOf } from "./index.ts";

const START = Date.parse("2026-09-01T00:00:00.000Z");
const HOUR = 3_600_000;

/**
 * The store's key on an answer: `attempt_answer` is unique on (attempt_id, seq, try_no)
 * (supabase/migrations/20261027120000_core_v0.sql), and the memory store refuses a second answer
 * to a try with AnswerConflict. A skip is try 1, as `answer` writes it. The evidence view repeats
 * an answer once per skill, so one skill never sees two rows with this key.
 */
function tryKey(r: Pick<Raw, "attempt" | "seq" | "try_no" | "outcome">): string {
  return `${r.attempt}#${r.seq}#${r.outcome === "skip" ? 1 : r.try_no}`;
}

/** A run of answers over a few weeks: tries right or wrong, with or without help, and skips. */
const answers = fc.uniqueArray(
  fc.record({
    attempt: fc.integer({ min: 1, max: 6 }),
    seq: fc.integer({ min: 1, max: 3 }),
    hours: fc.integer({ min: 0, max: 24 * 30 }),
    try_no: fc.integer({ min: 1, max: 2 }),
    outcome: fc.constantFrom("clean", "assisted", "miss", "skip"),
    mixed: fc.boolean(),
  }),
  { maxLength: 25, selector: tryKey },
);
interface Raw {
  attempt: number;
  seq: number;
  hours: number;
  try_no: number;
  outcome: string;
  mixed: boolean;
}

function answer(r: Raw): Answer {
  const at = new Date(START + r.hours * HOUR).toISOString();
  if (r.outcome === "skip")
    return { attempt: r.attempt, seq: r.seq, at, correct: null, skip: true };
  return {
    attempt: r.attempt,
    seq: r.seq,
    at,
    try_no: r.try_no,
    correct: r.outcome !== "miss",
    help: r.outcome === "assisted" ? 1 : 0,
    mixed: r.mixed,
  };
}

/** A new attempt after every answer in `raws`, on the next day. */
function after(raws: readonly Raw[], correct: boolean): Answer {
  const last = Math.max(0, ...raws.map((r) => r.hours));
  return {
    attempt: 99,
    at: new Date(START + (last + 24) * HOUR).toISOString(),
    correct,
    mixed: true,
  };
}

const NOW = new Date("2026-11-01T00:00:00.000Z");
const kind = fc.constantFrom("accuracy" as const, "speed" as const);

describe("the fold's rules, as properties", () => {
  it("a clean never lowers the level", () => {
    fc.assert(
      fc.property(answers, kind, (raws, k) => {
        const before = masteryOf(raws.map(answer).map(event), k, NOW).level;
        const then = masteryOf([...raws.map(answer), after(raws, true)].map(event), k, NOW).level;
        expect(rank(then)).toBeGreaterThanOrEqual(rank(before));
      }),
    );
  });

  it("a miss never raises the level, and drops at most one", () => {
    fc.assert(
      fc.property(answers, kind, (raws, k) => {
        const before = masteryOf(raws.map(answer).map(event), k, NOW).level;
        const then = masteryOf([...raws.map(answer), after(raws, false)].map(event), k, NOW);
        expect(rank(then.level)).toBeLessThanOrEqual(Math.max(rank(before), rank("attempted")));
        expect(rank(then.level)).toBeGreaterThanOrEqual(rank(before) - 1);
        expect(then.needs_attention).toBe(true);
      }),
    );
  });

  it("is never not started after a judged try, and a speed skill is never mastered", () => {
    fc.assert(
      fc.property(answers, kind, (raws, k) => {
        const got = masteryOf(raws.map(answer).map(event), k, NOW);
        const judged = raws.some((r) => r.outcome !== "skip");
        expect(got.level === "not_started").toBe(!judged);
        if (k === "speed") expect(got.level).not.toBe("mastered");
      }),
    );
  });

  it("does not depend on now, nor on the order the rows come in", () => {
    fc.assert(
      fc.property(answers, fc.date({ noInvalidDate: true }), (raws, now) => {
        const rows = raws.map(answer).map(row);
        const folded = foldLearner(rows, [], NOW);
        expect(foldLearner(rows, [], now)).toEqual(folded);
        expect(foldLearner([...rows].reverse(), [], NOW)).toEqual(folded);
      }),
    );
  });
});

describe("the order property's counterexample (dl-e8ov.5.75)", () => {
  // fast-check { seed: 1803801076, path: "16:1:1:15:15:16:31:31:31" } drew two answers to attempt 6,
  // seq 2, try 1 at hour 720, one clean and one miss. The store holds one answer per try, so the
  // generator keeps that key unique; these are the same question as the store can hold it.
  const raw = { attempt: 6, seq: 2, hours: 720, mixed: false };

  it("two answers to one try share the store's key, so the generator keeps one", () => {
    expect(tryKey({ ...raw, try_no: 1, outcome: "clean" })).toBe(
      tryKey({ ...raw, try_no: 1, outcome: "miss" }),
    );
  });

  it.each([
    ["clean then a miss", "clean", "miss", "familiar", false],
    ["a miss then clean", "miss", "clean", "attempted", true],
  ] as const)("try 1 decides, in either row order: %s", (_, first, second, level, attention) => {
    const rows = [
      answer({ ...raw, try_no: 1, outcome: first }),
      answer({ ...raw, try_no: 2, outcome: second }),
    ].map(row);
    for (const order of [rows, [...rows].reverse()]) {
      const [got] = foldLearner(order, [], NOW);
      expect(got?.level).toBe(level);
      expect(got?.needs_attention).toBe(attention);
    }
    expect(foldLearner([...rows].reverse(), [], NOW)).toEqual(foldLearner(rows, [], NOW));
  });
});
