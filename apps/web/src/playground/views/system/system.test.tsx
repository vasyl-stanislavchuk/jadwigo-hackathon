/**
 * The System page (dl-uukj.29.46): every entry of its menu has a section on the page, the Lesson
 * frame group included, and the group's live parts render. The stage's states come from a written
 * example's scenarios, and no lesson plays or is linked. App pages sits outside the lesson's scope
 * and draws the kit's parts; tiles and still answers, and the owner's gaps, have their sections
 * (dl-uukj.32.12), and they show the owner's answers to those gaps (dl-uukj.32.19). happy-dom lays nothing out, so the observers the page uses are stubbed.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { copy, TABLES } from "@jadwigo/copy";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { AUTHORED, fakeApi } from "../../examples/fixture.ts";
import { loadExamples, PlaygroundApi } from "../../examples/index.ts";
import { APP_PAGE_ROLES, DESIGN_LINES, PARENT_OUTCOMES } from "./data.ts";
import { FRAME_KINDS, FRAME_RULES, MEASURES } from "./frame/data.ts";
import { FRAME_SECTIONS } from "./frame/sections.tsx";
import { declaredAt } from "./live.ts";
import { stageExample, stageQuestion } from "./question.ts";
import { MENU, PAGE_IDS, SystemPage } from "./SystemPage.tsx";

/** Zeszyt's stylesheet as written, and the readout its phone block declares: the System page must
 * draw the phone's sample at exactly that, never at a size of its own. */
const FOUNDATION = readFileSync(
  join(import.meta.dirname, "../../../../../../packages/ui/src/styles/foundation.css"),
  "utf-8",
);
const PHONE_TARGET = /--jw-size-target:\s*([^;]+);/
  .exec(
    /@media \(width < 37\.5rem\)\s*\{\s*:root\s*\{([^}]*)\}/.exec(
      FOUNDATION.replace(/\/\*[\s\S]*?\*\//g, ""),
    )?.[1] ?? "",
  )?.[1]
  ?.trim();

const API = fakeApi();
const page = () => (
  <PlaygroundApi.Provider value={API}>
    <SystemPage />
  </PlaygroundApi.Provider>
);

class Quiet {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

beforeAll(async () => {
  await loadExamples(API, "pl");
  await loadExamples(API, "en");
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
    const { container } = render(page());
    const missing = PAGE_IDS.filter((id) => container.querySelector(`[id="${id}"]`) === null);
    expect(missing).toEqual([]);
  });

  it("has the Lesson frame group in its menu, one page per section", () => {
    const at = MENU.findIndex((e) => "heading" in e && e.heading === "Lesson frame");
    expect(at).toBeGreaterThan(-1);
    for (const f of FRAME_SECTIONS) expect(PAGE_IDS).toContain(f.id);
  });

  it("shows the 18 rules, every frame and the measurement table", () => {
    const { container } = render(page());
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
    const { container } = render(page());
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
    const { container } = render(page());
    for (const key of DESIGN_LINES)
      expect(container.querySelector(`[data-line="${key}"]`), key).not.toBeNull();
    expect(container.textContent).toContain(copy("pl", "ds_end_title"));
  });

  it("draws the stage's states from the written example, and links no lesson", () => {
    const { container } = render(page());
    const q = stageQuestion(stageExample(AUTHORED), "pl");
    // A frozen option names no id: it is found by its place among the written options.
    const tone = (state: string, option: string) =>
      container
        .querySelectorAll(`[data-system-band="${state}"] li[data-tone]`)
        [q.options.findIndex((o) => o.id === option)]?.getAttribute("data-tone");
    expect(tone("miss", q.miss)).toBe("try_again");
    expect(tone("right", q.right)).toBe("green");
    expect(tone("solution", q.right)).toBe("green");
    expect(container.querySelector('a[href*="/lessons/"], iframe')).toBeNull();
  });
});

describe("the System page's app pages and tiles (dl-uukj.32.12)", () => {
  it("has App pages and Tiles and still answers in its menu, and no gaps for the owner", () => {
    for (const id of ["app-pages", "still-answers"]) expect(PAGE_IDS).toContain(id);
    expect(PAGE_IDS).not.toContain("gaps");
  });

  it("draws App pages outside the lesson's scope, with the rest of the page inside it", () => {
    const { container } = render(page());
    const app = container.querySelector("section#app-pages [data-app-pages]");
    expect(app).not.toBeNull();
    expect(app?.closest("[data-lesson-theme]")).toBeNull();
    for (const id of ["metaphor", "components", "still-answers", "stage", "lines"])
      expect(
        container.querySelector(`section#${id}`)?.closest("[data-lesson-theme]"),
        id,
      ).not.toBeNull();
  });

  it("builds the app pages from the kit's parts, and lists every role of the adult's register", () => {
    render(page());
    const lesson = within(
      screen.getByRole("region", { name: "A parent's page, drawn by the kit" }),
    );
    for (const level of [1, 2, 3])
      expect(lesson.getAllByRole("heading", { level })).toHaveLength(1);
    expect(lesson.getByRole("textbox", { name: "Adres e-mail" })).toBeTruthy();
    expect(lesson.getByRole("button", { name: "Wyślij kod" })).toBeTruthy();
    expect(lesson.getByRole("status").textContent).toContain("Kod wysłaliśmy");
    expect(lesson.getByRole("link", { name: "Wróć do listy lekcji" })).toBeTruthy();
    // The parent's icon set and words, never the child's star and sprout.
    expect(lesson.getAllByRole("img").map((i) => i.getAttribute("aria-label"))).toEqual([
      "6 × 7: Od razu",
      "8 × 9: Jeszcze nie",
      "7 × 7: Pominięte",
    ]);
    const table = screen.getByRole("table", { name: "The app-page register, live" });
    for (const r of APP_PAGE_ROLES)
      expect(within(table).getByText(r.token, { selector: "code" })).toBeTruthy();
    // The owner's adult scale (dl-uukj.32.19), with the rest of the register kept.
    expect(APP_PAGE_ROLES.map((r) => r.token)).toEqual([
      "--page-prose-max",
      "--jw-page-h1",
      "--jw-page-h2",
      "--jw-page-body",
      "--jw-page-leading",
      "--jw-size-small",
      "--jw-control-height",
      "--jw-control-height-sm",
      "--jw-card",
      "--jw-ink",
      "--jw-line",
      "--jw-act",
      "--jw-radius-small",
    ]);
  });

  it("draws the parent's home card of option 1b: a title link, a date, small tiles, the overview link", () => {
    render(page());
    const home = within(
      screen.getByRole("region", { name: "The parent's home, drawn by the kit" }),
    );
    expect(home.getByRole("heading", { level: 1 }).textContent).toBe("Konto rodzica");
    expect(home.getByRole("heading", { level: 2 }).textContent).toBe("Uczestnik 1");
    const card = home.getByRole("link", { name: "Równe grupy" }).closest("[data-home-card]");
    expect(card).not.toBeNull();
    const inCard = within(card as HTMLElement);
    expect(inCard.getByText("30 października 2026")).toBeTruthy();
    const tiles = inCard.getAllByRole("img");
    expect(tiles.map((t) => t.getAttribute("data-outcome"))).toEqual([
      "first_try",
      "got_there",
      "not_yet",
      "first_try",
      "skipped",
      "not_asked",
    ]);
    expect(tiles.every((t) => t.className.split(" ").includes("size-8"))).toBe(true);
    expect(inCard.getByRole("link", { name: "Wszystkie podejścia do tej lekcji" })).toBeTruthy();
    for (const name of ["Dodaj dziecko", "Wyloguj się"])
      expect(home.getByRole("button", { name }).getAttribute("data-variant")).toBe("outline");
  });

  it("draws the readout pair, the outcome tile in 5 tones and 3 sizes, and names what waits on the kit", () => {
    const { container } = render(page());
    const section = container.querySelector("section#still-answers") as HTMLElement;
    // No stylesheet in happy-dom: the window's readout alone, never a "phone" sample at its size.
    expect(
      [...section.querySelectorAll("[data-readout]")].map((r) => [
        r.getAttribute("data-readout"),
        r.querySelectorAll("[data-task-target]").length,
      ]),
    ).toEqual([["laptop", 1]]);
    expect(section.querySelector("[data-readout-words]")?.textContent).toContain(
      "could not be read from the stylesheet",
    );
    expect(PARENT_OUTCOMES.map((o) => [o.outcome, o.tone])).toEqual([
      ["first_try", "right"],
      ["got_there", "right-soft"],
      ["not_yet", "miss"],
      ["skipped", "plain"],
      ["open", "plain"],
      ["not_asked", "empty"],
    ]);
    expect(new Set(PARENT_OUTCOMES.map((o) => o.tone))).toEqual(
      new Set(["right", "right-soft", "miss", "plain", "empty"]),
    );
    const outcomes = PARENT_OUTCOMES.map((o) => o.outcome);
    const tiles = within(section).getAllByRole("img");
    expect(tiles.map((t) => t.getAttribute("data-outcome"))).toEqual([
      ...outcomes,
      ...outcomes,
      ...outcomes,
    ]);
    // 40 in the legend, then a row at 32 and one at 28.
    expect(tiles.map((t) => t.className.match(/(?:^|\s)size-(\d+)(?:\s|$)/)?.[1])).toEqual([
      ...outcomes.map(() => "10"),
      ...outcomes.map(() => "8"),
      ...outcomes.map(() => "7"),
    ]);
    expect(
      [...section.querySelectorAll("[data-system-waiting]")].map((w) =>
        w.getAttribute("data-system-waiting"),
      ),
    ).toEqual(["The kid tile", "StillAnswer"]);
  });

  it("reads the readout's laptop and phone values from foundation.css as the browser parses it", () => {
    // happy-dom's CSSOM parses the phone block's @media rule, so the reader runs on the real file.
    const sheet = document.createElement("style");
    sheet.textContent = FOUNDATION;
    document.head.append(sheet);
    try {
      expect(declaredAt("--jw-size-target", true)).toBe("2.25rem");
      expect(declaredAt("--jw-size-target", false)).toBe("2.75rem");
    } finally {
      sheet.remove();
    }
    expect(declaredAt("--jw-size-target", true)).toBe("");
  });

  it("draws the phone's readout at the value foundation.css's phone block declares", () => {
    expect(PHONE_TARGET).toMatch(/rem$/);
    const sheet = document.createElement("style");
    sheet.textContent = FOUNDATION;
    document.head.append(sheet);
    try {
      const { container } = render(page());
      const phone = container.querySelector('[data-readout="phone"]');
      expect(phone?.querySelector("[data-task-target]")).not.toBeNull();
      expect(
        phone?.querySelector<HTMLElement>("div")?.style.getPropertyValue("--jw-size-target"),
      ).toBe(PHONE_TARGET);
      expect(phone?.querySelector("figcaption")?.textContent).toBe(`${PHONE_TARGET}, on a phone`);
      expect(container.querySelector("[data-readout-words]")).toBeNull();
    } finally {
      sheet.remove();
    }
  });

  it("puts the readout and the adult's sizes in the type scale", () => {
    const { container } = render(page());
    const scale = [...container.querySelectorAll("[data-scale]")].map((s) =>
      s.getAttribute("data-scale"),
    );
    for (const token of [
      "--jw-size-math",
      "--jw-size-target",
      "--jw-page-h1",
      "--jw-page-h2",
      "--jw-page-body",
    ])
      expect(scale).toContain(token);
  });
});
