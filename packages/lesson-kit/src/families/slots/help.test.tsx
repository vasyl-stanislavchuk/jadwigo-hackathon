/**
 * The help ladder in the Gaps view (families/help.ts): rung 1 outlines the gaps to look at, and
 * rung 2's given gaps are shown, locked, and committed with the learner's own.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { PageHelp } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
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

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-13T00:00:00.000Z" }) };

const spec: PageSpecOf<typeof Family.Slots> = {
  id: "s1",
  say: "Fill in the missing numbers.",
  question_type: QuestionType.FillGaps,
  family: Family.Slots,
  data: {
    template: "6 × {g1} = 42, {g2} × 6 = 48, bd {g3}",
    gaps: [
      { id: "g1", kind: Family.Enter, input: "number" },
      { id: "g2", kind: Family.Enter, input: "number" },
      {
        id: "g3",
        kind: Family.Choose,
        options: [
          { id: "c1", label: "ready" },
          { id: "c2", label: "list" },
        ],
      },
    ],
  },
};

const help = (over: Partial<PageHelp>): PageHelp => ({
  rung: 1,
  card: { text: "Look." },
  focus: null,
  given: null,
  worked: null,
  twin: null,
  more: true,
  ...over,
});

function play(h: PageHelp) {
  const onCommit = vi.fn();
  render(
    <StepFrame stepId="s1">
      <SlotsView
        mode={ViewMode.Play}
        spec={spec}
        language="en"
        category="child"
        clock={clock}
        live
        attemptNo={1}
        feedback={null}
        onCommit={onCommit}
        around={{ checking: false, moveOn: null, ladder: { help: h, ask: null, refused: false } }}
      />
    </StepFrame>,
  );
  return onCommit;
}

const gap = (n: number) => screen.getByLabelText(`Gap ${n}`);

describe("Gaps: the help ladder", () => {
  it("outlines the gaps rung 1 names, and only those", () => {
    play(help({ focus: ["g2"] }));
    expect(gap(2).dataset["helpFocus"]).toBe("true");
    expect(gap(1).dataset["helpFocus"]).toBeUndefined();
  });

  it("shows a given gap with its value, locked: the keypad types into the next open gap", () => {
    play(help({ rung: 2, given: { gaps: { g1: "7", g3: "c1" } } }));
    expect(gap(1).textContent).toBe("7");
    expect(gap(1).dataset["helpGiven"]).toBe("true");
    expect(gap(1).tagName).toBe("SPAN");
    expect(gap(3).querySelector("[data-pick]")?.textContent).toBe("ready");
    expect(gap(3).dataset["helpGiven"]).toBe("true");
    // Help folded the tray (lesson frame rule 8): a tap on a field opens it again.
    fireEvent.pointerDown(gap(2));
    fireEvent.click(screen.getByRole("button", { name: "9" }), { detail: 0 });
    expect(gap(1).textContent).toBe("7");
    expect(gap(2).textContent).toBe("9");
  });

  it("commits the given gaps with the typed one", () => {
    const onCommit = play(help({ rung: 2, given: { gaps: { g1: "7", g3: "c1" } } }));
    fireEvent.pointerDown(gap(2));
    fireEvent.click(screen.getByRole("button", { name: "8" }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { g1: "7", g2: "8", g3: "c1" } });
  });
});
