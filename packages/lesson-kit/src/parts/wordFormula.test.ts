import { describe, expect, it } from "vitest";
import { wordFormula } from "./wordFormula.ts";

describe("wordFormula", () => {
  it("splits the multiplication hint into coloured words and signs", () => {
    const tex =
      "\\blueD{\\text{ Number of rows}}\\times\\purpleC{\\text{ Number of objects in each row}}=\\greenD{\\text{ Total}}";
    const pieces = wordFormula(tex);
    expect(pieces?.map((p) => (p.kind === "word" ? p.tex : p.text))).toEqual([
      "\\blueD{\\text{Number}}",
      "\\blueD{\\text{of}}",
      "\\blueD{\\text{rows}}",
      "×",
      "\\purpleC{\\text{Number}}",
      "\\purpleC{\\text{of}}",
      "\\purpleC{\\text{objects}}",
      "\\purpleC{\\text{in}}",
      "\\purpleC{\\text{each}}",
      "\\purpleC{\\text{row}}",
      "=",
      "\\greenD{\\text{Total}}",
    ]);
  });

  it("reads the Polish one with a dot and letters outside ASCII", () => {
    const tex =
      "\\blueD{\\text{ Liczba rzędów}}\\cdot\\purpleC{\\text{ Liczba elementów w jednym rzędzie}}=\\greenD{\\text{ Całkowita liczba elementów}}";
    const pieces = wordFormula(tex) ?? [];
    expect(pieces.filter((p) => p.kind === "sign").map((p) => p.kind === "sign" && p.text)).toEqual(
      ["·", "="],
    );
    expect(pieces.filter((p) => p.kind === "word")).toHaveLength(10);
  });

  it("reads the Polish division sign, \\mathbin{:}", () => {
    const tex =
      "\\greenD{\\text{ Liczba wszystkich jednostek}}\\mathbin{:}\\blueD{\\text{ Liczba grup}}";
    const signs = (wordFormula(tex) ?? []).flatMap((p) => (p.kind === "sign" ? [p.text] : []));
    expect(signs).toEqual([":"]);
  });

  it("leaves real maths and single words to KaTeX", () => {
    expect(wordFormula("\\blueD7\\times\\purpleC8")).toBeNull();
    expect(wordFormula("\\frac{1}{2}")).toBeNull();
    expect(wordFormula("\\text{cm}")).toBeNull();
    expect(wordFormula("\\text{Number of rows}")).toBeNull();
    expect(wordFormula("3\\times\\text{ rows of cheese}")).toBeNull();
    expect(wordFormula("\\textbf{\\text{a b}}=\\text{c}")).toBeNull();
  });
});
