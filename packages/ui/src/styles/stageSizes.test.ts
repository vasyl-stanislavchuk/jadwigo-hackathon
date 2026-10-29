/**
 * The sizes per answer kind the stage holds (dl-uukj.29.36, docs/plan/lesson-stage.md "Sizes per
 * answer kind", lesson-frame README §2-§3), read from the stylesheet and the parts that set them.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A file as these checks read it: comments out, and Biome's formatting undone, so a selector or a
 * line reads as it was written: quotes single, and a rule or a call that Biome wrapped onto several
 * lines back on one.
 */
const flat = (text: string): string =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"/g, "'")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/,?\s+\)/g, ")");
const read = (path: string): string => flat(readFileSync(join(import.meta.dirname, path), "utf-8"));
const STAGE = read("stage.css");
const rule = (selector: string): string => {
  const at = STAGE.indexOf(`${selector} {`);
  expect(at, selector).toBeGreaterThanOrEqual(0);
  return STAGE.slice(at, STAGE.indexOf("}", at));
};

describe("sizes per answer kind", () => {
  it("Sprawdź and Dalej are 22 px in every frame", () => {
    expect(rule("[data-bar] .kid-action")).toContain("font-size: 1.375rem");
  });

  it("one number field is 180 wide, 160 on a phone", () => {
    expect(rule(".kid-step-shell [data-entry='number']")).toContain("width: 11.25rem");
    expect(
      rule(
        ".kid-step-shell:is([data-frame='phone'], [data-frame='phone-sideways']) [data-entry='number']",
      ),
    ).toContain("width: 10rem");
  });

  it("a wide answer breaks out to 1120 on a laptop only, within the stage", () => {
    const wide = rule(".kid-step-shell[data-frame='laptop'] [data-area='answer'] [data-wide]");
    expect(wide).toContain("min(70rem, 100cqw - 10rem)");
    // On a phone a wide answer never breaks out: it keeps the column and scrolls in its own box.
    expect(
      rule(".kid-step-shell[data-frame='phone'] [data-area='answer'] div[data-wide]"),
    ).not.toContain("--kid-wide");
  });

  it("a phone on its side puts the fields beside a picture, the fields taking the wider share", () => {
    expect(STAGE).toContain(
      "[data-frame='phone-sideways'] [data-stage]:has(> [data-area='stem'] :is(img, [data-figure]))",
    );
    expect(STAGE).toContain("grid-template-columns: minmax(0, 2fr) minmax(0, 3fr)");
  });

  it("keypad digits are 30 px", () => {
    expect(read("../../../lesson-kit/src/parts/Keypad.tsx")).toContain(
      "const DIGIT = cn(TILE, 'min-h-[var(--kid-key-size)] text-[1.875rem]')",
    );
  });

  // Enter addendum 4.1 and 3.1 (dl-uukj.29.104). The addendum gives the docks as 324 and 376, but
  // its own key sizes make the keypad body 312 (four rows of 72, three gaps of 8) and 376 (the 56
  // row and its gap on top), and the dock, with its 2px line and padding 12 16 16, 342 and 406.
  // dl-uukj.29.111: the top padding is 32, so the fold arrow's 28 below the dock line hides no key:
  // the docks are 362 and 426.
  // dl-uukj.29.140 (owner 2026-10-29): under 720 px of height the docked keys are the kid layer's
  // 56, never less, so at 360x640 the dock is 298 (four rows of 56, three gaps of 8, 50 around).
  it("a short phone's docked keys drop to the kid tap minimum, 56", () => {
    expect(STAGE).toContain(
      "@media (height < 45rem) { .kid-step-shell[data-framed] [data-tools-dock] { --kid-key-size: var(--kid-tap-min); } }",
    );
    expect(read("kids.css")).toContain("--kid-tap-min: 3.5rem;");
  });

  it("the phone keypad: keys 72 and 8 apart, the sign row 56, docked under a 2px line, padding 32 16 16", () => {
    const pad = read("../../../lesson-kit/src/parts/Keypad.tsx");
    expect(read("kids.css")).toContain("--kid-key-size: 4.5rem;");
    expect(pad).toContain(
      "const PAD_SIGN = cn(TILE, 'min-h-[var(--kid-tap-min)] min-w-0 text-[1.75rem]')",
    );
    expect(pad).toContain("<div data-keypad className='grid grid-cols-3 gap-2'>");
    const dock = rule(".kid-step-shell[data-framed] [data-tools-dock]");
    expect(dock).toContain("padding: 2rem 1rem 1rem");
    expect(dock).toContain("border-top: 0.125rem solid");
    const body = { number: 4 * 72 + 3 * 8, expression: 56 + 8 + 4 * 72 + 3 * 8 };
    expect(body).toEqual({ number: 312, expression: 376 });
    expect({
      number: body.number + 2 + 32 + 16,
      expression: body.expression + 2 + 32 + 16,
    }).toEqual({ number: 362, expression: 426 });
    // The 56 arrow is centred on the line, so it ends 28 into the padding, 4 above the top key row.
    expect(rule("[data-tools-dock] > [data-fold]")).toContain("translate: 0 -50%");
    expect(32 - 56 / 2).toBe(4);
  });

  it("the laptop’s sign keys are 56 × 56, 26 px, 8 apart, under the field", () => {
    const pad = read("../../../lesson-kit/src/parts/Keypad.tsx");
    expect(pad).toContain(
      "const STRIP_SIGN = cn(TILE, 'min-h-[var(--kid-tap-min)] min-w-[var(--kid-tap-min)] text-[1.625rem]')",
    );
    expect(pad).toContain(
      "<div data-signs='strip' data-quiet={quiet ? '' : undefined} aria-disabled={quiet || undefined} className='flex flex-wrap gap-2' >",
    );
  });

  it("no round control on the lesson screen: the fold a 56 square, more below a 48 square, letter keys 10px corners", () => {
    const fold = rule(".kid-step-shell [data-fold]");
    expect(fold).toContain("width: 3.5rem");
    expect(fold).toContain("height: 3.5rem");
    expect(fold).toContain("border-radius: 1rem");
    const more = rule("[data-more-below]");
    expect(more).toContain("width: 3rem");
    expect(more).toContain("border-radius: 1rem");
    expect(rule("[data-tools-dock] > [data-fold]")).not.toContain("border-radius");
    for (const part of ["Keypad.tsx", "LetterRow.tsx", "StepShell.tsx", "Tools.tsx"])
      expect(read(`../../../lesson-kit/src/parts/${part}`), part).not.toContain("rounded-full");
    expect(STAGE).not.toMatch(/\[data-(fold|more-below)\][^{]*\{[^}]*9999px/);
  });

  it("the letter row: one row of ten 56 keys on a wide laptop column, two rows of five 48 tall on a phone, 6 apart", () => {
    expect(rule(".kid-step-shell [data-letters]")).toContain("gap: 0.375rem");
    // Two rows of five in a laptop column under 640, one row of ten from 640 (Slots addendum 3.2).
    expect(rule(".kid-step-shell[data-frame='laptop'] [data-letters]")).toContain(
      "grid-template-columns: repeat(5, 3.5rem)",
    );
    expect(STAGE).toMatch(
      /@container \(min-width: 40rem\) \{\s*\.kid-step-shell\[data-frame='laptop'\] \[data-letters\] \{\s*grid-template-columns: repeat\(10, 3\.5rem\)/,
    );
    expect(rule(".kid-step-shell[data-frame='phone'] [data-letters]")).toContain(
      "grid-template-columns: repeat(5, minmax(0, 1fr))",
    );
    expect(
      rule(".kid-step-shell[data-frame='phone'] [data-letters] > [data-slot='button']"),
    ).toContain("height: 3rem");
  });

  it("no tools panel and no Narzędzia button are styled any more", () => {
    expect(STAGE).not.toContain("[data-tools-panel]");
    expect(STAGE).not.toContain("[data-tools-button]");
  });

  it("a match pair stacks on a phone, the fixed card over the one that moves (dl-uukj.29.69)", () => {
    expect(
      rule(
        ".kid-step-shell:is([data-frame='phone'], [data-frame='phone-sideways']) [data-sort-id]:has(> [data-beside])",
      ),
    ).toContain("flex-direction: column");
    expect(read("../../../lesson-kit/src/parts/SortableList.tsx")).toContain("<span data-beside");
  });

  it("a graph's labels are HTML at the option size, outside the drawing, so none is cut or shrinks (dl-uukj.29.69, dl-uukj.29.71)", () => {
    const graph = read("../../../lesson-kit/src/parts/BarGraph.tsx");
    expect(graph).toContain("const LABEL = 'text-[length:var(--kid-answer-size)]");
    expect(graph).not.toMatch(/<text\b/);
    expect(graph).not.toContain("<foreignObject");
  });

  it("a table fits the phone column: cells pad 4, a gap in a cell is 56, and anything wider scrolls in its box (dl-uukj.29.74)", () => {
    expect(
      rule(".kid-step-shell[data-frame='phone'] [data-area='answer'] div[data-wide]"),
    ).toContain("overflow-x: auto");
    expect(rule(".kid-step-shell[data-frame='phone'] [data-wide] :is(th, td)")).toContain(
      "padding-inline: 0.25rem",
    );
    expect(
      rule(".kid-step-shell[data-frame='phone'] [data-wide] :is(th, td) [data-field]"),
    ).toContain("min-width: var(--kid-tap-min)");
    // Outside a lesson the fold arrow keeps a row of its own above a table, which takes the full
    // width (in a lesson the arrow is on the dock, dl-uukj.29.83).
    expect(
      rule(
        ".kid-step-shell:not([data-framed])[data-frame='phone'][data-tools] [data-area='answer']:has(div[data-wide])",
      ),
    ).toContain("padding-right: 0");
  });

  // dl-uukj.29.127, owner 2026-10-27: on a short phone the face takes the room above its fields.
  it("a clock read on a phone sizes its face to the room, 200 when it fits and never under 160", () => {
    const clock = rule(
      ".kid-step-shell[data-frame='phone'] [data-stage]:has([data-field='h']) [data-figure='clock'] svg",
    );
    expect(clock).toContain("width: clamp(10rem, var(--kid-clock-room), 12.5rem)");
    const room = (/--kid-clock-room: calc\(([\s\S]*?)\);/.exec(clock)?.[1] ?? "")
      .replace(/\s+/g, " ")
      .trim();
    // The room on a phone in a lesson: top bar 56, footer 96, number dock 362, fold arrow 28 over the line.
    const face = (height: number, tray = 362, overhang = 28): number => {
      const px = room
        .replace("100dvh", `${height}`)
        .replace("var(--kid-topbar-height)", "56")
        .replace("var(--kid-bar-height, 6rem)", "96")
        .replace("var(--kid-tray-height, 0px)", `${tray}`)
        .replace("var(--kid-fold-overhang, 0px)", `${overhang}`)
        .replace(/([\d.]+)rem/g, (_, n: string) => `${Number(n) * 16}`);
      expect(px).toMatch(/^[\d.\s+-]+$/);
      return Math.min(200, Math.max(160, Function(`return ${px}`)() as number));
    };
    // 844 - 72 - (96 + 362 + 28 + 16) - 34 - 64
    expect(face(844)).toBe(172);
    expect(face(932)).toBe(200);
    expect(face(700)).toBe(160);
    // With the tools folded the face is 200 again.
    expect(face(844, 0, 0)).toBe(200);
  });
});
