/**
 * The Choose family session's decisions (addendum docs/plan/design-system/choose/choose-2026-10-26.md,
 * decision dl-n501, lane dl-uukj.29.84), one test per rule:
 * - 1.4 the whole-set mark is an outline outside the set, so no option moves by a pixel between
 *   untouched, picked, a miss, the whole-set mark, right and the solution;
 * - 1.5 on a centred tile "tried" and the solution's word sit on the tile's top edge;
 * - 1.6 a centred tile's badge leaves the flow, in the corner for a dot array;
 * - 2.2 A to E is a numbered list on screen with keys 1 to 5 and no letters, and paper keeps them;
 * - 2.3 Pick the rectangle is gone, its items are Pick the number with dot arrays (fixes dl-uukj.29.79);
 * - 2.4 Mark the numbers sets its lines 68 apart.
 *
 * happy-dom draws no boxes, so "nothing moves" is pinned on what sets a box: an option's classes
 * other than its colours, and a group that never takes a border or a padding. The real rects were
 * measured in /playground (docs/plan/widgets/img/dl-uukj.29.84/). Invented items only.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { Feedback, PageHelp } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { QUESTION_TYPES } from "../questionTypes.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { ViewMode, type ViewModeName, type ViewProps } from "../view.ts";
import { ChooseView } from "./ChooseView.tsx";

afterEach(cleanup);
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-26T00:00:00.000Z" }) };
const miss = (parts?: { id: string; correct: boolean }[]): Feedback => ({
  kind: "try_again",
  index: 0,
  ...(parts ? { parts } : {}),
});
const praise: Feedback = { kind: "praise", index: 0 };

const numbers = (ns: number[]) =>
  ns.map((n, i) => ({ id: `o${i + 1}`, content: { kind: "number" as const, number: n } }));

/** Which are even? Several, in a grid of centred tiles. */
const many: SpecOf<typeof Family.Choose> = {
  id: "m1",
  say: "Which are even?",
  question_type: QuestionType.MultiSelect,
  family: Family.Choose,
  data: { options: numbers([12, 7, 18, 25]), select: "many", layout: "grid" },
  key: { correct: ["o1", "o3"] },
};

/** A to E: five lettered options. */
const lettered: SpecOf<typeof Family.Choose> = {
  id: "l1",
  say: "How many are left? Pick one of the numbers: 24, 29, 19, 15 or 1.",
  question_type: QuestionType.LetteredChoice,
  family: Family.Choose,
  data: {
    stem: { text: "How many are left?", text_replaces_say: true },
    options: [24, 29, 19, 15, 1].map((n, i) => ({
      id: must("ABCDE"[i]),
      letter: must("ABCDE"[i]),
      content: { kind: "number" as const, number: n },
    })),
    select: "one",
    layout: "lettered",
  },
  key: { correct: ["C"] },
};

/** Dot arrays in a grid. */
const arrays: SpecOf<typeof Family.Choose> = {
  id: "a1",
  say: "Which rectangle shows three times four?",
  question_type: QuestionType.Recognition,
  family: Family.Choose,
  data: {
    stem: { text: "$3 \\times 4$" },
    options: [
      { id: "o1", content: { kind: "array", rows: 3, cols: 4 } },
      { id: "o2", content: { kind: "array", rows: 3, cols: 5 } },
    ],
    select: "one",
    layout: "grid",
  },
  key: { correct: ["o1"] },
};

function draw(spec: SpecOf<typeof Family.Choose>, mode: ViewModeName = ViewMode.Play) {
  const onCommit = vi.fn();
  const tree = (
    feedback: Feedback | null,
    attemptNo: number,
    live: boolean,
    solution: { chosen: string[] } | null,
  ) => (
    <StepFrame stepId={spec.id}>
      <ChooseView
        {...({
          mode,
          spec: pageSpec(spec),
          language: "en",
          category: "child",
          clock,
          live,
          attemptNo,
          feedback,
          onCommit,
          solution,
          around: {
            checking: false,
            moveOn: null,
            ladder: { help: null as PageHelp | null, ask: null, refused: false },
          },
        } as unknown as ViewProps<typeof Family.Choose>)}
      />
    </StepFrame>
  );
  const out = render(tree(null, 1, true, null));
  const again = (
    feedback: Feedback | null,
    attemptNo = 2,
    live = true,
    solution: { chosen: string[] } | null = null,
  ) => act(() => out.rerender(tree(feedback, attemptNo, live, solution)));
  return { onCommit, again };
}

/** The classes that set an option's box: everything but its colours and its cursor. */
const COLOUR =
  /^(?:border-(?:primary|border|dashed|solid|kid-[\w-]+|muted[\w/-]*|current|transparent)|bg-[\w/-]+|text-kid-[\w-]+|ring-[\w/-]+|cursor-[\w-]+|line-through)$/;
const box = (el: Element) =>
  [...el.classList]
    .filter((c) => !COLOUR.test(c))
    .sort()
    .join(" ");
const options = () => [...document.querySelectorAll<HTMLElement>("[data-option]")];
const group = () => must(document.querySelector<HTMLElement>("[data-whole]"));

describe("1.4 the whole-set mark is drawn outside", () => {
  it("no option and no group changes its box between untouched, picked, a miss, the whole-set mark and right", () => {
    const { again } = draw(many);
    const boxes = () => options().map(box);
    const untouched = boxes();
    const plain = box(group());
    fireEvent.click(must(screen.getAllByRole("checkbox")[0]), { detail: 0 });
    fireEvent.click(must(screen.getAllByRole("checkbox")[1]), { detail: 0 });
    expect(boxes()).toEqual(untouched);
    again(miss([{ id: "o2", correct: false }]));
    expect(boxes()).toEqual(untouched);
    again(miss(), 3);
    expect(group().getAttribute("data-whole")).toBe("amber");
    expect(boxes()).toEqual(untouched);
    again(praise, 3, false);
    expect(group().getAttribute("data-whole")).toBe("green");
    expect(boxes()).toEqual(untouched);
    // The mark is an outline 6 px out, with no border, padding or fill of its own.
    for (const tone of ["amber", "green"] as const) {
      if (tone === "amber") again(miss(), 4);
      else again(praise, 4, false);
      const cls = [...group().classList];
      expect(cls).toEqual(
        expect.arrayContaining(["outline-2", "outline-offset-[0.375rem]", "rounded-2xl"]),
      );
      expect(cls.filter((c) => /^(?:p[xytrbl]?-|border|bg-)/.test(c))).toEqual([]);
      expect(cls.filter((c) => !/^outline/.test(c)).join(" ")).toBe(plain);
    }
    expect(group().className).toContain("outline-solid");
  });

  it("the solution keeps each option’s box too", () => {
    const { again } = draw(many);
    const untouched = options().map(box);
    fireEvent.click(must(screen.getAllByRole("checkbox")[1]), { detail: 0 });
    again(null, 2, false, { chosen: ["o1", "o3"] });
    const still = [...document.querySelectorAll<HTMLElement>("li[data-tone]")];
    expect(still).toHaveLength(4);
    expect(still.map(box)).toEqual(untouched.map(() => box(must(still[0]))));
    expect(document.querySelectorAll("[data-solution]")).toHaveLength(2);
    // The badges stay, the same numbers, so only colours change (dl-uukj.29.86).
    expect(still.map((li) => li.querySelector("[data-key-badge]")?.textContent)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
  });
});

describe("1.5 words on centred tiles sit on the top edge", () => {
  it('"tried" on a grid tile is a label on its top edge, not a line inside it', () => {
    const { again } = draw(many);
    fireEvent.click(must(screen.getAllByRole("checkbox")[1]), { detail: 0 });
    again(miss([{ id: "o2", correct: false }]));
    const label = must(must(options()[1]).querySelector("[data-edge-label]"));
    expect(label.textContent).toBe("tried");
    expect(label.className).toContain("absolute");
    expect(label.className).toContain("top-[-0.8125rem]");
    expect(label.className).toContain("border-dashed");
    expect(must(options()[1]).className).toContain("relative");
  });

  it("the solution’s eye and word ride on the edge of a centred tile, and stay inside a list row", () => {
    const { again } = draw(many);
    again(null, 2, false, { chosen: ["o1", "o3"] });
    const labels = [...document.querySelectorAll("[data-solution] [data-edge-label]")];
    expect(labels).toHaveLength(2);
    expect(
      labels.every((l) => l.hasAttribute("data-solution-label") && l.querySelector("svg") !== null),
    ).toBe(true);
    cleanup();
    const list = draw({ ...many, data: { ...many.data, layout: "list" } });
    list.again(null, 2, false, { chosen: ["o1", "o3"] });
    expect(document.querySelectorAll("[data-edge-label]")).toHaveLength(0);
    expect(document.querySelectorAll("[data-solution] [data-solution-label]")).toHaveLength(2);
  });

  // dl-uukj.29.94: beside a row of pictures the eye and "Rozwiązanie" wrapped at 390 and grew the
  // row from 72 to 104, and "tried" under the pictures grew the picked row to 88. Measured in
  // /playground on Khan xeed556cbf7457092 (docs/plan/widgets/img/dl-uukj.29.94/).
  it('a list row of pictures hangs "tried" and the solution on its top edge, so its box is the same at a miss and the solution', () => {
    const picture = (alt: string) => ({
      src: "data:image/png;base64,iVBORw0KGgo=",
      alt,
      width: 70,
      height: 30,
    });
    const rows: SpecOf<typeof Family.Choose> = {
      id: "p1",
      say: "Which picture shows three times two?",
      question_type: QuestionType.Recognition,
      family: Family.Choose,
      data: {
        options: [
          {
            id: "o1",
            content: {
              kind: "pictures",
              pictures: [picture("two cats"), picture("two cats"), picture("two cats")],
            },
          },
          {
            id: "o2",
            content: { kind: "pictures", pictures: [picture("three dogs"), picture("three dogs")] },
          },
          { id: "o3", content: { kind: "text", text: "none of these" } },
        ],
        select: "one",
        layout: "list",
      },
      key: { correct: ["o1"] },
    };
    const { again } = draw(rows);
    const untouched = options().map(box);
    fireEvent.click(must(screen.getAllByRole("radio")[1]), { detail: 0 });
    again(miss([{ id: "o2", correct: false }]));
    expect(options().map(box)).toEqual(untouched);
    const tried = must(must(options()[1]).querySelector("[data-edge-label]"));
    expect(tried.textContent).toBe("tried");
    expect(tried.className).toContain("whitespace-nowrap");
    again(null, 2, false, { chosen: ["o1"] });
    const still = [...document.querySelectorAll<HTMLElement>("li[data-tone]")];
    const solution = must(must(still[0]).querySelector("[data-edge-label]"));
    expect(solution.hasAttribute("data-solution-label")).toBe(true);
    expect(solution.className).toContain("absolute");
    expect(must(still[0]).className).toContain("relative");
    // The pictures keep the row to themselves; a text row keeps its words inside, as today.
    expect(still.map(box)).toEqual([box(must(still[0])), box(must(still[0])), box(must(still[2]))]);
    expect(must(still[2]).querySelector("[data-edge-label]")).toBeNull();
  });
});

describe("1.6 key badges in centred tiles", () => {
  it("a number tile’s badge sits at its side, a dot array’s in its corner, a list row’s in the row", () => {
    draw(many);
    expect(options().map((o) => o.getAttribute("data-badge-at"))).toEqual([
      "side-4",
      "side-4",
      "side-4",
      "side-4",
    ]);
    cleanup();
    draw(arrays);
    expect(options().map((o) => o.getAttribute("data-badge-at"))).toEqual(["corner", "corner"]);
    cleanup();
    draw({ ...many, data: { ...many.data, layout: "list" } });
    expect(options().some((o) => o.hasAttribute("data-badge-at"))).toBe(false);
    expect(document.querySelectorAll("[data-key-badge]")).toHaveLength(4);
  });
});

describe("2.2 A to E is a numbered list on screen", () => {
  it("draws as a list with badges 1 to 5 and no letters", () => {
    draw(lettered);
    expect(document.querySelectorAll("[data-key-badge]")).toHaveLength(5);
    expect([...document.querySelectorAll("[data-key-badge]")].map((b) => b.textContent)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(options().map((o) => o.textContent?.replace(/^\d/, ""))).toEqual([
      "24",
      "29",
      "19",
      "15",
      "1",
    ]);
    expect(must(document.querySelector('[role="radiogroup"]')).className).toContain("flex-col");
  });

  it("keys 1 to 5 pick, and A to E do nothing", () => {
    draw(lettered);
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    must(radios[0]).focus();
    for (const key of ["a", "b", "c", "d", "e", "C"])
      fireEvent.keyDown(must(document.activeElement), { key });
    expect(radios.some((r) => r.checked)).toBe(false);
    fireEvent.keyDown(must(document.activeElement), { key: "5" });
    expect(must(radios[4]).checked).toBe(true);
    fireEvent.keyDown(must(document.activeElement), { key: "3" });
    expect(must(radios[2]).checked).toBe(true);
  });

  it("paper still prints the letters", () => {
    draw(lettered, ViewMode.Print);
    const items = [...document.querySelectorAll("li[data-tone]")];
    expect(items.map((li) => li.textContent)).toEqual(["A24", "B29", "C19", "D15", "E1"]);
  });

  it("the screen’s still view (a preview, a review, the solution) shows no letters", () => {
    draw(lettered, ViewMode.Preview);
    expect([...document.querySelectorAll("li[data-tone]")].map((li) => li.textContent)).toEqual([
      "24",
      "29",
      "19",
      "15",
      "1",
    ]);
  });

  it('the catalogue calls it "Multiple choice", and its words name no A to E (dl-uukj.29.96)', () => {
    const info = must(QUESTION_TYPES.find((q) => q.name === QuestionType.LetteredChoice));
    expect(info.label).toBe("Multiple choice");
    for (const words of [info.label, info.does, info.fits])
      expect(words).not.toMatch(/\bA\s*(–|-|to)\s*E\b|lettered answers/);
  });
});

describe("2.3 Pick the rectangle is removed", () => {
  it("is not a question type", () => {
    expect(QUESTION_TYPES.map((q) => q.name)).not.toContain("spatial_pick");
    expect(Object.values(QuestionType)).not.toContain("spatial_pick");
  });
});

describe("2.4 Mark the numbers: line spacing", () => {
  it("sets the text’s lines 68 apart and each token at line-height 1, centred in its line", () => {
    draw({
      id: "i1",
      say: "Tap the numbers you need.",
      question_type: QuestionType.MarkNumbers,
      family: Family.Choose,
      data: {
        stem: { text: "Tom has {o1} boxes of {o2} crayons and {o3} friends." },
        options: numbers([3, 4, 5]),
        select: "many",
        layout: "inline",
      },
      key: { correct: ["o1", "o2"], near: { o3: "distractor_number" } },
    });
    const text = must(document.querySelector('[role="group"]'));
    expect(text.className).toContain("leading-[4.25rem]");
    // The words keep their distance from the whole-set mark in every state (owner, 2026-10-26).
    expect(text.className).toContain("px-3");
    expect(text.className).toContain("py-1");
    const tokens = [...text.querySelectorAll("[aria-pressed]")];
    expect(tokens).toHaveLength(3);
    expect(
      tokens.every(
        (t) => t.className.includes("leading-none") && t.className.includes("align-middle"),
      ),
    ).toBe(true);
  });
});
