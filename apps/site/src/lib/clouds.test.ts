import { describe, expect, it } from "vitest";
import { english, mathsFacts, polish, romanNumerals } from "../content/clouds.ts";
import { cloudPiece } from "./clouds.ts";

const roman = (numeral: string): number => {
  const value: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
  let total = 0;
  for (let i = 0; i < numeral.length; i++) {
    const here = value[numeral[i] ?? ""] ?? 0;
    const after = value[numeral[i + 1] ?? ""] ?? 0;
    total += here < after ? -here : here;
  }
  return total;
};

// A fixed sequence, so the test is the same on every run.
function seeded(start: number): () => number {
  let s = start;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe("the clouds' words", () => {
  it("are short, and none is listed twice", () => {
    for (const list of [polish, english, romanNumerals, mathsFacts.pl, mathsFacts.en]) {
      expect(list.length).toBeGreaterThan(0);
      expect(new Set(list).size).toBe(list.length);
      for (const word of list) expect(word.length, word).toBeLessThanOrEqual(24);
    }
  });

  it("write every Roman numeral with its right value", () => {
    for (const fact of romanNumerals) {
      const [numeral, value] = fact.split(" = ");
      expect(roman(numeral ?? ""), fact).toBe(Number(value));
    }
  });
});

describe("cloudPiece", () => {
  it("deals every subject, maths most often", () => {
    const rand = seeded(11);
    const count = { maths: 0, polish: 0, english: 0 };
    for (let i = 0; i < 3000; i++) count[cloudPiece(rand, "pl").subject]++;
    expect(count.maths).toBeGreaterThan(count.polish);
    expect(count.polish).toBeGreaterThan(count.english);
    expect(count.english).toBeGreaterThan(400);
  });
});
