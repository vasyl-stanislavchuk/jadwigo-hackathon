/**
 * "None of these" (dl-w3.70.4, owner 2026-10-25): Khan's none-of-the-above is an option of its own
 * kind, drawn in the lesson's language, pinned last, alone when several may be picked, and a right
 * one says why after the praise. Invented items only.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import { alsoWords } from "../../parts/status.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { solutionOf } from "../answer.ts";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { validate } from "../validate.ts";
import { ViewMode, type ViewProps } from "../view.ts";
import { ChooseView } from "./ChooseView.tsx";
import { pinNoneLast, toggleMany } from "./model.ts";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-25T00:00:00.000Z" }) };

/** How is the shape cut? Its parts are not equal, so none of the names fits. */
const cut: SpecOf<typeof Family.Choose> = {
  id: "n1",
  say: "How is the shape cut?",
  question_type: QuestionType.Recognition,
  family: Family.Choose,
  data: {
    options: [
      { id: "o1", content: { kind: "text", text: "Halves" } },
      { id: "o2", content: { kind: "text", text: "Thirds" } },
      { id: "o3", content: { kind: "none" } },
    ],
    select: "one",
    layout: "list",
  },
  key: { correct: ["o3"], why: "The parts are **not** the same size." },
};

/** Which names fit the shape? Several may be picked. */
const names: SpecOf<typeof Family.Choose> = {
  ...cut,
  question_type: QuestionType.MultiSelect,
  say: "Which names fit the shape?",
  data: { ...cut.data, select: "many" },
  key: { correct: ["o1", "o2"] },
};

const errors = (spec: SpecOf<typeof Family.Choose>) =>
  validate(spec)
    .filter((p) => p.level === "error")
    .map((p) => p.rule);

function draw(spec: SpecOf<typeof Family.Choose>, language: "en" | "pl" = "en") {
  const onCommit = vi.fn();
  const props = {
    mode: ViewMode.Play,
    spec: pageSpec(spec),
    language,
    category: "child",
    clock,
    live: true,
    attemptNo: 1,
    feedback: null,
    onCommit,
  };
  render(
    <StepFrame stepId="n1">
      <ChooseView {...(props as unknown as ViewProps<typeof Family.Choose>)} />
    </StepFrame>,
  );
  return onCommit;
}

describe("none of these", () => {
  it("is drawn last in the lesson’s language", () => {
    draw(cut, "pl");
    const labels = [...document.querySelectorAll('[role="radiogroup"] [data-tone]')].map(
      (el) => el.textContent,
    );
    expect(labels.at(-1)).toContain("Żadna z tych odpowiedzi");
    cleanup();
    draw(cut, "en");
    expect(screen.getByText("None of these")).toBeTruthy();
  });

  it("stays last whatever order the rest come in", () => {
    const [o1, o2, o3] = cut.data.options.map((o) => o);
    const shuffled = [must(o3), must(o2), must(o1)];
    expect(pinNoneLast(shuffled).map((o) => o.id)).toEqual(["o2", "o1", "o3"]);
  });

  it("is valid as the key, and its key is the solution", () => {
    expect(solutionOf(cut)).toEqual({ chosen: ["o3"] });
    expect(errors(cut)).toEqual([]);
  });

  it("stands alone when several may be picked", () => {
    const onCommit = draw(names);
    const boxes = () => screen.getAllByRole("checkbox");
    const tap = (i: number) => fireEvent.click(must(boxes()[i]), { detail: 0 });
    const ticked = () => boxes().map((b) => b.getAttribute("aria-checked"));
    tap(0);
    tap(1);
    expect(ticked()).toEqual(["true", "true", "false"]);
    tap(2);
    expect(ticked()).toEqual(["false", "false", "true"]);
    tap(0);
    expect(ticked()).toEqual(["true", "false", "false"]);
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ chosen: ["o1"] });
    expect(toggleMany(names.data.options, ["o1", "o2"], "o3")).toEqual(["o3"]);
  });

  it("is refused when it is not last, not alone in the key, or doubled", () => {
    const opts = cut.data.options;
    expect(
      errors({
        ...cut,
        data: { ...cut.data, options: [must(opts[2]), must(opts[0]), must(opts[1])] },
      }),
    ).toContain("none_not_last");
    expect(errors({ ...names, key: { correct: ["o1", "o3"] } })).toContain("none_with_others");
    expect(
      errors({
        ...cut,
        data: { ...cut.data, options: [...opts, { id: "o4", content: { kind: "none" } }] },
      }),
    ).toContain("two_none_options");
    expect(errors({ ...cut, key: { correct: ["o1"], why: "Because." } })).toContain(
      "why_without_none",
    );
  });

  it("says why after the praise when it is right, and never after a miss", () => {
    expect(
      alsoWords({
        feedback: { kind: "praise", index: 0, why: "The parts differ." },
        language: "en",
        category: "child",
      }),
    ).toBe("The parts differ.");
    expect(
      alsoWords({
        feedback: { kind: "try_again", index: 0, why: "The parts differ." },
        language: "en",
        category: "child",
      }),
    ).toBeNull();
  });
});
