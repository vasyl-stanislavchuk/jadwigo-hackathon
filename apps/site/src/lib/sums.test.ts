import { describe, expect, it } from "vitest";
import { trueSum } from "./sums.ts";

// Works a written piece of maths out again, in either language: "a op b = c", "a > b", "½ z 8 = 4".
function holds(sum: string): boolean {
  const op = /^(\d+) ([+−·×:÷]) (\d+) = (\d+)$/.exec(sum);
  if (op) {
    const [a, b, c] = [Number(op[1]), Number(op[3]), Number(op[4])];
    const sign = op[2];
    const result =
      sign === "+" ? a + b : sign === "−" ? a - b : sign === "·" || sign === "×" ? a * b : a / b;
    return result === c;
  }
  const compare = /^(\d+) ([<>]) (\d+)$/.exec(sum);
  if (compare) {
    const [a, b] = [Number(compare[1]), Number(compare[3])];
    return compare[2] === ">" ? a > b : a < b;
  }
  const part = /^([½¼]) (z|of) (\d+) = (\d+)$/.exec(sum);
  if (part) return Number(part[3]) / (part[1] === "½" ? 2 : 4) === Number(part[4]);
  return false;
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
  it("writes only maths that is right, within grades 1-4", () => {
    const rand = seeded(7);
    for (let i = 0; i < 4000; i++) {
      for (const lang of ["pl", "en"] as const) {
        const sum = trueSum(rand, lang);
        expect(holds(sum), sum).toBe(true);
        const numbers = sum.match(/\d+/g)?.map(Number) ?? [];
        expect(Math.max(...numbers), sum).toBeLessThanOrEqual(100);
      }
    }
  });

  it("writes it as the child does at school in each language", () => {
    const pl = new Set<string>();
    const en = new Set<string>();
    const rand = seeded(3);
    for (let i = 0; i < 1000; i++) {
      pl.add(trueSum(rand, "pl").split(" ")[1] ?? "");
      en.add(trueSum(rand, "en").split(" ")[1] ?? "");
    }
    expect([...pl].sort()).toEqual(["+", ":", "<", ">", "z", "·", "−"].sort());
    expect([...en].sort()).toEqual(["+", "<", ">", "of", "×", "÷", "−"].sort());
  });
});
