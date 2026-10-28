import { afterEach, describe, expect, it } from "vitest";
import { installKeyboardFocus, isKeyboardUse, listMove } from "./keyboardFocus.ts";

describe("the keyboard frame follows the keyboard", () => {
  installKeyboardFocus();
  const root = document.documentElement;
  afterEach(() => root.removeAttribute("data-input"));

  it("marks the root after a tap, so focus the app moves then shows no frame", () => {
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(root.getAttribute("data-input")).toBe("pointer");
  });

  it("clears the mark at the next key the child presses", () => {
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(root.hasAttribute("data-input")).toBe(false);
  });

  it("reads a modifier alone, or a shortcut, as no keyboard use", () => {
    expect(isKeyboardUse({ key: "Shift", metaKey: false, ctrlKey: false, altKey: false })).toBe(
      false,
    );
    expect(isKeyboardUse({ key: "r", metaKey: true, ctrlKey: false, altKey: false })).toBe(false);
    expect(isKeyboardUse({ key: "Enter", metaKey: false, ctrlKey: false, altKey: false })).toBe(
      true,
    );
    expect(isKeyboardUse({ key: "1", metaKey: false, ctrlKey: false, altKey: false })).toBe(true);
  });
});

describe("↑ and ↓ in an open list (Slots addendum 2.2)", () => {
  it("starts from no option: ↓ to the first, ↑ to the last", () => {
    expect(listMove("ArrowDown", -1, 3)).toBe(0);
    expect(listMove("ArrowUp", -1, 3)).toBe(2);
  });

  it("moves to a neighbour and stops at the ends", () => {
    expect(listMove("ArrowDown", 0, 3)).toBe(1);
    expect(listMove("ArrowDown", 2, 3)).toBe(2);
    expect(listMove("ArrowUp", 0, 3)).toBe(0);
    expect([listMove("Home", 2, 3), listMove("End", 0, 3)]).toEqual([0, 2]);
  });

  it("leaves every other key, and an empty list, alone", () => {
    expect(listMove("Enter", 0, 3)).toBeNull();
    expect(listMove("ArrowDown", -1, 0)).toBeNull();
  });
});
