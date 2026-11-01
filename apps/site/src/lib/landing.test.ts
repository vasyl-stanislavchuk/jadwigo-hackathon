import { describe, expect, it } from "vitest";
import { firstSentence, plural } from "./landing.ts";

const forms = ["pytanie", "pytania", "pytań"] as const;

describe("plural", () => {
  it("picks the Polish form by the count", () => {
    expect([1, 2, 4, 5, 11, 12, 14, 22, 25].map((n) => plural(n, forms))).toEqual([
      "1 pytanie",
      "2 pytania",
      "4 pytania",
      "5 pytań",
      "11 pytań",
      "12 pytań",
      "14 pytań",
      "22 pytania",
      "25 pytań",
    ]);
  });
});

describe("firstSentence", () => {
  it("keeps the question and drops the instruction after it", () => {
    expect(firstSentence("Ile to jest 2 razy 7? Napisz albo powiedz.")).toBe(
      "Ile to jest 2 razy 7?",
    );
    expect(firstSentence("Policz kropki")).toBe("Policz kropki");
  });
});
