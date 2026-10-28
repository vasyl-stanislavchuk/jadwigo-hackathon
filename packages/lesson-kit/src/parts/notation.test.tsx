/**
 * Polish number and sign notation at render time (dl-w3.70.23). Every string here is invented, in
 * the shapes Khan writes: `1{,}000` and `\div` in TeX, `1,000` and `0.5` in text. A Polish
 * lesson shows 1 000, 0,5, 12 : 3 and 4 · 5; an English one shows the text as written.
 */

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MathNotation, notationTex, notationText } from "./notation.ts";
import { RichText } from "./RichText.tsx";
import { renderTex } from "./richTextMacros.ts";

afterEach(cleanup);

const NB = " ";

describe("notationText (plain text outside TeX)", () => {
  it.each(["pl"] as const)("%s: thousands as a space, a decimal comma, : and ·", (language) => {
    expect(notationText("The farm has 1,250 hens and 2,400,000 seeds.", language)).toBe(
      `The farm has 1${NB}250 hens and 2${NB}400${NB}000 seeds.`,
    );
    expect(notationText("Each jar holds 0.5 litres; the answer is 3.75.", language)).toBe(
      "Each jar holds 0,5 litres; the answer is 3,75.",
    );
    expect(notationText("12 ÷ 3 and 4 × 5", language)).toBe("12 : 3 and 4 · 5");
    expect(notationText("1,000.25", language)).toBe(`1${NB}000,25`);
  });

  it("leaves English as written", () => {
    const line = "Put 1,250 apples, 0.5 kg and 12 ÷ 3 × 4 on the table.";
    expect(notationText(line, "en")).toBe(line);
  });

  it("touches no time, ratio, id, list, pair or group that is not three digits", () => {
    const left = [
      "The bus leaves at 12:30.",
      "Mix them 3:4.",
      "Item x08,123 and g1.5b",
      "Count 2, 5, 8.",
      "The point (100,200).",
      "1,0000 and 1,23",
      "Open p1.5.png",
      "Version 1.2.3",
    ];
    for (const line of left) expect(notationText(line, "pl")).toBe(line);
  });

  it("reads a group that starts with 0 as a decimal comma already", () => {
    expect(notationText("Pół to 0,125 litra?", "pl")).toBe("Pół to 0,125 litra?");
  });
});

describe("notationTex (inside a TeX span)", () => {
  it.each(["pl"] as const)("%s: braced and bare thousands, decimals and signs", (language) => {
    expect(notationTex("7{,}365\\div5", language)).toBe("7\\,365\\mathbin{:}5");
    expect(notationTex("1{,}000{,}000", language)).toBe("1\\,000\\,000");
    expect(notationTex("2,500 + 0.25", language)).toBe("2\\,500 + 0{,}25");
    expect(notationTex("\\blueD{4}\\times3", language)).toBe("\\blueD{4}\\cdot 3");
    expect(notationTex("12 ÷ 4 = 3 × 1", language)).toBe("12 \\mathbin{:} 4 = 3 \\cdot  1");
  });

  it("leaves English, colons, lengths and commands that only start like a sign", () => {
    expect(notationTex("7{,}365\\div5 + 0.5", "en")).toBe("7{,}365\\div5 + 0.5");
    expect(notationTex("12:30", "pl")).toBe("12:30");
    expect(notationTex("\\kern0.5em 3", "pl")).toBe("\\kern0.5em 3");
    expect(notationTex("\\timesx \\divides", "pl")).toBe("\\timesx \\divides");
  });

  it("still draws through KaTeX without an error", () => {
    for (const tex of [
      "7{,}365\\div5",
      "\\large{1{,}010}\\times\\phantom{\\times}6",
      "\\$3.50 \\text{ is 1,250 grosze}",
      "\\dfrac{1}{2} = 0.5",
    ])
      expect(() => renderTex(notationTex(tex, "pl"), false, { throwOnError: true })).not.toThrow();
  });
});

describe("RichText in a lesson language", () => {
  const LINE = "A box holds 1,500 beads, $1{,}000 + 0.5$ and $84\\div4$ or $4\\times5$.";

  it("draws Polish notation inside a Polish lesson, in text and in TeX", () => {
    const { container } = render(
      <MathNotation.Provider value="pl">
        <RichText text={LINE} />
      </MathNotation.Provider>,
    );
    expect(container.textContent).toContain(`1${NB}500 beads`);
    const maths = [...container.querySelectorAll('[role="math"]')].map((m) =>
      m.getAttribute("aria-label"),
    );
    expect(maths).toEqual(["1 000 + 0,5", "84 : 4", "4 · 5"]);
  });

  it("draws the line as written with no provider and in English", () => {
    for (const ui of [
      <RichText key="a" text={LINE} />,
      <MathNotation.Provider key="b" value="en">
        <RichText text={LINE} />
      </MathNotation.Provider>,
    ]) {
      const { container, unmount } = render(ui);
      expect(container.textContent).toContain("1,500 beads");
      expect(
        [...container.querySelectorAll('[role="math"]')].map((m) => m.getAttribute("aria-label")),
      ).toEqual(["1,000 + 0.5", "84 ÷ 4", "4 × 5"]);
      unmount();
    }
  });
});
