/**
 * A Choose step with its line (Slots addendum section 1, dl-uukj.29.121): one chosen gap and
 * nothing typed plays as Choose, one tap on a tile, the pick shown in its place in the line. The
 * comparison of two fractions and morze or może are the two shapes; a Slots step with one menu
 * and nothing typed is refused.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { validate } from "../validate.ts";
import { ViewMode, type ViewProps } from "../view.ts";
import { ChooseView } from "./ChooseView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-27T00:00:00.000Z" }) };

const compare: SpecOf<typeof Family.Choose> = {
  id: "l1",
  say: "Look at the bars and pick the sign.",
  question_type: QuestionType.FractionCompare,
  family: Family.Choose,
  data: {
    stem: {
      figure: {
        kind: "fraction_bars",
        items: [
          { n: 1, d: 3 },
          { n: 1, d: 5 },
        ],
        shape: "bar",
        alt: "Two bars of one length, cut in 3 and in 5, one part of each shaded.",
      },
    },
    line: "$\\frac{1}{3}$ {pick} $\\frac{1}{5}$",
    options: ["<", "=", ">"].map((text, i) => ({
      id: `c${i + 1}`,
      content: { kind: "text", text },
    })),
    select: "one",
    layout: "grid",
  },
  key: {
    correct: ["c3"],
    near: { c1: "bigger_denominator_bigger", c2: "compared_numerators_only" },
  },
};

const errors = (spec: Parameters<typeof validate>[0]) =>
  validate(spec)
    .filter((p) => p.level === "error")
    .map((p) => p.rule);

function draw(spec: SpecOf<typeof Family.Choose>, extra: object = {}) {
  const onCommit = vi.fn();
  const props = {
    mode: ViewMode.Play,
    spec: pageSpec(spec),
    language: "en",
    category: "child",
    clock,
    live: true,
    attemptNo: 1,
    feedback: null,
    onCommit,
    ...extra,
  };
  render(
    <StepFrame stepId="l1">
      <ChooseView {...(props as unknown as ViewProps<typeof Family.Choose>)} />
    </StepFrame>,
  );
  return onCommit;
}

const slot = () => must(document.querySelector<HTMLElement>("[data-pick-slot]"));

describe("a Choose line with its pick in place", () => {
  it("draws the line in the card under the bars, the place empty, and the signs as three tiles", () => {
    draw(compare);
    const card = must(document.querySelector("[data-prompt-card]"));
    expect(card.querySelector("[data-pick-slot]")).not.toBeNull();
    expect(slot().dataset["pickSlot"]).toBe("");
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(document.querySelector('[role="radiogroup"]')?.textContent?.replace(/\d/g, "")).toBe(
      "<=>",
    );
    // The instruction stands above the card that holds the line.
    expect(document.querySelector("[data-instruction]")?.textContent).toContain("pick the sign");
  });

  it("shows the picked sign in its place with one tap, and commits the pick", () => {
    const onCommit = draw(compare);
    fireEvent.click(must(screen.getAllByRole("radio")[2]), { detail: 0 });
    expect(slot().dataset["pickSlot"]).toBe("c3");
    expect(slot().textContent).toContain(">");
    // The place keeps every option's footprint, so the line never moves under the finger.
    expect(slot().querySelectorAll("[aria-hidden]")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ chosen: ["c3"] });
  });

  it("is valid with one {pick}, and refused with none, two, or several picks", () => {
    expect(errors(compare)).toEqual([]);
    expect(
      errors({ ...compare, data: { ...compare.data, line: "$\\frac{1}{3}$ ? $\\frac{1}{5}$" } }),
    ).toContain("pick_marker");
    expect(errors({ ...compare, data: { ...compare.data, line: "{pick} and {pick}" } })).toContain(
      "pick_marker",
    );
    expect(
      errors({ ...compare, data: { ...compare.data, line: "$\\frac{1}{3} {pick}$" } }),
    ).toContain("pick_marker");
    expect(errors({ ...compare, data: { ...compare.data, select: "many" } })).toContain(
      "line_one_pick",
    );
  });

  it("refuses a Slots step with one chosen gap and nothing typed: it plays as Choose", () => {
    const menu: SpecOf<typeof Family.Slots> = {
      id: "l2",
      say: "Choose the word that fits the sentence.",
      question_type: QuestionType.FillGaps,
      family: Family.Slots,
      data: {
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
      },
      key: { gaps: { g1: { kind: Family.Choose, correct: ["c1"], near: { c2: "rz_z" } } } },
    };
    expect(errors(menu)).toContain("plays_as_choose");
    // A typed gap beside it keeps it a Slots step.
    const mixed = {
      ...menu,
      data: {
        ...menu.data,
        template: "{g2} jedziemy nad {g1}.",
        gaps: [...menu.data.gaps, { id: "g2", kind: Family.Enter, input: "text" as const }],
      },
      key: { gaps: { ...menu.key.gaps, g2: { kind: Family.Enter, accept: ["Latem"] } } },
    };
    expect(errors(mixed)).not.toContain("plays_as_choose");
  });
});
