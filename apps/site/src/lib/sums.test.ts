import { describe, expect, it } from "vitest";
import { trueSum } from "./sums.ts";

// Works a written sum out again: "a op b = c", with either language's signs.
function holds(sum: string): boolean {
  const m = /^(\d+) ([+−·×:÷]) (\d+) = (\d+)$/.exec(sum);
  if (!m) return false;
  const [a, b, c] = [Number(m[1]), Number(m[3]), Number(m[4])];
  const op = m[2];
  const result = op === "+" ? a + b : op === "−" ? a - b : op === "·" || op === "×" ? a * b : a / b;
  return result === c;
}

// A fixed sequence, so the test is the same on every run.
function seeded(start: number): () => number {
  let s = start;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe("trueSum", () => {
  it("writes only sums that are right, within grades 1-3", () => {
    const rand = seeded(7);
    for (let i = 0; i < 2000; i++) {
      for (const lang of ["pl", "en"] as const) {
        const sum = trueSum(rand, lang);
        expect(holds(sum), sum).toBe(true);
        const numbers = sum.match(/\d+/g)?.map(Number) ?? [];
        expect(Math.max(...numbers), sum).toBeLessThanOrEqual(100);
      }
    }
  });

  it("writes times and divide as the child does at school in each language", () => {
    const pl = new Set<string>();
    const en = new Set<string>();
    const rand = seeded(3);
    for (let i = 0; i < 400; i++) {
      pl.add(trueSum(rand, "pl").split(" ")[1] ?? "");
      en.add(trueSum(rand, "en").split(" ")[1] ?? "");
    }
    expect([...pl].sort()).toEqual(["+", ":", "·", "−"].sort());
    expect([...en].sort()).toEqual(["+", "×", "÷", "−"].sort());
  });
});
