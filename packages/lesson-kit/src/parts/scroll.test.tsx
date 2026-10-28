/**
 * The frame's one scroll (paper-behaviour README §3.1 rule 2, §3.7): the least distance between
 * the clear edges, a jump under reduced motion, and nothing while a pointer is down.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { GAP, openDelta, scrollByAnimated, scrollDelta, scrollToShow } from "./scroll.ts";

const view = 800;
const insets = { top: 56 + GAP, bottom: 96 + GAP };

afterEach(() => {
  vi.restoreAllMocks();
  document.dispatchEvent(new Event("pointerup"));
});

describe("openDelta (Slots addendum 2.5)", () => {
  it("shows the instruction down to the field when it fits, and else the field above the dock", () => {
    const field = { top: 900, bottom: 956 };
    // Fits: instruction at 60, field ends at 600 inside 72..688.
    expect(openDelta({ top: 60, bottom: 600 }, { top: 544, bottom: 600 }, view, insets)).toBe(
      60 - 72,
    );
    // Does not fit: the field's bottom lands 16 px over the footer, the instruction scrolls off.
    expect(openDelta({ top: 60, bottom: 956 }, field, view, insets)).toBe(956 - (800 - 112));
  });
});

describe("scrollDelta", () => {
  it("does not move a box already between the edges", () => {
    expect(scrollDelta({ top: 100, bottom: 300 }, view, insets)).toBe(0);
  });

  it("moves the least that puts a box under the footer 16 px above it", () => {
    expect(scrollDelta({ top: 600, bottom: 740 }, view, insets)).toBe(740 - (800 - 112));
  });

  it("moves the least that brings a box above the top bar 16 px under it", () => {
    expect(scrollDelta({ top: 10, bottom: 80 }, view, insets)).toBe(10 - 72);
  });

  it("stops a box taller than the room with its top 16 px under the top bar", () => {
    expect(scrollDelta({ top: 400, bottom: 1600 }, view, insets)).toBe(400 - 72);
  });
});

describe("scrolling", () => {
  const reduce = (on: boolean) =>
    vi.spyOn(window, "matchMedia").mockImplementation(
      (q: string) =>
        ({
          matches: on && q.includes("reduce"),
          media: q,
          addEventListener() {},
          removeEventListener() {},
        }) as unknown as MediaQueryList,
    );

  it("jumps at once under reduced motion", () => {
    reduce(true);
    const to = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const raf = vi.spyOn(window, "requestAnimationFrame");
    scrollByAnimated(200);
    expect(raf).not.toHaveBeenCalled();
    expect(to).toHaveBeenCalledWith({ top: window.scrollY + 200 });
  });

  it("eases over frames otherwise", () => {
    reduce(false);
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    scrollByAnimated(200);
    expect(raf).toHaveBeenCalledOnce();
  });

  it("does nothing while a pointer is down", () => {
    reduce(true);
    const to = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const box = document.createElement("div");
    document.body.append(box);
    vi.spyOn(box, "getBoundingClientRect").mockReturnValue({ top: 2000, bottom: 2100 } as DOMRect);
    document.dispatchEvent(new Event("pointerdown"));
    scrollToShow(box);
    expect(to).not.toHaveBeenCalled();
    document.dispatchEvent(new Event("pointerup"));
    scrollToShow(box);
    expect(to).toHaveBeenCalledOnce();
    box.remove();
  });
});
