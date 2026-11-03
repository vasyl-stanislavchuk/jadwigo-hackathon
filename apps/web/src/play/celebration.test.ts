import type { PageAttemptQuestion } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { castOf, celebrationDue, celebrationSeqs, firstCast } from "./celebration.ts";
import { initialRunner } from "./runner.ts";

type Ended = PageAttemptQuestion["ended"];

function q(seq: number, ended: Ended, tries = 1, helped = false): PageAttemptQuestion {
  return { seq, ended, tries, help: helped ? [{}] : [] } as unknown as PageAttemptQuestion;
}

const right = (seq: number): PageAttemptQuestion => q(seq, "correct");

describe("celebrationSeqs", () => {
  it("names the third of three first-try rights", () => {
    expect(celebrationSeqs([right(1), right(2), right(3)])).toEqual([3]);
  });

  it("is empty before three", () => {
    expect(celebrationSeqs([right(1), right(2), q(3, null, 0)])).toEqual([]);
  });

  it("a miss then right breaks the run, and rights across it don't add up", () => {
    expect(celebrationSeqs([right(1), right(2), q(3, "correct", 2), right(4), right(5)])).toEqual(
      [],
    );
    expect(celebrationSeqs([right(1), q(2, "correct", 2), right(3), right(4), right(5)])).toEqual([
      5,
    ]);
  });

  it("help, a skip or a held verdict breaks the run", () => {
    expect(celebrationSeqs([right(1), right(2), q(3, "correct", 1, true)])).toEqual([]);
    expect(celebrationSeqs([right(1), right(2), q(3, "skipped")])).toEqual([]);
    expect(celebrationSeqs([right(1), right(2), q(3, "done")])).toEqual([]);
  });

  it("counts again from one after a celebration, so the second needs three more", () => {
    expect(celebrationSeqs([1, 2, 3, 4, 5].map(right))).toEqual([3]);
    expect(celebrationSeqs([1, 2, 3, 4, 5, 6].map(right))).toEqual([3, 6]);
  });

  it("a miss after the first starts the count for the second again", () => {
    const qs = [right(1), right(2), right(3), right(4), q(5, "correct", 2), right(6), right(7)];
    expect(celebrationSeqs(qs)).toEqual([3]);
    expect(celebrationSeqs([...qs, right(8)])).toEqual([3, 8]);
  });

  it("stops at two a lesson", () => {
    expect(celebrationSeqs([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(right))).toEqual([3, 6]);
  });
});

describe("celebrationDue", () => {
  const questions = [1, 2, 3, 4, 5, 6].map(right).concat(q(7, null, 0));

  it("holds at the praise for those questions only, naming which one", () => {
    expect(celebrationDue({ ...initialRunner, questions, seq: 3, phase: "feedback" })).toBe(0);
    expect(celebrationDue({ ...initialRunner, questions, seq: 6, phase: "feedback" })).toBe(1);
    expect(celebrationDue({ ...initialRunner, questions, seq: 7, phase: "live" })).toBeNull();
    expect(celebrationDue({ ...initialRunner, questions, seq: 2, phase: "feedback" })).toBeNull();
    expect(celebrationDue({ ...initialRunner, questions, seq: 3, phase: "live" })).toBeNull();
  });
});

describe("who plays", () => {
  it("the first is a coin, the second the other one", () => {
    expect(firstCast(0)).toBe("queen");
    expect(firstCast(0.99)).toBe("iwona");
    expect([castOf(0, "queen"), castOf(1, "queen")]).toEqual(["queen", "iwona"]);
    expect([castOf(0, "iwona"), castOf(1, "iwona")]).toEqual(["iwona", "queen"]);
  });
});
