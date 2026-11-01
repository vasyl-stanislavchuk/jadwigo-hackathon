import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HARSH_WORD_LIST, harshWordsIn } from "./harsh.ts";

/**
 * jadwigo-ai may not import `@jadwigo/copy`, so this reads copy's source as text and holds the
 * copied list to it: a word added to or dropped from copy fails here until harsh.ts follows.
 */
const COPY = readFileSync(new URL("../../../copy/src/harsh.ts", import.meta.url), "utf8");

function copyWords(): string[] {
  const block = /const HARSH_WORDS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(COPY)?.[1];
  if (block === undefined) throw new Error("packages/copy/src/harsh.ts has no HARSH_WORDS block");
  return [...block.matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? "");
}

describe("the harsh-word copy", () => {
  it("holds copy's words, in copy's order", () => {
    expect(copyWords().length).toBeGreaterThan(10);
    expect(HARSH_WORD_LIST).toEqual(copyWords());
  });

  it("matches whole words in any case, as copy does", () => {
    expect(harshWordsIn("Źle, spróbuj jeszcze raz")).toEqual(["źle"]);
    expect(harshWordsIn("That is WRONG.")).toEqual(["wrong"]);
    expect(harshWordsIn("To nie   tak")).toEqual(["nie tak"]);
    expect(harshWordsIn("Jeszcze nie. Policz jeszcze raz.")).toEqual([]);
    expect(harshWordsIn("badge, wronged, złoto")).toEqual([]);
  });
});
