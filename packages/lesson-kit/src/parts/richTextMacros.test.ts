/**
 * The brace pre-pass and the two added commands (dl-w3.70.9). Khan writes a colour macro as a bare
 * argument, `\underline\blueE6`, which KaTeX reads as an argument-less macro; preProcessTex braces
 * it. Every span here is invented, in the shapes the research measured (handoff-khan-real-types.md,
 * "How each gap is covered"). Each must render with throwOnError on and keep its colour class.
 */

import { describe, expect, it } from "vitest";
import { liveWords, preProcessTex, renderTex, uncoloured } from "./richTextMacros.ts";

const strict = (tex: string) => renderTex(tex, false, { throwOnError: true });

describe("colour macros as bare arguments", () => {
  it.each([
    [
      "\\overset{\\blueE1}\\purpleD4+3",
      ["tex-blue", "tex-violet"],
      "\\overset{\\blueE1}{\\purpleD4}+3",
    ],
    ["\\underline\\blueE6", ["tex-blue"], "\\underline{\\blueE6}"],
    ["\\dfrac{\\blueE1}\\blueE2", ["tex-blue"], "\\dfrac{\\blueE1}{\\blueE2}"],
    ["\\dfrac\\greenD3\\maroonD{8}", ["tex-green", "tex-pink"], "\\dfrac{\\greenD3}{\\maroonD{8}}"],
    ["\\text \\redE{ sixes}", ["tex-red"], "\\text {\\redE{ sixes}}"],
    [
      "\\underline\\goldE{+\\phantom{2}{2{,}100}}",
      ["tex-gold"],
      "\\underline{\\goldE{+\\phantom{2}{2{,}100}}}",
    ],
    [
      "{\\underline\\tealC7\\purpleE0}",
      ["tex-green", "tex-purple"],
      "{\\underline{\\tealC7}\\purpleE0}",
    ],
  ])("%s is braced and renders", (tex, classes, braced) => {
    expect(preProcessTex(tex)).toBe(braced);
    const html = strict(tex);
    for (const c of classes) expect(html, c).toContain(c);
  });

  it("\\gold paints the gold role and \\mbox is \\text", () => {
    expect(strict("\\gold{5}")).toContain("tex-gold");
    expect(strict("3\\mbox{-}4")).toContain("-");
    expect(strict("\\underline\\gold7")).toContain("tex-gold");
  });

  it("a span with nothing to fix stays byte-identical", () => {
    for (const tex of [
      "\\frac{1}{2}+\\blueD{3}",
      "\\frac12",
      "\\sqrt[3]{x}\\times\\overline{AB}",
      "\\text{a \\{b\\} c}",
      "\\underline{\\blueE6}",
      "{\\purpleC{28}}\\div 4",
    ])
      expect(preProcessTex(tex)).toBe(tex);
  });

  it("an unclosed group is left as it was", () => {
    expect(preProcessTex("\\underline{\\blueE6")).toBe("\\underline{\\blueE6");
  });
});

// The solution card is ink (Choose addendum 1.2, dl-uukj.29.86) and the live region reads words
// (dl-uukj.29.78).
describe("colour taken off, and the words a screen reader hears", () => {
  it.each([
    [
      "There are $\\blueD7$ rows with $\\purpleC6$ flowers.",
      "There are $7$ rows with $6$ flowers.",
    ],
    ["$\\blueD7 \\times \\purpleC{6}$", "$7 \\times 6$"],
    [
      "$\\blueD{\\text{ rows}}\\times\\purpleC{\\text{ in a row}}$",
      "${\\text{ rows}}\\times{\\text{ in a row}}$",
    ],
    ["$\\blueD{12}^2$", "$\\blueD{12}^2$".replace("\\blueD", "")],
    ["$\\underline\\blueE6$", "$\\underline6$"],
    ["no maths, \\blueD7 stays", "no maths, \\blueD7 stays"],
    ["$$\\greenD{4}$$", "$$4$$"],
  ])("%s", (text, ink) => {
    expect(uncoloured(text)).toBe(ink);
  });

  it("keeps a group a script follows", () => {
    expect(uncoloured("$\\blueD{a+b}^2$")).toBe("${a+b}^2$");
  });

  it("reads TeX as words in the lesson notation, with no macro and no markdown left", () => {
    expect(
      liveWords("Jest $\\blueD7$ rzędów, a w każdym **rzędzie** $\\purpleC6$ kwiatów.", "pl"),
    ).toBe("Jest 7 rzędów, a w każdym rzędzie 6 kwiatów.");
    expect(liveWords("The following image shows $\\blueD3\\times\\maroonD2$:", "en")).toBe(
      "The following image shows 3 × 2:",
    );
    expect(liveWords("$\\blueD3\\times\\maroonD2$", "pl")).toBe("3 · 2");
    expect(liveWords("$\\blueD{\\text{ liczba rzędów}}$", "pl")).toBe("liczba rzędów");
  });
});
