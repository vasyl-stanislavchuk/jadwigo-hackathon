/**
 * Set the clock (clock_set, dl-w3.61.5): the solution, the checks, and the play view by tap, by drag
 * and by keyboard, marked per hand after a miss. The judge per hand is `packages/core`'s.
 */
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { Feedback } from "../../stage/types.ts";
import { solutionOf } from "../answer.ts";
import { Family, QuestionType, Surface } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { validate } from "../validate.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
import type { PlaceData, PlaceKey } from "./model.ts";
import { PlaceView } from "./PlaceView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-19T00:00:00.000Z" }) };
type ClockData = Extract<PlaceData, { surface: typeof Surface.Clock }>;
const data = (over: Partial<ClockData> = {}): ClockData => ({
  surface: Surface.Clock,
  target_label: "wpół do ósmej",
  minute_step: 5,
  hands: "geared",
  ...over,
});
const key = (h: number, m: number): PlaceKey => ({ surface: Surface.Clock, h, m });
const spec = (d: ClockData = data(), k: PlaceKey = key(7, 30)): SpecOf<typeof Family.Place> => ({
  id: "s1",
  say: "Ustaw zegar.",
  question_type: QuestionType.ClockSet,
  family: Family.Place,
  data: d,
  key: k,
});

describe("the clock solution", () => {
  it("is the clock the key sets", () => {
    expect(solutionOf(spec())).toEqual({ hour_at: 37.5, m: 30 });
  });
});

describe("the clock checks", () => {
  const rules = (s: SpecOf<typeof Family.Place>) => validate(s).map((p) => p.rule);
  it("accepts a clock to set", () => {
    expect(validate(spec()).filter((p) => p.level === "error")).toEqual([]);
  });
  it("refuses an hour off the face, a minute the hand cannot take, and a bad start", () => {
    expect(rules(spec(data(), key(13, 0)))).toContain("clock_hour");
    expect(rules(spec(data({ minute_step: 15 }), key(7, 30)))).not.toContain("key_off_snap");
    expect(rules(spec(data({ minute_step: 30 }), key(9, 45)))).toContain("key_off_snap");
    expect(rules(spec(data({ starting: { hour_at: 36, m: 0 } })))).toContain("starting_off_snap");
    expect(rules(spec(data({ starting: { hour_at: 37.5, m: 30 } })))).toContain("starts_solved");
    expect(rules(spec(data({ target_label: " " })))).toContain("empty_label");
  });
});

describe("the clock in play", () => {
  function play(s = spec(), onCommit = vi.fn()) {
    const page = pageSpec(s) as PageSpecOf<typeof Family.Place>;
    const props = (feedback: Feedback | null, attemptNo: number) => ({
      mode: ViewMode.Play,
      spec: page,
      language: "en" as const,
      category: "child" as const,
      clock,
      live: true,
      attemptNo,
      feedback,
      solution: null,
      onCommit,
    });
    const out = render(
      <StepFrame stepId="s1">
        <PlaceView {...props(null, 1)} />
      </StepFrame>,
    );
    const again = (feedback: Feedback | null, attemptNo: number) =>
      out.rerender(
        <StepFrame stepId="s1">
          <PlaceView {...props(feedback, attemptNo)} />
        </StepFrame>,
      );
    return { onCommit, again };
  }
  const face = () => screen.getByTestId("clock-face");
  const hand = (name: string) => screen.getByRole("slider", { name });

  it("waits for a first move before Check commits", () => {
    const { onCommit } = play();
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByText("Move a hand first.")).toBeTruthy();
  });

  it("sets the hands by keyboard and commits the clock", () => {
    const { onCommit } = play();
    for (let i = 0; i < 7; i++) fireEvent.keyDown(hand("Hour hand"), { key: "ArrowRight" });
    for (let i = 0; i < 6; i++) fireEvent.keyDown(hand("Minute hand"), { key: "ArrowRight" });
    expect(hand("Hour hand").getAttribute("aria-valuetext")).toBe("between 7 and 8");
    expect(hand("Minute hand").getAttribute("aria-valuetext")).toBe("points at 6");
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ hour_at: 37.5, m: 30 });
    expect(must(onCommit.mock.calls[0])[0].modality).toBe("keyboard");
  });

  it("moves the active hand by a tap on the face, and the buttons pick it", () => {
    const { onCommit } = play();
    // The face is 200 wide with no layout in happy-dom: a tap at the bottom is mark 30.
    fireEvent.pointerDown(face(), { clientX: 100, clientY: 190, pointerId: 1, button: 0 });
    fireEvent.pointerUp(face());
    fireEvent.click(screen.getByRole("button", { name: "Hour hand" }));
    expect(screen.getByRole("button", { name: "Hour hand" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    // Left of the centre, a little below: mark 42.5, the hour hand on 8, geared to 8:30.
    fireEvent.pointerDown(face(), { clientX: 18, clientY: 122, pointerId: 1, button: 0 });
    fireEvent.pointerUp(face());
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ hour_at: 42.5, m: 30 });
  });

  it("marks only the hand that is off after a miss, and keeps the hands", () => {
    const { again } = play();
    fireEvent.keyDown(hand("Minute hand"), { key: "ArrowLeft" });
    act(() =>
      again(
        {
          kind: "try_again",
          index: 0,
          parts: [
            { id: "h", correct: false },
            { id: "m", correct: true },
          ],
        },
        2,
      ),
    );
    expect(face().querySelector('[data-hand="h"]')?.getAttribute("data-tone")).toBe("amber");
    expect(face().querySelector('[data-hand="m"]')?.getAttribute("data-tone")).toBe("green");
    expect(face().dataset["minute"]).toBe("55");
    fireEvent.keyDown(hand("Hour hand"), { key: "ArrowRight" });
    expect(face().querySelector('[data-hand="h"]')?.getAttribute("data-tone")).toBe("idle");
  });

  it("reviews the clock set beside the right one", () => {
    const s = pageSpec(spec()) as PageSpecOf<typeof Family.Place>;
    render(
      <PlaceView
        mode={ViewMode.Review}
        spec={s}
        language="en"
        category="child"
        clock={clock}
        value={{ hour_at: 42.5, m: 30 }}
        answerKey={key(7, 30)}
        verdict={{
          correct: false,
          mistake_class: "half_past_wrong_hour",
          parts: [
            { id: "h", correct: false, mistake_class: "half_past_wrong_hour" },
            { id: "m", correct: true, mistake_class: null },
          ],
        }}
      />,
    );
    expect(screen.getAllByTestId("clock-face")).toHaveLength(2);
  });
});
