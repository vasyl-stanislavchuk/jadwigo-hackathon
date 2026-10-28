import { describe, expect, it } from "vitest";
import { caretEnd, caretX } from "./inkCaret.ts";

describe("caretX", () => {
  it("puts the caret after the prefix in a left-aligned field", () => {
    expect(caretX({ align: "left", box: 200, full: 60, prefix: 30, scroll: 0 })).toBe(30);
  });
  it("starts centred text where the free room splits", () => {
    expect(caretX({ align: "center", box: 200, full: 60, prefix: 30, scroll: 0 })).toBe(100);
    expect(caretX({ align: "center", box: 200, full: 0, prefix: 0, scroll: 0 })).toBe(100);
  });
  it("starts right-aligned text at the free room", () => {
    expect(caretX({ align: "right", box: 200, full: 60, prefix: 60, scroll: 0 })).toBe(200);
  });
  it("follows a field scrolled past its overflowing text", () => {
    expect(
      caretX({
        align: "center",
        box: 100,
        full: 300,
        prefix: 300,
        scroll: 200,
      }),
    ).toBe(100);
  });
});

describe("caretEnd", () => {
  it("stands at the caret when nothing is selected", () => {
    expect(caretEnd(2, 2, "none")).toBe(2);
  });
  it("stands after a selection, so a selected field still shows its focus (dl-uukj.29.99)", () => {
    expect(caretEnd(0, 2, "none")).toBe(2);
    expect(caretEnd(0, 2, "forward")).toBe(2);
  });
  it("stands before a selection made backwards", () => {
    expect(caretEnd(1, 3, "backward")).toBe(1);
  });
});
