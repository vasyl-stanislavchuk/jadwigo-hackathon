import type { PageAttemptQuestion } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { queenDue, queenSeq } from "./queen.ts";
import { initialRunner } from "./runner.ts";

type Ended = PageAttemptQuestion["ended"];

function q(seq: number, ended: Ended, tries = 1, helped = false): PageAttemptQuestion {
  return { seq, ended, tries, help: helped ? [{}] : [] } as unknown as PageAttemptQuestion;
}

const right = (seq: number): PageAttemptQuestion => q(seq, "correct");

describe("queenSeq", () => {
  it("names the third of three first-try rights", () => {
    expect(queenSeq([right(1), right(2), right(3)])).toBe(3);
  });

  it("is null before three", () => {
    expect(queenSeq([right(1), right(2), q(3, null, 0)])).toBeNull();
  });

  it("a miss then right breaks the run, and rights across it don't add up", () => {
    expect(queenSeq([right(1), right(2), q(3, "correct", 2), right(4), right(5)])).toBeNull();
    expect(queenSeq([right(1), q(2, "correct", 2), right(3), right(4), right(5)])).toBe(5);
  });

  it("help, a skip or a held verdict breaks the run", () => {
    expect(queenSeq([right(1), right(2), q(3, "correct", 1, true)])).toBeNull();
    expect(queenSeq([right(1), right(2), q(3, "skipped")])).toBeNull();
    expect(queenSeq([right(1), right(2), q(3, "done")])).toBeNull();
  });

  it("stays on the first run, so she plays once a lesson", () => {
    expect(queenSeq([1, 2, 3, 4, 5, 6].map(right))).toBe(3);
  });
});

describe("queenDue", () => {
  const questions = [right(1), right(2), right(3), q(4, null, 0)];

  it("holds at the praise for that question only", () => {
    expect(queenDue({ ...initialRunner, questions, seq: 3, phase: "feedback" })).toBe(true);
    expect(queenDue({ ...initialRunner, questions, seq: 4, phase: "live" })).toBe(false);
    expect(queenDue({ ...initialRunner, questions, seq: 2, phase: "feedback" })).toBe(false);
  });
});
