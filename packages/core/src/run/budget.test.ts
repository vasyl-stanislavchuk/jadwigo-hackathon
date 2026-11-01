import { BUDGET_STEER_SHARE, BUDGET_STOP_SHARE } from "@jadwigo/contracts/run";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { type BudgetLevel, budgetGuard } from "./index.ts";

const RANK: Record<BudgetLevel, number> = { none: 0, steer: 1, stop: 2 };

describe("budgetGuard, shares without float error (dl-z5ja.38)", () => {
  it("reads 90% of a 0.10 cap as stop and half of it as steer", () => {
    expect(budgetGuard(0.09, 0.1)).toBe("stop");
    expect(budgetGuard(0.05, 0.1)).toBe("steer");
    expect(budgetGuard(0.27, 0.3)).toBe("stop");
    expect(budgetGuard(0.15, 0.3)).toBe("steer");
    expect(budgetGuard(0.6, 0.7)).toBe("steer");
    expect(budgetGuard(0.63, 0.7)).toBe("stop");
  });

  it("keeps a spend a cent under a share below it", () => {
    expect(budgetGuard(0.89, 1)).toBe("steer");
    expect(budgetGuard(0.49, 1)).toBe("none");
  });

  it("keeps the lead's rule: an unknown spend, or a cap of 0, below 0 or NaN, is stop", () => {
    expect(budgetGuard(null, 1)).toBe("stop");
    expect(budgetGuard(undefined, 1)).toBe("stop");
    expect(budgetGuard(Number.NaN, 1)).toBe("stop");
    expect(budgetGuard(0, 0)).toBe("stop");
    expect(budgetGuard(0, -1)).toBe("stop");
    expect(budgetGuard(0, Number.NaN)).toBe("stop");
  });

  it("reads a spend below 0 as stop, like an unknown one (dl-z5ja.74)", () => {
    expect(budgetGuard(-1, 1)).toBe("stop");
    expect(budgetGuard(-0.01, 100)).toBe("stop");
    expect(budgetGuard(-Number.MIN_VALUE, 1)).toBe("stop");
    fc.assert(
      fc.property(
        fc.double({ max: 0, maxExcluded: true, noNaN: true }),
        fc.double({ noNaN: false }),
        (spent, cap) => {
          expect(budgetGuard(spent, cap)).toBe("stop");
        },
      ),
    );
  });

  it("still reads a spend of 0 against a cap above 0 as none", () => {
    expect(budgetGuard(0, 1)).toBe("none");
    expect(budgetGuard(-0, 1)).toBe("none");
  });

  it("reads a spend of exactly a share of any cap as at least that share's level", () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 100, noNaN: true, minExcluded: true }),
        fc.constantFrom<[number, BudgetLevel]>(
          [BUDGET_STEER_SHARE, "steer"],
          [BUDGET_STOP_SHARE, "stop"],
        ),
        (cap, [share, level]) => {
          expect(RANK[budgetGuard(cap * share, cap)]).toBeGreaterThanOrEqual(RANK[level]);
        },
      ),
    );
  });

  it("reads a share written in cents of a cap written in cents at its level", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (capCents) => {
        const cap = capCents / 100;
        const stop = Math.ceil((capCents * 9) / 10) / 100;
        const steer = Math.ceil((capCents * 5) / 10) / 100;
        expect(budgetGuard(stop, cap)).toBe("stop");
        if (steer < stop) expect(budgetGuard(steer, cap)).toBe("steer");
      }),
    );
  });
});
