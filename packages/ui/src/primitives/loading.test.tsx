// @vitest-environment happy-dom
// Loading (dl-7wlo.44) as a person meets it: one status, named in the page's words, centred in the
// room it holds; the loading cast as a decorative <img> that waits 300 ms, falls back to nothing on
// a load error, and is the still file whenever the device asks for reduced motion.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import gumkaLarge from "../brand/loading-gumka-large.svg";
import gumkaLargeStill from "../brand/loading-gumka-large-still.svg";
import gumkaSmall from "../brand/loading-gumka-small.svg";
import gumkaSmallStill from "../brand/loading-gumka-small-still.svg";
import linijkaLarge from "../brand/loading-linijka-large.svg";
import linijkaLargeStill from "../brand/loading-linijka-large-still.svg";
import linijkaSmall from "../brand/loading-linijka-small.svg";
import linijkaSmallStill from "../brand/loading-linijka-small-still.svg";
import olowekLarge from "../brand/loading-olowek-large.svg";
import olowekLargeStill from "../brand/loading-olowek-large-still.svg";
import olowekSmall from "../brand/loading-olowek-small.svg";
import olowekSmallStill from "../brand/loading-olowek-small-still.svg";
import { Loading, type LoadingCharacter, type LoadingSize, loadingArt } from "./loading.tsx";

const LABEL = "Chwileczkę…";

interface Listening {
  matches: boolean;
  listeners: Set<() => void>;
  removed: number;
}

/** A matchMedia whose reduced-motion answer the test can change, counting its listeners. */
function motion(reduce: boolean): Listening {
  const state: Listening = { matches: reduce, listeners: new Set(), removed: 0 };
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return state.matches;
    },
    media: query,
    addEventListener: (_: string, fn: () => void) => state.listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => {
      state.listeners.delete(fn);
      state.removed += 1;
    },
  }));
  return state;
}

const art = (): HTMLImageElement | null => document.querySelector("[data-slot=loading] img");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-motion-level");
});

describe("loadingArt", () => {
  // Vite inlines a small file as a data URL, so compare with what the import gives, not a name.
  const pairs: [LoadingCharacter, LoadingSize, string, string][] = [
    ["olowek", "page", olowekLarge, olowekLargeStill],
    ["olowek", "block", olowekSmall, olowekSmallStill],
    ["gumka", "page", gumkaLarge, gumkaLargeStill],
    ["gumka", "block", gumkaSmall, gumkaSmallStill],
    ["linijka", "page", linijkaLarge, linijkaLargeStill],
    ["linijka", "block", linijkaSmall, linijkaSmallStill],
  ];

  it.each(pairs)(
    "draws %s on a %s from its own file, and its own still",
    (c, size, moving, still) => {
      expect(loadingArt(c, size, false)).toBe(moving);
      expect(loadingArt(c, size, true)).toBe(still);
    },
  );

  it("gives 12 different files", () => {
    expect(new Set(pairs.flatMap(([, , moving, still]) => [moving, still])).size).toBe(12);
  });
});

describe("Loading", () => {
  it("says the page's words once, and its drawing has no name", () => {
    motion(false);
    render(<Loading label={LABEL} character="olowek" delay={0} />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status", { name: LABEL })).toBeTruthy();
    // The words are the status's name, never drawn; the drawing has no name of its own.
    expect(screen.queryByText(LABEL)).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    const img = art();
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("aria-hidden")).toBe("true");
  });

  it("is the plain spinner without a character, and still one status", () => {
    motion(false);
    const { container } = render(<Loading label={LABEL} size="block" />);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    expect(screen.getByRole("status").getAttribute("data-slot")).toBe("loading");
    expect(container.querySelector("[data-slot=spinner]")?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    expect(art()).toBeNull();
  });

  it("centres both ways in the room a page or a block holds", () => {
    motion(false);
    render(<Loading label={LABEL} size="page" />);
    const page = screen.getByRole("status").className;
    expect(page).toMatch(/(^|\s)items-center(\s|$)/);
    expect(page).toMatch(/(^|\s)justify-center(\s|$)/);
    expect(page).toMatch(/(^|\s)min-h-jw-loading-page(\s|$)/);
    cleanup();
    render(<Loading label={LABEL} size="block" />);
    expect(screen.getByRole("status").className).toMatch(/(^|\s)min-h-jw-loading-block(\s|$)/);
  });

  it("holds the drawing's box from the start and shows it only after 300 ms", () => {
    motion(false);
    vi.useFakeTimers({ now: Date.now() });
    render(<Loading label={LABEL} character="gumka" size="block" />);
    // The status is there at once; only the drawing waits.
    expect(screen.getByRole("status", { name: LABEL })).toBeTruthy();
    expect(art()?.className).toMatch(/(^|\s)invisible(\s|$)/);
    expect(art()?.getAttribute("width")).toBe("112");
    expect(art()?.getAttribute("height")).toBe("64");
    act(() => vi.advanceTimersByTime(299));
    expect(art()?.className).toMatch(/(^|\s)invisible(\s|$)/);
    act(() => vi.advanceTimersByTime(1));
    expect(art()?.className).not.toMatch(/(^|\s)invisible(\s|$)/);
  });

  it("drops its timer when the wait ends first", () => {
    motion(false);
    vi.useFakeTimers({ now: Date.now() });
    const { unmount } = render(<Loading label={LABEL} character="olowek" />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps its words and its room when the drawing fails to load", () => {
    motion(false);
    render(<Loading label={LABEL} character="linijka" delay={0} />);
    const img = art();
    if (img === null) throw new Error("no drawing");
    fireEvent.error(img);
    expect(art()).toBeNull();
    expect(screen.getByRole("status", { name: LABEL })).toBeTruthy();
    expect(screen.getByRole("status").className).toMatch(/(^|\s)min-h-jw-loading-page(\s|$)/);
  });

  it("draws the still file under reduced motion, and follows a change of the setting", () => {
    const device = motion(true);
    render(<Loading label={LABEL} character="olowek" delay={0} />);
    expect(art()?.getAttribute("src")).toBe(olowekLargeStill);
    act(() => {
      device.matches = false;
      for (const fn of device.listeners) fn();
    });
    expect(art()?.getAttribute("src")).toBe(olowekLarge);
    act(() => {
      device.matches = true;
      for (const fn of device.listeners) fn();
    });
    expect(art()?.getAttribute("src")).toBe(olowekLargeStill);
  });

  it("stops listening to the setting when it goes", () => {
    const device = motion(false);
    const { unmount } = render(<Loading label={LABEL} character="gumka" />);
    expect(device.listeners.size).toBe(1);
    unmount();
    expect(device.listeners.size).toBe(0);
    expect(device.removed).toBe(1);
  });

  it("holds still where the page turns motion down", () => {
    motion(false);
    document.documentElement.setAttribute("data-motion-level", "reduced");
    render(<Loading label={LABEL} character="linijka" size="block" delay={0} />);
    expect(art()?.getAttribute("src")).toBe(linijkaSmallStill);
  });

  it("holds still where it cannot ask the device", () => {
    vi.stubGlobal("matchMedia", undefined);
    render(<Loading label={LABEL} character="gumka" delay={0} />);
    expect(art()?.getAttribute("src")).toBe(gumkaLargeStill);
  });
});
