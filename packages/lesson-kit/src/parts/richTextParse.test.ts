/**
 * The rich text parser (richTextParse.ts, dl-r772.6): the Perseus flavour Khan's items are written
 * in, read as blocks and runs, with TeX opaque and slots found only outside it.
 */

import { describe, expect, it } from "vitest";
import { must } from "./must.ts";
import {
  type Block,
  type Inline,
  isPlainText,
  parseInline,
  parseRichText,
  termsIn,
  texRanges,
  texSpans,
} from "./richTextParse.ts";

const text = (t: string): Inline => ({ kind: "text", text: t });
const tex = (t: string, display = false): Inline => ({ kind: "tex", tex: t, display });
const para = (...runs: Inline[]): Block => ({ kind: "paragraph", runs });

describe("inline runs", () => {
  it("bold, with the Perseus quirk of a space before the closing stars", () => {
    expect(parseInline("a **b** c")).toEqual([
      text("a "),
      { kind: "bold", runs: [text("b")] },
      text(" c"),
    ]);
    expect(parseInline("**Bold. ** then")).toEqual([
      { kind: "bold", runs: [text("Bold.")] },
      text(" then"),
    ]);
  });

  it("stars that open no bold stay text", () => {
    expect(parseInline("2 ** 3")).toEqual([text("2 ** 3")]);
    expect(parseInline("**never closed")).toEqual([text("**never closed")]);
  });

  it("italic between single stars, as Khan writes a hint line (dl-uukj.29.91)", () => {
    expect(parseInline("*Podpowiedź: policz kropki.*")).toEqual([
      { kind: "italic", runs: [text("Podpowiedź: policz kropki.")] },
    ]);
    expect(parseInline("a *b $7$* c")).toEqual([
      text("a "),
      { kind: "italic", runs: [text("b "), tex("7")] },
      text(" c"),
    ]);
  });

  it("single stars that open no italic stay text", () => {
    expect(parseInline("2*3*4")).toEqual([text("2*3*4")]);
    expect(parseInline("a * b * c")).toEqual([text("a * b * c")]);
    expect(parseInline("*never closed")).toEqual([text("*never closed")]);
    expect(parseInline("$2*3*4$")).toEqual([tex("2*3*4")]);
  });

  it("a line break inside a paragraph", () => {
    expect(parseInline("one\ntwo")).toEqual([text("one"), { kind: "break" }, text("two")]);
  });

  it("backtick code, as InlineCode cuts it", () => {
    expect(parseInline("run `bd ready` now")).toEqual([
      text("run "),
      { kind: "code", text: "bd ready" },
      text(" now"),
    ]);
  });

  it("inline and display TeX", () => {
    expect(parseInline("so $7 \\times 8$ is")).toEqual([
      text("so "),
      tex("7 \\times 8"),
      text(" is"),
    ]);
    expect(parseInline("$$\\dfrac{1}{2}$$")).toEqual([tex("\\dfrac{1}{2}", true)]);
    expect(parseInline("a $$b$$ c $d$")).toEqual([
      text("a "),
      tex("b", true),
      text(" c "),
      tex("d"),
    ]);
  });

  it("never splits a TeX span on * or _ or a backtick", () => {
    expect(parseInline("$2*3$ and $a_1$ and $x**y$")).toEqual([
      tex("2*3"),
      text(" and "),
      tex("a_1"),
      text(" and "),
      tex("x**y"),
    ]);
    expect(parseInline("**$a*b$**")).toEqual([{ kind: "bold", runs: [tex("a*b")] }]);
  });

  it("an escaped dollar is a dollar, inside and outside TeX", () => {
    expect(parseInline("costs \\$5")).toEqual([text("costs $5")]);
    expect(parseInline("$\\$5 + \\$2$")).toEqual([tex("\\$5 + \\$2")]);
  });

  it("a dollar that never closes is text", () => {
    expect(parseInline("a $ b")).toEqual([text("a $ b")]);
  });

  it("slots are found only when asked for, and never inside TeX", () => {
    expect(parseInline("a {g1} b")).toEqual([text("a {g1} b")]);
    expect(parseInline("a {g1} b", { slots: new Set(["g1"]) })).toEqual([
      text("a "),
      { kind: "slot", id: "g1" },
      text(" b"),
    ]);
    expect(parseInline("a {g2} b", { slots: new Set(["g1"]) })).toEqual([text("a {g2} b")]);
    expect(
      parseInline("$\\text{fives} \\blueD{7}$ {fives}", { slots: new Set(["fives"]) }),
    ).toEqual([tex("\\text{fives} \\blueD{7}"), text(" "), { kind: "slot", id: "fives" }]);
  });
});

describe("blocks", () => {
  it("paragraphs apart by a blank line, breaks within", () => {
    expect(parseRichText("one\ntwo\n\nthree")).toEqual([
      para(text("one"), { kind: "break" }, text("two")),
      para(text("three")),
    ]);
  });

  it("a bullet list", () => {
    expect(parseRichText("Pick:\n- $2$\n- three")).toEqual([
      para(text("Pick:")),
      { kind: "list", items: [[tex("2")], [text("three")]] },
    ]);
  });

  it("an image on its own line", () => {
    expect(parseRichText("![four dots](/media/khan/a.png)")).toEqual([
      { kind: "image", alt: "four dots", src: "/media/khan/a.png" },
    ]);
    expect(parseRichText("see ![x](a.png) here")).toEqual([para(text("see ![x](a.png) here"))]);
  });

  it.each([
    ["tight", "a|b\n-|-\n1|2"],
    ["colon", "a|b\n:-|:-\n1|2"],
    ["dashes", "a | b\n--- | ---\n1 | 2"],
    ["outer pipes", "| a | b |\n| - | - |\n| 1 | 2 |"],
    ["spaced delimiter", "a|b\n - | - \n1|2"],
  ])("a Perseus table, %s form", (_, src) => {
    expect(parseRichText(src)).toEqual([
      { kind: "table", header: [[text("a")], [text("b")]], rows: [[[text("1")], [text("2")]]] },
    ]);
  });

  it("a table straight after a paragraph line, with no blank line", () => {
    expect(parseRichText("Look:\na|b\n-|-\n1|2")).toEqual([
      para(text("Look:")),
      { kind: "table", header: [[text("a")], [text("b")]], rows: [[[text("1")], [text("2")]]] },
    ]);
  });

  it("drops trailing columns empty everywhere, reads $$ as an empty cell, and a blank header as none", () => {
    expect(parseRichText("a|b|\n-|-|\n1|2|")).toEqual([
      { kind: "table", header: [[text("a")], [text("b")]], rows: [[[text("1")], [text("2")]]] },
    ]);
    expect(parseRichText("a|$$\n-|-\n$$|2")).toEqual([
      { kind: "table", header: [[text("a")], []], rows: [[[], [text("2")]]] },
    ]);
    expect(parseRichText("$$|$$\n-|-\n1|2")).toEqual([
      { kind: "table", header: null, rows: [[[text("1")], [text("2")]]] },
    ]);
  });

  it("a pipe inside TeX is not a column", () => {
    expect(parseRichText("a|b\n-|-\n$\\left|x\\right|$|2")).toEqual([
      {
        kind: "table",
        header: [[text("a")], [text("b")]],
        rows: [[[tex("\\left|x\\right|")], [text("2")]]],
      },
    ]);
  });

  it("TeX cells keep their maths", () => {
    const table = must(
      parseRichText("$\\blueD{3}$ | $\\greenD{4}$\n:-: | :-:\n$3 \\times 4$ | $12$")[0],
    );
    expect(table.kind).toBe("table");
    expect(texSpans("$\\blueD{3}$ | $\\greenD{4}$\n:-: | :-:\n$3 \\times 4$ | $12$")).toEqual([
      "\\blueD{3}",
      "\\greenD{4}",
      "3 \\times 4",
      "12",
    ]);
  });
});

describe("texSpans, texRanges, isPlainText", () => {
  it("every span in reading order, across blocks and inside bold", () => {
    expect(texSpans("**$a$** b\n\n- $c$\n\nd $$e$$")).toEqual(["a", "c", "e"]);
  });

  it("ranges cover the dollars", () => {
    expect(texRanges("x $ab$ y $$c$$")).toEqual([
      [2, 6],
      [9, 14],
    ]);
    expect(texRanges("`$a` $b$")).toEqual([[5, 8]]);
  });

  it("plain text is one paragraph of words", () => {
    expect(isPlainText("7 × 8")).toBe(true);
    expect(isPlainText("")).toBe(true);
    expect(isPlainText("$7 \\times 8$")).toBe(false);
    expect(isPlainText("**7**")).toBe(false);
    expect(isPlainText("a\n\nb")).toBe(false);
  });
});

describe("glossary terms and links (dl-w3.56)", () => {
  const term = (word: string, meaning: string): Inline => ({ kind: "term", word, meaning });

  it("[word](def: meaning) is a term run, its meaning trimmed", () => {
    expect(parseInline("a [vertex](def: where two rays meet) b")).toEqual([
      text("a "),
      term("vertex", "where two rays meet"),
      text(" b"),
    ]);
    expect(parseInline("[x](def:no space)")).toEqual([term("x", "no space")]);
  });

  it("a meaning may hold TeX and balanced parentheses, and a word may be bold around it", () => {
    expect(parseInline("[half](def: one of two equal parts, $\\frac{1}{2}$ (bez reszty))")).toEqual(
      [term("half", "one of two equal parts, $\\frac{1}{2}$ (bez reszty)")],
    );
    expect(parseInline("**[odd](def: not even)**")).toEqual([
      { kind: "bold", runs: [term("odd", "not even")] },
    ]);
  });

  it("a link to anywhere else is its text with the URL dropped", () => {
    expect(parseInline("see [Khan](https://khanacademy.org) here")).toEqual([
      text("see Khan here"),
    ]);
  });

  it("never inside TeX, never an inline image, never a Perseus placeholder, never unclosed", () => {
    expect(parseInline("$[a](def: b)$")).toEqual([tex("[a](def: b)")]);
    expect(parseInline("see ![x](a.png) here")).toEqual([text("see ![x](a.png) here")]);
    expect(parseInline("[[☃ radio 1]]")).toEqual([text("[[☃ radio 1]]")]);
    expect(parseInline("[open](def: never closed")).toEqual([text("[open](def: never closed")]);
    expect(parseInline("a [b] c (d)")).toEqual([text("a [b] c (d)")]);
  });

  it("termsIn lists every term across blocks; texSpans and isPlainText see past the form", () => {
    expect(termsIn("a [x](def: 1) b\n\n- [y](def: $2$)\n\n**[z](def: 3)**")).toEqual([
      { word: "x", meaning: "1" },
      { word: "y", meaning: "$2$" },
      { word: "z", meaning: "3" },
    ]);
    expect(texSpans("$a$ [x](def: $b$)")).toEqual(["a"]);
    expect(isPlainText("a [x](def: y)")).toBe(false);
    expect(isPlainText("a [x](https://b) c")).toBe(true);
  });
});
