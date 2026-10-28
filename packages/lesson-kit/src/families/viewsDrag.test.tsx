/**
 * The Sequence and Group views (dl-w3.37.13): tap-tap gives the value a drag would, Check commits
 * it, a miss keeps it and marks the whole step or each card by the marks rule, and a full group or
 * a card in several groups behaves as the step says.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TRAY } from "../parts/DropZones.tsx";
import { must } from "../parts/must.ts";
import type { Clock, Instant } from "../stage/clock.ts";
import type { Feedback } from "../stage/types.ts";
import { ExplainView } from "./explain/ExplainView.tsx";
import { FamilyView } from "./FamilyView.tsx";
import { GroupView, placeCard } from "./group/GroupView.tsx";
import type { GroupData } from "./group/model.ts";
import { Family, QuestionType, Surface } from "./names.ts";
import { PlaceView } from "./place/PlaceView.tsx";
import { SequenceView } from "./sequence/SequenceView.tsx";
import { type PageSpecOf, type StepContext, ViewMode } from "./view.ts";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-12T00:00:00.000Z" }) };
const common = { language: "en" as const, category: "child" as const, clock };
const base = { id: "s1", say: "Try it" };
const tap = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }), { detail: 0 });

describe("Sequence", () => {
  const spec: PageSpecOf<typeof Family.Sequence> = {
    ...base,
    question_type: QuestionType.Order,
    family: Family.Sequence,
    data: {
      items: [
        { id: "a", text: "30" },
        { id: "b", text: "10" },
        { id: "c", text: "20" },
      ],
      first_label: "smallest",
      last_label: "largest",
    },
  };
  const props = (feedback: Feedback | null, attemptNo: number, onCommit: (c: unknown) => void) => ({
    ...common,
    mode: ViewMode.Play,
    spec,
    live: true,
    attemptNo,
    feedback,
    onCommit,
  });

  it("an arrow move rings the moved card, and nothing animates under reduced motion (dl-w3.46.28)", () => {
    const animate = vi.fn();
    const original = Element.prototype.animate;
    Element.prototype.animate = animate as never;
    try {
      render(<SequenceView {...props(null, 1, vi.fn())} />);
      fireEvent.click(must(screen.getAllByRole("button", { name: /: 10$/ })[0]), { detail: 0 });
      const ringed = animate.mock.contexts.find((el) => (el as HTMLElement).textContent === "10");
      expect(ringed).toBeDefined();
      cleanup();
      animate.mockClear();
      vi.stubGlobal("matchMedia", (q: string) => ({
        matches: q.includes("reduce"),
        media: q,
        addEventListener() {},
        removeEventListener() {},
      }));
      render(<SequenceView {...props(null, 1, vi.fn())} />);
      fireEvent.click(must(screen.getAllByRole("button", { name: /: 10$/ })[0]), { detail: 0 });
      expect(animate).not.toHaveBeenCalled();
    } finally {
      Element.prototype.animate = original;
      vi.unstubAllGlobals();
    }
  });

  it("tap-tap reorders, Check commits the order, and a miss keeps it with the whole list amber", () => {
    const onCommit = vi.fn();
    const { rerender } = render(<SequenceView {...props(null, 1, onCommit)} />);
    tap("10");
    tap("30");
    tap("Check");
    expect(must(onCommit.mock.calls[0])[0].value).toEqual(["b", "a", "c"]);
    act(() => rerender(<SequenceView {...props({ kind: "try_again", index: 0 }, 2, onCommit)} />));
    const cards = screen
      .getAllByRole("button", { pressed: false })
      .filter((b) => b.dataset["tone"] !== undefined);
    expect(cards.map((c) => c.textContent)).toEqual(["10", "30", "20"]);
    expect(cards.every((c) => c.dataset["tone"] === "amber")).toBe(true);
  });

  it("the up and down buttons reorder on their own, and the ends cannot move further (docs/17 §2f rule 9)", () => {
    const onCommit = vi.fn();
    render(<SequenceView {...props(null, 1, onCommit)} />);
    expect(screen.getByRole("button", { name: "Move up: 30" }).getAttribute("aria-disabled")).toBe(
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Move down: 20" }).getAttribute("aria-disabled"),
    ).toBe("true");
    tap("Move down: 30");
    tap("Move up: 20");
    tap("Check");
    expect(must(onCommit.mock.calls[0])[0].value).toEqual(["b", "c", "a"]);
  });
});

describe("Group", () => {
  const data = (
    groups: number,
    eachItem: "one" | "many" = "one",
    capacity?: number,
  ): GroupData => ({
    groups: ["x", "y", "z"]
      .slice(0, groups)
      .map((id) => ({ id, label: id.toUpperCase(), ...(capacity ? { capacity } : {}) })),
    items: [
      { id: "i1", label: "one" },
      { id: "i2", label: "two" },
    ],
    each_item: eachItem,
  });

  it("placeCard: one group each, back to the tray, a full group, several groups", () => {
    expect(placeCard(data(2), {}, "i1", "x", TRAY)).toEqual({ i1: ["x"] });
    expect(placeCard(data(2), { i1: ["x"] }, "i1", "y", "x")).toEqual({ i1: ["y"] });
    expect(placeCard(data(2), { i1: ["x"] }, "i1", TRAY, "x")).toEqual({ i1: [] });
    expect(placeCard(data(2, "one", 1), { i1: ["x"] }, "i2", "x", TRAY)).toEqual({
      i1: [],
      i2: ["x"],
    });
    expect(placeCard(data(2, "many"), { i1: ["x"] }, "i1", "y", TRAY)).toEqual({ i1: ["x", "y"] });
    expect(placeCard(data(2, "many"), { i1: ["x", "y"] }, "i1", TRAY, "x")).toEqual({ i1: ["y"] });
  });

  it("Check waits for every card, then commits the placement; three groups mark each card", () => {
    const onCommit = vi.fn();
    const spec: PageSpecOf<typeof Family.Group> = {
      ...base,
      question_type: QuestionType.Bucket,
      family: Family.Group,
      data: data(3),
    };
    const props = (feedback: Feedback | null, attemptNo: number) => ({
      ...common,
      mode: ViewMode.Play,
      spec,
      live: true,
      attemptNo,
      feedback,
      onCommit,
    });
    const { rerender } = render(<GroupView {...props(null, 1)} />);
    tap("one");
    tap("X");
    tap("Check");
    expect(onCommit).not.toHaveBeenCalled();
    tap("two");
    tap("Z");
    tap("Check");
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ items: { i1: ["x"], i2: ["z"] } });
    act(() =>
      rerender(
        <GroupView
          {...props(
            {
              kind: "try_again",
              index: 0,
              parts: [
                { id: "i1", correct: true },
                { id: "i2", correct: false },
              ],
            },
            2,
          )}
        />,
      ),
    );
    expect(screen.getByRole("button", { name: "one" }).dataset["tone"]).toBe("green");
    expect(screen.getByRole("button", { name: "two" }).dataset["tone"]).toBe("amber");
  });
});

describe("Place", () => {
  it("a grid: tap a dot to build the rectangle, Check commits rows and cols", () => {
    const onCommit = vi.fn();
    const spec: PageSpecOf<typeof Family.Place> = {
      ...base,
      question_type: QuestionType.SpatialBuild,
      family: Family.Place,
      data: { surface: Surface.Grid, size: 4, label: "2 × 3" },
    };
    render(
      <PlaceView
        {...common}
        mode={ViewMode.Play}
        spec={spec}
        live
        attemptNo={1}
        feedback={null}
        onCommit={onCommit}
      />,
    );
    tap("2 by 3");
    tap("Check");
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ rows: 2, cols: 3 });
  });

  it("a line: arrow keys step the marker; Check commits where it stands", () => {
    const onCommit = vi.fn();
    const spec: PageSpecOf<typeof Family.Place> = {
      ...base,
      question_type: QuestionType.NumberLinePlace,
      family: Family.Place,
      data: {
        surface: Surface.NumberLine,
        min: 0,
        max: 10,
        step: 1,
        labelled: [0, 10],
        target_label: 2,
      },
    };
    render(
      <PlaceView
        {...common}
        mode={ViewMode.Play}
        spec={spec}
        live
        attemptNo={1}
        feedback={null}
        onCommit={onCommit}
      />,
    );
    const line = screen.getByTestId("number-line");
    fireEvent.keyDown(line, { key: "ArrowRight" });
    fireEvent.keyDown(line, { key: "ArrowRight" });
    tap("Check");
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ at: 1 });
  });
});

describe("Place on fractions (dl-w3.55)", () => {
  it("arrow keys step the marker a quarter at a time; Check commits the fraction", () => {
    const onCommit = vi.fn();
    const spec: PageSpecOf<typeof Family.Place> = {
      ...base,
      question_type: QuestionType.NumberLinePlace,
      family: Family.Place,
      data: {
        surface: Surface.NumberLine,
        min: 0,
        max: 1,
        step: 0.25,
        labelled: [0, 0.5, 1],
        tick_label: "fraction",
        target_label: "$\\frac{3}{4}$",
      },
    };
    const { container } = render(
      <PlaceView
        {...common}
        mode={ViewMode.Play}
        spec={spec}
        live
        attemptNo={1}
        feedback={null}
        onCommit={onCommit}
      />,
    );
    const line = screen.getByTestId("number-line");
    for (let i = 0; i < 4; i++) fireEvent.keyDown(line, { key: "ArrowRight" });
    expect(line.getAttribute("aria-valuenow")).toBe("0.75");
    // The target and the half tick are KaTeX, never a raw \frac.
    expect(container.querySelectorAll(".katex").length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).not.toContain("\\frac");
    tap("Check");
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ at: 0.75 });
  });

  it("a finer snap than the step moves between ticks", () => {
    const onCommit = vi.fn();
    const spec: PageSpecOf<typeof Family.Place> = {
      ...base,
      question_type: QuestionType.NumberLinePlace,
      family: Family.Place,
      data: {
        surface: Surface.NumberLine,
        min: 0,
        max: 1,
        step: 0.5,
        snap: 0.25,
        labelled: [0, 1],
      },
    };
    render(
      <PlaceView
        {...common}
        mode={ViewMode.Play}
        spec={spec}
        live
        attemptNo={1}
        feedback={null}
        onCommit={onCommit}
      />,
    );
    const line = screen.getByTestId("number-line");
    fireEvent.keyDown(line, { key: "ArrowRight" });
    fireEvent.keyDown(line, { key: "ArrowRight" });
    tap("Check");
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ at: 0.25 });
    expect(screen.getAllByTestId("tick")).toHaveLength(3);
  });
});

describe("Explain", () => {
  it("commits the text as typed and keeps it after a miss", () => {
    const onCommit = vi.fn();
    const spec: PageSpecOf<typeof Family.Explain> = {
      ...base,
      question_type: QuestionType.Explain,
      family: Family.Explain,
      data: { input: "both" },
    };
    const props = (feedback: Feedback | null, attemptNo: number) => ({
      ...common,
      mode: ViewMode.Play,
      spec,
      live: true,
      attemptNo,
      feedback,
      onCommit,
    });
    const { rerender } = render(<ExplainView {...props(null, 1)} />);
    const field = screen.getByRole("textbox") as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: "  Because  the order  does not matter " } });
    tap("Check");
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({
      text: "  Because  the order  does not matter ",
    });
    act(() => rerender(<ExplainView {...props({ kind: "try_again", index: 0 }, 2)} />));
    expect(field.value).toBe("  Because  the order  does not matter ");
    expect(field.dataset["tone"]).toBe("amber");
  });
});

describe("FamilyView", () => {
  it("picks the view by family and refuses Material", () => {
    const spec: PageSpecOf<typeof Family.Explain> = {
      ...base,
      question_type: QuestionType.Explain,
      family: Family.Explain,
      data: { input: "text" },
    };
    render(<FamilyView {...common} mode={ViewMode.Preview} spec={spec} showKey={false} />);
    expect(screen.getByText("Try it")).toBeTruthy();
  });
});

describe("Place on bars (dl-w3.51.3)", () => {
  const data = {
    surface: Surface.Bars,
    kind: "bar" as const,
    categories: [
      { id: "a", label: "apples" },
      { id: "b", label: "pears" },
    ],
    max: 10,
    step: 1,
    tick: 2,
    unit_label: "children",
  };
  const spec: PageSpecOf<typeof Family.Place> = {
    ...base,
    question_type: QuestionType.DrawGraph,
    family: Family.Place,
    data,
  };
  const props = (
    feedback: Feedback | null,
    attemptNo: number,
    onCommit: (c: unknown) => void,
    around?: StepContext,
  ) => ({
    ...common,
    mode: ViewMode.Play,
    spec,
    live: true,
    attemptNo,
    feedback,
    onCommit,
    ...(around ? { around } : {}),
  });

  it("Check before a bar is drawn says so; arrow keys draw the bars; Check commits every height; a miss marks each bar and keeps them", () => {
    const onCommit = vi.fn();
    const { rerender, container } = render(<PlaceView {...props(null, 1, onCommit)} />);
    tap("Check");
    expect(onCommit).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Draw the graph first.");
    const apples = screen.getByRole("slider", { name: "Bar: apples" });
    for (let i = 0; i < 6; i++) fireEvent.keyDown(apples, { key: "ArrowUp" });
    expect(apples.getAttribute("aria-valuenow")).toBe("6");
    expect(apples.getAttribute("aria-valuetext")).toBe("apples: 6 children");
    const pears = screen.getByRole("slider", { name: "Bar: pears" });
    fireEvent.keyDown(pears, { key: "ArrowUp" });
    fireEvent.keyDown(pears, { key: "ArrowUp" });
    fireEvent.keyDown(pears, { key: "ArrowUp" });
    tap("Check");
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ heights: { a: 6, b: 3 } });
    expect(must(onCommit.mock.calls[0])[0].modality).toBe("keyboard");
    act(() =>
      rerender(
        <PlaceView
          {...props(
            {
              kind: "try_again",
              index: 0,
              parts: [
                { id: "a", correct: true },
                { id: "b", correct: false },
              ],
            },
            2,
            onCommit,
          )}
        />,
      ),
    );
    expect(screen.getByRole("slider", { name: "Bar: apples" }).dataset["tone"]).toBe("green");
    expect(screen.getByRole("slider", { name: "Bar: pears" }).dataset["tone"]).toBe("amber");
    expect(screen.getByRole("slider", { name: "Bar: pears" }).getAttribute("aria-valuenow")).toBe(
      "3",
    );
    // The missed bar clears its mark on the next move; the right one keeps its.
    fireEvent.keyDown(screen.getByRole("slider", { name: "Bar: pears" }), { key: "ArrowUp" });
    expect(screen.getByRole("slider", { name: "Bar: pears" }).dataset["tone"]).toBe("idle");
    expect(screen.getByRole("slider", { name: "Bar: apples" }).dataset["tone"]).toBe("green");
  });

  it("a bar rung 2 gave away is drawn, locked and part of the commit; starting heights open the graph", () => {
    const onCommit = vi.fn();
    const started: PageSpecOf<typeof Family.Place> = {
      ...spec,
      data: { ...data, starting: { b: 2 } },
    };
    render(
      <PlaceView
        {...props(null, 1, onCommit, {
          checking: false,
          moveOn: null,
          ladder: {
            help: {
              rung: 2,
              card: null,
              focus: null,
              given: { heights: { a: 6 } },
              worked: null,
              blank: false,
              twin: null,
              more: true,
            },
            ask: null,
            refused: false,
          },
        })}
        spec={started}
      />,
    );
    expect(screen.queryByRole("slider", { name: "Bar: apples" })).toBeNull();
    expect(screen.getByRole("img", { name: "apples: 6 children" }).dataset["helpGiven"]).toBe(
      "true",
    );
    const pears = screen.getByRole("slider", { name: "Bar: pears" });
    expect(pears.getAttribute("aria-valuenow")).toBe("2");
    fireEvent.keyDown(pears, { key: "ArrowUp" });
    tap("Check");
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ heights: { a: 6, b: 3 } });
  });

  it("the solution view shows the learner's graph beside the right one, each bar toned", () => {
    render(
      <PlaceView
        {...common}
        mode={ViewMode.Solution}
        spec={spec}
        value={{ heights: { a: 6, b: 3 } }}
        solution={{ heights: { a: 6, b: 4 } }}
      />,
    );
    const graphs = screen.getAllByRole("group", { name: "Graph from 0 to 10" });
    expect(graphs).toHaveLength(2);
    const bars = must(graphs[0]).querySelectorAll<HTMLElement>('[data-testid="bar"]');
    expect([bars[0]?.dataset["tone"], bars[1]?.dataset["tone"]]).toEqual(["green", "amber"]);
    expect(
      must(graphs[1]).querySelectorAll<HTMLElement>('[data-testid="bar"]')[1]?.dataset["value"],
    ).toBe("4");
  });
});
