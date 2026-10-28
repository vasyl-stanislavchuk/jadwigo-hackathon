/**
 * The Gaps view's template is rich text with the gaps as its slots (dl-w3.51.10): a gap inside
 * bold, in a list or in a table cell draws there, the gaps are numbered in reading order, a typed
 * and a chosen gap share a sentence, and the one keypad types into the number gap that has the
 * focus, so Tab moves it along the reading order.
 */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { Feedback } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
import type { SlotsData } from "./model.ts";
import { SlotsView } from "./SlotsView.tsx";

// A step test is written for a phone window, 390 x 844: the lesson picks its frame from the window
// (parts/frame.ts), and happy-dom opens at 1024 x 768.
beforeAll(() => {
  (
    window as unknown as {
      happyDOM: { setViewport(size: { width: number; height: number }): void };
    }
  ).happyDOM.setViewport({ width: 390, height: 844 });
});

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-18T00:00:00.000Z" }) };

function spec(data: SlotsData): PageSpecOf<typeof Family.Slots> {
  return {
    id: "s1",
    say: "Fill in the gaps.",
    question_type: QuestionType.FillGaps,
    family: Family.Slots,
    data,
  };
}

function play(data: SlotsData, initial?: Record<string, string>) {
  const onCommit = vi.fn();
  const at = (feedback: Feedback | null) => (
    <StepFrame stepId="s1">
      <SlotsView
        mode={ViewMode.Play}
        spec={spec(data)}
        language="en"
        category="child"
        clock={clock}
        live
        attemptNo={1}
        feedback={feedback}
        onCommit={onCommit}
        initialValue={initial ? { gaps: initial } : undefined}
      />
    </StepFrame>
  );
  const { rerender } = render(at(null));
  return Object.assign(onCommit, { verdict: (feedback: Feedback) => rerender(at(feedback)) });
}

const gap = (n: number) => screen.getByLabelText(`Gap ${n}`);
const number = (id: string) => ({ id, kind: Family.Enter, input: "number" }) as const;

describe("Gaps: the template is rich text", () => {
  it("draws a gap inside bold and gaps in a list, numbered in reading order", () => {
    play({
      template: "**Six times {g1}** is 24.\n\n- 6 × 5 = {g2}\n- 6 × 6 = {g3}",
      gaps: [number("g1"), number("g2"), number("g3")],
    });
    expect(gap(1).closest("strong")).not.toBeNull();
    expect(gap(2).closest("li")).not.toBeNull();
    expect(gap(3).closest("li")).not.toBeNull();
    const labels = [...document.querySelectorAll('[aria-label^="Gap "]')].map((e) =>
      e.getAttribute("aria-label"),
    );
    expect(labels).toEqual(["Gap 1", "Gap 2", "Gap 3"]);
  });

  it("draws a gap in a table cell next to TeX", () => {
    play({
      template: "Expression | Value\n-|-\n$3 \\times 4$ | {g1}\n$4 \\times 4$ | {g2}",
      gaps: [number("g1"), number("g2")],
    });
    expect(gap(1).closest("td")).not.toBeNull();
    expect(gap(2).closest("td")).not.toBeNull();
    expect(document.querySelector("[data-tex]")).not.toBeNull();
  });

  it("lets a typed gap and a chosen gap share a sentence, and commits both", () => {
    const onCommit = play({
      template: "There are {g1} {g2}.",
      gaps: [
        number("g1"),
        {
          id: "g2",
          kind: Family.Choose,
          options: [
            { id: "c1", label: "turtles" },
            { id: "c2", label: "ducks" },
          ],
        },
      ],
    });
    fireEvent.click(screen.getByRole("button", { name: "7" }), { detail: 0 });
    fireEvent.click(gap(2), { detail: 0 });
    fireEvent.click(screen.getByRole("option", { name: "ducks" }), { detail: 0 });
    expect(must(gap(2).querySelector("[data-pick]")).textContent).toBe("ducks");
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { g1: "7", g2: "c2" } });
  });

  it("types into the number gap that has the focus: Tab moves the keypad along the reading order", () => {
    play({ template: "{g1} + {g2} = 12", gaps: [number("g1"), number("g2")] });
    fireEvent.click(screen.getByRole("button", { name: "5" }), { detail: 0 });
    fireEvent.focus(gap(2));
    fireEvent.click(screen.getByRole("button", { name: "7" }), { detail: 0 });
    expect(gap(1).textContent).toBe("5");
    expect(gap(2).textContent).toBe("7");
  });

  it("keeps a command as written, monospace, with its spaces", () => {
    play({
      template: "bd {g1} dl-42 --status {g2}",
      code: true,
      gaps: [
        { id: "g1", kind: Family.Enter, input: "text" },
        {
          id: "g2",
          kind: Family.Choose,
          options: [
            { id: "c1", label: "open" },
            { id: "c2", label: "closed" },
          ],
        },
      ],
    });
    const line = must(gap(1).closest("p"));
    expect(line.className).toContain("font-mono");
    expect(line.textContent).toContain("dl-42 --status");
  });

  it("keeps a typed gap inside its word: mr, the box, z, in order on one line, the box clear of the letters (dl-w3.68.24)", () => {
    play({
      template: "Zimą na dworze jest mr{g1}z.",
      gaps: [{ id: "g1", kind: Family.Enter, input: "text" }],
    });
    const box = gap(1);
    const word = must(box.closest("[data-word]"));
    expect(word.className).toContain("whitespace-nowrap");
    expect([...word.childNodes].map((n) => (n.contains(box) ? "box" : n.textContent))).toEqual([
      "mr",
      "box",
      "z.",
    ]);
    expect(word.previousSibling?.textContent).toBe("Zimą na dworze jest ");
    // A gap inside a word is a cell two letters wide with no space either side (Slots addendum 3.2): the
    // cell takes off the margin a word's gap keeps elsewhere, and nothing pulls the box over the letters.
    expect(box.className).toContain("mx-[var(--gap-mx,0.375rem)]");
    expect(box.closest<HTMLElement>("[data-in-word]")?.style.getPropertyValue("--gap-mx")).toBe(
      "0",
    );
    expect(box.className).not.toMatch(/(^|\s)(-m|absolute|fixed)/);
  });
});

describe("Gaps: a typed gap is the Enter field, as wide as its length setting (Slots addendum 3.1)", () => {
  it("keeps its width whatever is typed, and the word around a gap inside it holds", () => {
    play({
      template: "Zimą na dworze jest mr{g1}z.",
      gaps: [{ id: "g1", kind: Family.Enter, input: "text", max_length: 3 }],
    });
    const box = gap(1) as HTMLInputElement;
    const width = box.style.width;
    expect(width).toBe("var(--gap-w, calc(1.65em + 2.25rem))");
    expect(box.className).toContain("h-[var(--gap-h,4rem)]");
    for (const text of ["ó", "óó", "rzż"]) {
      fireEvent.change(box, { target: { value: text } });
      expect(box.style.width).toBe(width);
    }
    expect(must(box.closest("[data-word]")).className).toContain("whitespace-nowrap");
    expect(
      [...must(box.closest("[data-word]")).childNodes].map((n) =>
        n.contains(box) ? "box" : n.textContent,
      ),
    ).toEqual(["mr", "box", "z."]);
  });

  it("a word is drawn for 9 letters, a number for 4 digits, one character as a square", () => {
    play({
      template: "To jest {g1}, {g2} i {g3}.",
      gaps: [
        { id: "g1", kind: Family.Enter, input: "text" },
        number("g2"),
        { ...number("g3"), max_length: 1 },
      ],
    });
    expect(gap(1).style.width).toBe("var(--gap-w, calc(4.95em + 2.25rem))");
    fireEvent.change(gap(1), { target: { value: "żółwie" } });
    expect(gap(1).style.width).toBe("var(--gap-w, calc(4.95em + 2.25rem))");
    expect(gap(2).style.width).toBe("var(--gap-w, calc(2.4em + 2.125rem))");
    expect(gap(2).style.minWidth).toBe("var(--gap-min-w, 4.5rem)");
    expect(gap(3).style.width).toBe("var(--gap-w, 4rem)");
  });

  it("a maths line stands at the maths size, a sentence at the answer size", () => {
    play({ template: "6 × {g1} = 54", gaps: [number("g1")] });
    expect(gap(1).closest('[class*="kid-math-size"]')).not.toBeNull();
    cleanup();
    play({ template: "Kuba ma {g1} jabłek.", gaps: [number("g1")] });
    expect(gap(1).closest('[class*="kid-math-size"]')).toBeNull();
    expect(gap(1).closest('[class*="kid-answer-size"]')).not.toBeNull();
  });
});

describe("Gaps: a table of cells (fill_table, dl-w3.51.5)", () => {
  it("draws the header and rows with the gaps as cells, numbered row by row after the template", () => {
    const onCommit = play({
      template: "Seven times:",
      table: { header: ["×", "3", "5"], rows: [["7", "{g1}", "{g2}"]] },
      gaps: [number("g1"), number("g2")],
    });
    expect(screen.getByRole("columnheader", { name: "×" })).toBeTruthy();
    expect(gap(1).closest('[role="cell"]')).not.toBeNull();
    expect(gap(2).closest('[role="cell"]')).not.toBeNull();
    expect([...document.querySelectorAll('[role="cell"]')].map((td) => td.textContent)).toEqual([
      "7",
      " ",
      " ",
    ]);
    fireEvent.click(screen.getByRole("button", { name: "2" }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "1" }), { detail: 0 });
    fireEvent.click(gap(2), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "3" }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "5" }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { g1: "21", g2: "35" } });
  });

  it("turns a one-row table of more than four columns on a phone, the header the left column (addendum 4.2)", () => {
    play({
      template: "",
      table: {
        header: ["×", "1", "2", "3", "4", "5"],
        rows: [["7", "7", "14", "{g1}", "28", "{g2}"]],
      },
      gaps: [number("g1"), number("g2")],
    });
    const table = must(document.querySelector<HTMLElement>("[data-table]"));
    expect(table.hasAttribute("data-turned")).toBe(true);
    expect(table.style.gridTemplateColumns).toBe(
      "minmax(5rem, max-content) minmax(7.5rem, max-content)",
    );
    expect(screen.getAllByRole("rowheader").map((h) => h.textContent)).toEqual([
      "×",
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    // A cell that holds only a typed gap gives it the cell's size, less 10.
    const cell = must(gap(1).closest<HTMLElement>("[data-cell]"));
    expect(cell.dataset["cell"]).toBe("g1");
    expect(cell.style.getPropertyValue("--gap-w")).toBe("6.875rem");
    expect(cell.style.getPropertyValue("--gap-h")).toBe("4rem");
  });

  it("keeps a table of four columns, or of two rows, as written", () => {
    play({
      template: "",
      table: {
        header: ["×", "1", "2", "3", "4"],
        rows: [
          ["7", "7", "14", "{g1}", "28"],
          ["8", "8", "16", "24", "{g2}"],
        ],
      },
      gaps: [number("g1"), number("g2")],
    });
    expect(document.querySelector("[data-turned]")).toBeNull();
    expect(
      must(document.querySelector<HTMLElement>("[data-table]")).style.gridTemplateColumns,
    ).toBe("repeat(5, minmax(5rem, max-content))");
  });

  it("draws no header row when every header cell is empty, and no template line when it is empty", () => {
    play({
      template: "",
      table: { header: ["", ""], rows: [["$8 \\times 9$", "= {g1}"]] },
      gaps: [number("g1")],
    });
    expect(document.querySelector('[role="columnheader"]')).toBeNull();
    expect(document.querySelector('[data-area="answer"] p:not([data-too-soon-live])')).toBeNull();
    expect(must(gap(1).closest('[role="cell"]')).querySelector("[data-tex]")).toBeNull();
    expect(document.querySelector('[role="cell"] [data-tex]')).not.toBeNull();
  });

  it("every cell is at least 72 tall, more than a tap target (addendum 4.2)", () => {
    play({
      template: "",
      table: { header: ["a", "b"], rows: [["1", "{g1}"]] },
      gaps: [number("g1")],
    });
    const cells = [...document.querySelectorAll<HTMLElement>("[data-table] > *")];
    expect(cells).toHaveLength(4);
    for (const cell of cells) expect(cell.style.minHeight).toBe("4.5rem");
  });
});

describe("Gaps: markers on a picture (label_picture, dl-w3.51.2)", () => {
  const picture = {
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"/>',
    alt: "A number line with two blanks.",
    width: 380,
    height: 80,
  };
  const options = [
    { id: "c1", label: "8" },
    { id: "c2", label: "13" },
    { id: "c3", label: "14" },
  ];
  const data: SlotsData = {
    picture,
    template: "7 × 2 = {g3}",
    gaps: [
      { id: "g1", kind: Family.Choose, at: { x: 55.4, y: 74.1 }, options },
      { id: "g2", kind: Family.Choose, at: { x: 91.4, y: 78.3 }, options },
      number("g3"),
    ],
  };

  it("draws each placed gap over the picture at its percent position, numbered before the template, and the picture keeps its size", () => {
    play(data);
    const img = must(document.querySelector("img"));
    expect([
      img.getAttribute("width"),
      img.getAttribute("height"),
      img.getAttribute("alt"),
    ]).toEqual(["380", "80", picture.alt]);
    const marker = must(document.querySelector<HTMLElement>('[data-gap-at="g1"]'));
    // A strip (80 tall) puts the gap under its point, with a stem up to it (dl-uukj.29.72).
    expect([marker.style.left, marker.style.top]).toEqual(["55.4%", "calc(100% + 0.75rem)"]);
    const stem = must(document.querySelector<HTMLElement>('[data-gap-stem="g1"]'));
    expect([stem.style.left, stem.style.top]).toEqual(["55.4%", "74.1%"]);
    // The wrapper is sized to its picture, never stretched by the step's flex column (2026-10-19).
    expect(must(document.querySelector("[data-labelled]")).className).toMatch(/\bw-fit\b/);
    expect(must(document.querySelector("[data-labelled]")).className).toMatch(/\bself-start\b/);
    expect(marker.contains(gap(1))).toBe(true);
    expect(must(document.querySelector<HTMLElement>('[data-gap-at="g2"]')).contains(gap(2))).toBe(
      true,
    );
    expect(gap(3).closest("p")).not.toBeNull();
  });

  it("keeps the gaps on their points on a picture taller than a strip", () => {
    play({ ...data, picture: { ...picture, height: 300 } });
    const marker = must(document.querySelector<HTMLElement>('[data-gap-at="g1"]'));
    expect(marker.style.top).toBe("74.1%");
    expect(document.querySelector("[data-gap-stem]")).toBeNull();
  });

  it("opens the marker's menu outside the picture, so nothing moves, and commits the labels with the typed number", () => {
    const onCommit = play(data);
    fireEvent.click(gap(1), { detail: 0 });
    const list = screen.getByRole("listbox", { name: "Gap 1" });
    expect(must(document.querySelector('[data-gap-at="g1"]')).contains(list)).toBe(false);
    fireEvent.click(within(list).getByRole("option", { name: "8" }), { detail: 0 });
    fireEvent.click(gap(2), { detail: 0 });
    fireEvent.click(screen.getByRole("option", { name: "14" }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "1" }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "4" }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({
      gaps: { g1: "c1", g2: "c3", g3: "14" },
    });
  });
});

describe("Gaps: a chosen gap is a menu (cloze, dl-w3.29)", () => {
  const passage: SlotsData = {
    template: "The number 14 is {g1} and 9 is {g2}.",
    gaps: ["g1", "g2"].map(
      (id) =>
        ({
          id,
          kind: Family.Choose,
          options: [
            { id: "c1", label: "even" },
            { id: "c2", label: "**odd**" },
          ],
        }) as const,
    ),
  };

  it("opens on a keyboard activation (Enter), lists the options as rich text, and closes on Escape with nothing picked", () => {
    play(passage);
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(gap(1), { detail: 0 });
    const list = screen.getByRole("listbox", { name: "Gap 1" });
    expect(
      within(list).getByRole("option", { name: "odd" }).querySelector("strong"),
    ).not.toBeNull();
    fireEvent.keyDown(list, { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(must(gap(1).querySelector("[data-pick]")).getAttribute("data-pick")).toBe("");
  });

  it("shows the pick inline, and holds every option unseen in the slot so the sentence never moves", () => {
    play(passage);
    const ghosts = () =>
      [...gap(2).querySelectorAll('[aria-hidden="true"].invisible')].map((e) => e.textContent);
    expect(ghosts()).toEqual(["even", "odd"]);
    fireEvent.click(gap(2), { detail: 0 });
    fireEvent.click(screen.getByRole("option", { name: "odd" }), { detail: 0 });
    expect(must(gap(2).querySelector("[data-pick]")).textContent).toBe("odd");
    expect(ghosts()).toEqual(["even", "odd"]);
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("commits every pick at once, as option ids", () => {
    const onCommit = play(passage);
    fireEvent.click(gap(1), { detail: 0 });
    fireEvent.click(screen.getByRole("option", { name: "even" }), { detail: 0 });
    fireEvent.click(gap(2), { detail: 0 });
    fireEvent.click(screen.getByRole("option", { name: "odd" }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { g1: "c1", g2: "c2" } });
  });

  // dl-w3.68.2: after a right answer the chosen form reads as a word of the sentence (screen 06).
  const twoForms: SlotsData = {
    template: "Latem jedziemy nad {g1}.",
    gaps: [
      {
        id: "g1",
        kind: Family.Choose,
        options: [
          { id: "c1", label: "morze" },
          { id: "c2", label: "może" },
        ],
      },
    ],
  };

  // Slots addendum 2.2 (dl-uukj.29.123): right, it is green like a typed gap; no dotted underline.
  it("turns green like a typed gap after a right answer: no menu, as wide as the menu was", () => {
    const p = play(twoForms, { g1: "c1" });
    p.verdict({ kind: "praise", index: 0 });
    expect(screen.queryByRole("button", { name: "Gap 1" })).toBeNull();
    expect(document.querySelector('[aria-haspopup="listbox"]')).toBeNull();
    const word = must(document.querySelector('[data-reads-whole="g1"]'));
    expect(word.getAttribute("data-tone")).toBe("green");
    expect(word.className).toContain("border-kid-correct");
    expect(word.querySelector(".underline")).toBeNull();
    expect(must(word.querySelector("[data-pick]")).textContent).toBe("morze");
    expect([...word.querySelectorAll(".invisible")].map((e) => e.textContent)).toEqual([
      "morze",
      "może",
      "",
    ]);
  });

  it("stays a menu after a miss, and reads whole in the solution view", () => {
    const p = play(twoForms, { g1: "c2" });
    p.verdict({ kind: "try_again", index: 0 });
    expect(gap(1).getAttribute("aria-haspopup")).toBe("listbox");
    expect(document.querySelector("[data-reads-whole]")).toBeNull();
    cleanup();
    render(
      <SlotsView
        mode={ViewMode.Solution}
        spec={spec(twoForms)}
        language="en"
        category="child"
        clock={clock}
        value={{ gaps: { g1: "c2" } }}
        solution={{ gaps: { g1: "c1" } }}
      />,
    );
    expect(must(document.querySelector('[data-reads-whole="g1"]')).textContent).toContain("morze");
    expect(screen.getByLabelText("Your answer").textContent).toBe("może");
  });
});

describe('Gaps: the solution after "I don\'t know yet" (dl-uukj.29.52)', () => {
  it("keeps the child's gaps as left, a miss marked, in their play boxes, and repeats nothing (Slots addendum 6)", () => {
    const data: SlotsData = {
      template: "{g1} × 4 = {g2}, and {g3} more.",
      gaps: [number("g1"), number("g2"), number("g3")],
    };
    render(
      <StepFrame stepId="s1">
        <SlotsView
          mode={ViewMode.Play}
          spec={spec(data)}
          language="en"
          category="child"
          clock={clock}
          live={false}
          attemptNo={2}
          feedback={null}
          onCommit={vi.fn()}
          initialValue={{ gaps: { g1: "5", g2: "16" } }}
          solution={{ gaps: { g1: "5", g2: "20", g3: "3" } }}
        />
      </StepFrame>,
    );
    // The child's gaps: the right one plain, the wrong one marked, the empty one dashed; nothing green.
    expect([gap(1), gap(2), gap(3)].map((g) => [g.textContent?.trim(), g.dataset["tone"]])).toEqual(
      [
        ["5", "idle"],
        ["16", "amber"],
        ["", "idle"],
      ],
    );
    expect(gap(3).className).toContain("border-dashed");
    expect(document.querySelector('[data-tone="green"]')).toBeNull();
    // Each gap keeps the field it had in play, so nothing moves a pixel.
    for (const g of [gap(1), gap(2), gap(3)])
      expect(g.style.width).toBe("var(--gap-w, calc(2.4em + 2.125rem))");
    // No box repeats the body: the solution card under the step holds the worked lines.
    expect(document.querySelector("[data-solution]")).toBeNull();
    expect(document.querySelector("[data-solution-label]")).toBeNull();
    // The body is what "Jeszcze nie wiem" scrolls to when the step has no card (paper-behaviour README §3.6).
    expect(gap(1).closest("[data-solution-line]")).not.toBeNull();
  });
});

describe("Gaps: sizes per answer kind (dl-uukj.29.36, docs/plan/lesson-stage.md)", () => {
  it("a number field among others is sized by its length, a one-digit slot is a square, and a table is a wide answer", () => {
    play({
      template: "{g1} zł {g2} gr",
      gaps: [
        { ...number("g1"), max_length: 2 },
        { ...number("g2"), max_length: 1 },
      ],
      table: { header: ["a"], rows: [["b"]] },
    });
    expect(gap(1).style.width).toBe("var(--gap-w, calc(1.2em + 2.125rem))");
    expect(gap(1).style.minWidth).toBe("var(--gap-min-w, 4.5rem)");
    expect(gap(2).style.width).toBe("var(--gap-w, 4rem)");
    expect(document.querySelector("[data-table]")?.closest("[data-wide]")).not.toBeNull();
  });
});
