/**
 * The System page (dl-uukj.29.46): every entry of its menu has a section on the page, the Lesson
 * frame group included, and the group's live parts render. The stage's states come from a written
 * example's scenarios, and no lesson plays or is linked. happy-dom lays nothing out, so the
 * observers the page uses are stubbed.
 */

import { copy, TABLES } from "@jadwigo/copy";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { DESIGN_LINES } from "./data.ts";
import { FRAME_KINDS, FRAME_RULES, MEASURES } from "./frame/data.ts";
import { FRAME_SECTIONS } from "./frame/sections.tsx";
import { stageQuestion } from "./question.ts";
import { MENU, PAGE_IDS, SystemPage } from "./SystemPage.tsx";

class Quiet {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeAll(() => {
  globalThis.IntersectionObserver ??= Quiet as unknown as typeof IntersectionObserver;
  globalThis.ResizeObserver ??= Quiet as unknown as typeof ResizeObserver;
  // A laptop's pointer, so a footer column that names no frame would be the laptop's.
  window.matchMedia = ((query: string) => ({
    matches: query.includes("pointer: fine"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

describe("the System page", () => {
  it("draws a section for every entry of its menu", () => {
    const { container } = render(<SystemPage />);
    const missing = PAGE_IDS.filter((id) => container.querySelector(`[id="${id}"]`) === null);
    expect(missing).toEqual([]);
  });

  it("has the Lesson frame group in its menu, one page per section", () => {
    const at = MENU.findIndex((e) => "heading" in e && e.heading === "Lesson frame");
    expect(at).toBeGreaterThan(-1);
    for (const f of FRAME_SECTIONS) expect(PAGE_IDS).toContain(f.id);
  });

  it("shows the 18 rules, every frame and the measurement table", () => {
    const { container } = render(<SystemPage />);
    expect(container.querySelectorAll("[data-frame-rule]")).toHaveLength(18);
    expect(container.querySelectorAll("[data-frame-kind]")).toHaveLength(FRAME_KINDS.length);
    // dl-uukj.29.53 built all five; the three touch frames preview with ?input=touch.
    expect(FRAME_KINDS.every((f) => f.built)).toBe(true);
    expect(
      FRAME_KINDS.filter((f) => f.touch)
        .map((f) => f.id)
        .sort(),
    ).toEqual(["phone-sideways", "tablet", "tablet-sideways"]);
    for (const m of MEASURES)
      expect(Object.keys(m.cells).sort()).toEqual(FRAME_KINDS.map((f) => f.id).sort());
    // Rules 7 and 8 were amended by the Choose session: the answer sits in the page, and only the
    // keypad and the letter row are docked (dl-uukj.29.83). Rule 9 by the Enter session: no
    // Narzędzia on a laptop, the sign keys under the field (dl-uukj.29.104).
    expect(FRAME_RULES.filter((r) => r.amended).map((r) => FRAME_RULES.indexOf(r) + 1)).toEqual([
      3, 4, 7, 8, 9,
    ]);
    expect(FRAME_RULES[8]?.body).not.toContain("tools panel");
  });

  it("freezes every footer state in a phone and a laptop column", () => {
    const { container } = render(<SystemPage />);
    const states = container.querySelectorAll("[data-system-footer]");
    expect(states.length).toBe(6);
    for (const s of states) {
      expect(s.querySelector('[data-frame-cell="phone"] [data-bar]')).not.toBeNull();
      expect(s.querySelector('[data-frame-cell="laptop"] [data-bar]')).not.toBeNull();
      // Each column names its frame, whatever the window (frame.ts data-frame-preview).
      expect(
        s.querySelector('[data-frame-cell="phone"] [data-step-shell]')?.getAttribute("data-frame"),
      ).toBe("phone");
      expect(
        s.querySelector('[data-frame-cell="laptop"] [data-step-shell]')?.getAttribute("data-frame"),
      ).toBe("laptop");
    }
  });

  it("lists every design line in Interface words", () => {
    expect(DESIGN_LINES).toEqual(Object.keys(TABLES.pl).filter((k) => k.startsWith("ds_")));
    const { container } = render(<SystemPage />);
    for (const key of DESIGN_LINES)
      expect(container.querySelector(`[data-line="${key}"]`), key).not.toBeNull();
    expect(container.textContent).toContain(copy("pl", "ds_end_title"));
  });

  it("draws the stage's states from the written example, and links no lesson", () => {
    const { container } = render(<SystemPage />);
    const q = stageQuestion("pl");
    // A frozen option names no id: it is found by its place among the written options.
    const tone = (state: string, option: string) =>
      container
        .querySelectorAll(`[data-system-band="${state}"] li[data-tone]`)
        [q.options.findIndex((o) => o.id === option)]?.getAttribute("data-tone");
    expect(tone("miss", q.miss)).toBe("amber");
    expect(tone("right", q.right)).toBe("green");
    expect(tone("solution", q.right)).toBe("green");
    expect(container.querySelector('a[href*="/lessons/"], iframe')).toBeNull();
  });
});
