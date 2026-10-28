/**
 * A number line with tick control (dl-w3.70.19, owner 2026-10-25): a stepper above the line cuts
 * it into equal parts within Khan's range, starting at 1 part as Khan does. It is a tool: only the
 * dot is judged, a change of parts moves a placed dot to the nearest new tick, and a dot never
 * placed is not an answer yet. Invented items only.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { solutionOf } from "../answer.ts";
import { Family, QuestionType, Surface } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { validate } from "../validate.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
import { partsHolding } from "./model.ts";
import { PlaceView } from "./PlaceView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-25T00:00:00.000Z" }) };

/** Put the dot on two fifths of a line from 0 to 1, cut into 1 to 12 parts. */
const fifths: SpecOf<typeof Family.Place> = {
  id: "d1",
  say: "Cut the line into parts, then move the dot.",
  question_type: QuestionType.NumberLinePlace,
  family: Family.Place,
  data: {
    surface: Surface.NumberLine,
    min: 0,
    max: 1,
    step: 1,
    labelled: [0, 1],
    tick_label: "fraction",
    divisions: { min: 1, max: 12 },
    stem: { text: "Two fifths" },
  },
  key: {
    surface: Surface.NumberLine,
    value: 0.4,
    tolerance: 0,
    rule: { rule: "number_line", mode: "place", min: 0, max: 1, step: 0.2 },
  },
};

const errors = (spec: SpecOf<typeof Family.Place>) =>
  validate(spec)
    .filter((p) => p.level === "error")
    .map((p) => p.rule);

function play() {
  const onCommit = vi.fn();
  render(
    <StepFrame stepId="d1">
      <PlaceView
        mode={ViewMode.Play}
        spec={pageSpec(fifths) as PageSpecOf<typeof Family.Place>}
        language="en"
        category="child"
        clock={clock}
        live
        attemptNo={1}
        feedback={null}
        solution={null}
        onCommit={onCommit}
      />
    </StepFrame>,
  );
  const more = () => fireEvent.click(screen.getByRole("button", { name: "More parts" }));
  const fewer = () => fireEvent.click(screen.getByRole("button", { name: "Fewer parts" }));
  const key = (k: string) => fireEvent.keyDown(screen.getByRole("slider"), { key: k });
  const check = () => fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
  const parts = () =>
    Number(must(document.querySelector("[data-divisions]")).getAttribute("data-divisions"));
  return { onCommit, more, fewer, key, check, parts };
}

describe("a number line with tick control", () => {
  it("starts in one part and the stepper stays in Khan’s range", () => {
    const { more, fewer, parts } = play();
    expect(parts()).toBe(1);
    expect(screen.getByText("Parts: 1")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Fewer parts" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    more();
    more();
    expect(parts()).toBe(3);
    fewer();
    expect(parts()).toBe(2);
  });

  it("commits only the dot, on the ticks of the parts chosen", () => {
    const { onCommit, more, key, check } = play();
    for (let i = 0; i < 4; i++) more();
    key("ArrowRight"); // the dot arrives at 0
    key("ArrowRight");
    key("ArrowRight");
    check();
    const value = must(onCommit.mock.calls[0])[0].value;
    expect(value).toEqual({ at: 0.4 });
    expect(solutionOf(fifths)).toEqual(value);
  });

  it("moves a placed dot to the nearest tick when the parts change", () => {
    const { onCommit, more, fewer, key, check } = play();
    for (let i = 0; i < 4; i++) more();
    key("ArrowRight");
    key("ArrowRight");
    key("ArrowRight"); // 2/5
    fewer(); // quarters: 0.4 is nearest 0.5
    check();
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ at: 0.5 });
  });

  it("a dot never placed is not an answer", () => {
    const { onCommit, more, check } = play();
    more();
    check();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("validates the parts and the answer on some count of them", () => {
    expect(errors(fifths)).toEqual([]);
    expect(
      partsHolding(fifths.data as { min: number; max: number }, { min: 1, max: 12 }, 0.4),
    ).toBe(5);
    const d = fifths.data as Extract<typeof fifths.data, { surface: "number_line" }>;
    expect(errors({ ...fifths, data: { ...d, divisions: { min: 0, max: 12 } } })).toContain(
      "bad_divisions",
    );
    expect(errors({ ...fifths, data: { ...d, divisions: { min: 2, max: 12 } } })).toContain(
      "step_off_divisions",
    );
    expect(errors({ ...fifths, data: { ...d, divisions: { min: 1, max: 4 } } })).toContain(
      "key_off_snap",
    );
    expect(errors({ ...fifths, data: { ...d, snap: 0.5 } })).toContain("snap_with_divisions");
  });

  it("draws a still answer on the line cut into the parts that show it", () => {
    const page = pageSpec(fifths) as PageSpecOf<typeof Family.Place>;
    render(
      <PlaceView
        mode={ViewMode.Review}
        spec={page}
        language="en"
        category="child"
        clock={clock}
        value={{ at: 0.4 }}
        answerKey={fifths.key}
        verdict={{ correct: true, mistake_class: null, parts: [] }}
      />,
    );
    // Fifths: six ticks from 0 to 1, not the start's two.
    expect(document.querySelectorAll('[data-testid="tick"]').length).toBe(6);
  });
});
