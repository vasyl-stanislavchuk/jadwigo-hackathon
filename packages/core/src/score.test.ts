import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { clampScore } from "./score.ts";

describe("clampScore", () => {
  it("always lands in [0, 1] and keeps scores already inside", () => {
    fc.assert(
      fc.property(fc.double(), (raw) => {
        const score = clampScore(raw);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(1);
        // === on purpose, not Object.is: -0 comes back as 0, which is the same score.
        if (raw >= 0 && raw <= 1) expect(score === raw).toBe(true);
      }),
    );
  });
});
