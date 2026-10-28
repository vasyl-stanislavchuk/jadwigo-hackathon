/**
 * The frame picker's five outcomes (lesson-frame README §2, dl-uukj.29.53), by input and shape.
 */

import { describe, expect, it } from "vitest";
import { keyboardInset, pickFrame, toolsAt } from "./frame.ts";

describe("pickFrame", () => {
  it("gives the five frames at the design’s sizes", () => {
    expect(pickFrame({ width: 390, height: 844, fine: false })).toBe("phone");
    expect(pickFrame({ width: 768, height: 1024, fine: false })).toBe("tablet");
    expect(pickFrame({ width: 1024, height: 768, fine: false })).toBe("tablet-sideways");
    expect(pickFrame({ width: 844, height: 390, fine: false })).toBe("phone-sideways");
    expect(pickFrame({ width: 1280, height: 800, fine: true })).toBe("laptop");
  });

  it("goes by the window and the input, never the step’s own width: a laptop stays a laptop, a narrow window is a phone", () => {
    expect(pickFrame({ width: 1280, height: 800, fine: true })).toBe("laptop");
    expect(pickFrame({ width: 599, height: 800, fine: true })).toBe("phone");
    expect(pickFrame({ width: 600, height: 900, fine: false })).toBe("tablet");
    expect(pickFrame({ width: 900, height: 499, fine: false })).toBe("phone-sideways");
    expect(pickFrame({ width: 900, height: 500, fine: false })).toBe("tablet-sideways");
  });

  it("docks the tools as a tray, at the side, or under the field on a laptop (no Narzędzia)", () => {
    expect(toolsAt("phone")).toBe("tray");
    expect(toolsAt("tablet")).toBe("tray");
    expect(toolsAt("tablet-sideways")).toBe("side");
    expect(toolsAt("phone-sideways")).toBe("side");
    expect(toolsAt("laptop")).toBe("under");
  });
});

describe("keyboardInset", () => {
  it("is how far the system keyboard covers the window, and 0 while it is down", () => {
    expect(keyboardInset(844, { height: 844, offsetTop: 0 })).toBe(0);
    expect(keyboardInset(844, { height: 508, offsetTop: 0 })).toBe(336);
    expect(keyboardInset(844, { height: 508, offsetTop: 40 })).toBe(296);
  });
});
