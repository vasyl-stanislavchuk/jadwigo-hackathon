/**
 * The family views in play and in the still modes (dl-w3.37.12): a commit carries the family value,
 * a miss keeps the answer and marks the parts the result marked, the solution view shows the right
 * answer beside the learner's, and a preview shows the key only when asked.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../parts/must.ts";
import type { Clock, Instant } from "../stage/clock.ts";
import { StepFrame } from "../stage/StepFrame.tsx";
import type { Feedback } from "../stage/types.ts";
import { ChooseView } from "./choose/ChooseView.tsx";
import { EnterView } from "./enter/EnterView.tsx";
import { Family, QuestionType } from "./names.ts";
import { SlotsView } from "./slots/SlotsView.tsx";
import { pageSpec, type SpecOf } from "./types.ts";
import { type PageSpecOf, ViewMode } from "./view.ts";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-12T00:00:00.000Z" }) };
const base = { id: "s1", say: "Try it" };
const common = { language: "en" as const, category: "child" as const, clock };
const miss = (parts?: { id: string; correct: boolean }[]): Feedback => ({
  kind: "try_again",
  index: 0,
  ...(parts ? { parts } : {}),
});

const many: SpecOf<typeof Family.Choose> = {
  ...base,
  question_type: QuestionType.MultiSelect,
  family: Family.Choose,
  data: {
    options: [12, 7, 18].map((n, i) => ({
      id: `o${i + 1}`,
      content: { kind: "number", number: n },
    })),
    select: "many",
    layout: "list",
  },
  key: { correct: ["o1", "o3"] },
};

const gaps: SpecOf<typeof Family.Slots> = {
  ...base,
  question_type: QuestionType.FillGaps,
  family: Family.Slots,
  data: {
    template: "bd {g1} --status {g2}",
    code: true,
    gaps: [
      { id: "g1", kind: Family.Enter, input: "text" },
      {
        id: "g2",
        kind: Family.Choose,
        options: [
          { id: "c1", label: "open" },
          { id: "c2", label: "in_progress" },
        ],
      },
    ],
  },
  key: {
    gaps: {
      g1: { kind: Family.Enter, accept: ["update"] },
      g2: { kind: Family.Choose, correct: ["c2"] },
    },
  },
};

const enter: SpecOf<typeof Family.Enter> = {
  ...base,
  question_type: QuestionType.ShortText,
  family: Family.Enter,
  data: { input: "text", entry: "keyboard", code: true },
  key: { accept: ["bd ready"] },
};

function play<F extends typeof Family.Choose | typeof Family.Slots | typeof Family.Enter>(
  View: ComponentType<object>,
  spec: PageSpecOf<F>,
  onCommit = vi.fn(),
) {
  const props = (feedback: Feedback | null, attemptNo: number, solution: unknown = null) =>
    ({
      ...common,
      mode: ViewMode.Play,
      spec,
      live: true,
      attemptNo,
      feedback,
      solution,
      onCommit,
    }) as object;
  const out = render(
    <StepFrame stepId="s1">
      <View {...props(null, 1)} />
    </StepFrame>,
  );
  const again = (feedback: Feedback | null, attemptNo: number, solution: unknown = null) =>
    out.rerender(
      <StepFrame stepId="s1">
        <View {...props(feedback, attemptNo, solution)} />
      </StepFrame>,
    );
  return { onCommit, again };
}

describe("Choose, several options", () => {
  it("commits the picks, then marks only the distractor picked and keeps the picks", () => {
    const { onCommit, again } = play(
      ChooseView as never,
      pageSpec(many) as PageSpecOf<typeof Family.Choose>,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /12/ }), { detail: 0 });
    fireEvent.click(screen.getByRole("checkbox", { name: /7/ }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ chosen: ["o1", "o2"] });
    act(() => again(miss([{ id: "o2", correct: false }]), 2));
    expect(screen.getByRole("checkbox", { name: /7/ }).dataset["tone"]).toBe("try_again");
    expect(screen.getByRole("checkbox", { name: /12/ }).dataset["tone"]).toBe("idle");
    expect(screen.getByRole("checkbox", { name: /12/ }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText("tried")).toBeTruthy();
  });

  it("a miss with no marks turns the whole set red", () => {
    const { again } = play(ChooseView as never, pageSpec(many) as PageSpecOf<typeof Family.Choose>);
    act(() => again(miss(), 2));
    // The whole-set mark is an outline outside the set (Choose addendum 1.4).
    expect(document.querySelector('[data-whole="try_again"]')).not.toBeNull();
  });

  it("after moving on, the right options show the solution and the pick keeps its mark", () => {
    const { again } = play(ChooseView as never, pageSpec(many) as PageSpecOf<typeof Family.Choose>);
    fireEvent.click(screen.getByRole("checkbox", { name: /7/ }), { detail: 0 });
    act(() => again(null, 2, { chosen: ["o1", "o3"] }));
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(document.querySelectorAll("[data-solution]")).toHaveLength(2);
    expect(screen.getAllByText("Solution")).toHaveLength(2);
    expect(screen.getByText("7").closest("li")?.getAttribute("data-tone")).toBe("try_again");
  });
});

describe("Gaps", () => {
  it("commits every gap, keeps them after a miss and marks only the missed one (Slots addendum 2.1)", () => {
    const { onCommit, again } = play(
      SlotsView as never,
      pageSpec(gaps) as PageSpecOf<typeof Family.Slots>,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "Gap 1" }), { target: { value: "show" } });
    fireEvent.click(screen.getByRole("button", { name: "Gap 2" }));
    fireEvent.click(screen.getByRole("option", { name: "in_progress" }), { detail: 0 });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("button", { name: "Gap 2" }).textContent).toContain("in_progress");
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ gaps: { g1: "show", g2: "c2" } });
    act(() =>
      again(
        miss([
          { id: "g1", correct: false },
          { id: "g2", correct: true },
        ]),
        2,
      ),
    );
    const g1 = screen.getByRole("textbox", { name: "Gap 1" }) as HTMLInputElement;
    expect(g1.value).toBe("show");
    expect(g1.dataset["tone"]).toBe("try_again");
    // A right gap stays as it was typed, paper: green only when the whole step is right.
    expect(screen.getByRole("button", { name: "Gap 2" }).dataset["tone"]).toBe("idle");
    fireEvent.change(g1, { target: { value: "update" } });
    expect(g1.dataset["tone"]).toBe("idle");
  });

  it("offers Check only once every gap is filled", () => {
    const { onCommit } = play(
      SlotsView as never,
      pageSpec(gaps) as PageSpecOf<typeof Family.Slots>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("says what is left when Check comes too soon, under the body, marks the empty gap and clears on a change (Slots addendum 3.3)", () => {
    play(SlotsView as never, pageSpec(gaps) as PageSpecOf<typeof Family.Slots>);
    fireEvent.change(screen.getByRole("textbox", { name: "Gap 1" }), { target: { value: "show" } });
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    // One line under the body; the footer stays plain, with no status line.
    expect(document.querySelector("[data-too-soon]")?.textContent).toBe(
      "Fill in the empty spaces too.",
    );
    expect(document.querySelector("[data-too-soon-live]")?.textContent).toBe(
      "Fill in the empty spaces too.",
    );
    expect(document.querySelector("[data-bar] [data-status]")).toBeNull();
    expect(screen.getByRole("button", { name: "Gap 2" }).dataset["tone"]).toBe("missing");
    expect(
      (screen.getByRole("textbox", { name: "Gap 1" }) as HTMLInputElement).dataset["tone"],
    ).toBe("idle");
    fireEvent.change(screen.getByRole("textbox", { name: "Gap 1" }), {
      target: { value: "shows" },
    });
    expect(document.querySelector("[data-too-soon-live]")?.textContent).toBe("");
    expect(screen.getByRole("button", { name: "Gap 2" }).dataset["tone"]).toBe("idle");
  });
});

describe("the step layout (docs/17 §2f)", () => {
  const areas = () =>
    [...document.querySelectorAll("[data-stage] > [data-area]")].map((e) =>
      e.getAttribute("data-area"),
    );
  const band = () => must(document.querySelector<HTMLElement>("[data-bar]")).dataset["band"];

  it.each([
    ["Choose", ChooseView, pageSpec(many)],
    ["Gaps", SlotsView, pageSpec(gaps)],
    ["Enter", EnterView, pageSpec(enter)],
  ] as const)(
    "%s keeps the column areas, in order, and turns the footer into the miss band",
    (_name, View, spec) => {
      const { again } = play(View as never, spec as never);
      const before = areas();
      expect(before).toEqual(["stem", "answer", "help"]);
      expect(band()).toBe("none");
      act(() => again(miss(), 2));
      // The verdict turns the footer into the band; the column above does not move.
      expect(areas()).toEqual(before);
      expect(band()).toBe("miss");
    },
  );

  it("shows no green or red before a verdict: choosing is not judging", () => {
    play(ChooseView as never, pageSpec(many) as PageSpecOf<typeof Family.Choose>);
    fireEvent.click(screen.getByRole("checkbox", { name: /12/ }), { detail: 0 });
    expect(document.querySelector('[data-tone="green"], [data-tone="try_again"]')).toBeNull();
  });

  it("puts the boost under the Check after a miss", () => {
    const boosted = pageSpec({
      ...many,
      data: { ...many.data, boost: "Count the even ones." },
    }) as PageSpecOf<typeof Family.Choose>;
    const { again } = play(ChooseView as never, boosted);
    act(() => again(miss(), 2));
    expect(must(document.querySelector('[data-area="help"]')).textContent).toContain(
      "Count the even ones.",
    );
  });

  it("says an empty Enter answer is missing instead of dropping it", () => {
    const { onCommit } = play(
      EnterView as never,
      pageSpec(enter) as PageSpecOf<typeof Family.Enter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(onCommit).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("Write your answer first.");
  });
});

describe("Enter", () => {
  it("keeps the text after a miss, red until the first change", () => {
    const { onCommit, again } = play(
      EnterView as never,
      pageSpec(enter) as PageSpecOf<typeof Family.Enter>,
    );
    const field = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "bd list" } });
    fireEvent.keyDown(field, { key: "Enter" });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ entered: "bd list" });
    act(() => again(miss(), 2));
    expect(field.value).toBe("bd list");
    expect(field.dataset["tone"]).toBe("try_again");
  });
});

describe("the still modes", () => {
  it("a preview shows the key only when asked", () => {
    const page = pageSpec(enter) as PageSpecOf<typeof Family.Enter>;
    const { rerender } = render(
      <EnterView
        {...common}
        mode={ViewMode.Preview}
        spec={page}
        answerKey={enter.key}
        showKey={false}
      />,
    );
    expect(screen.queryByText("bd ready")).toBeNull();
    rerender(
      <EnterView {...common} mode={ViewMode.Preview} spec={page} answerKey={enter.key} showKey />,
    );
    expect(screen.getByText("bd ready")).toBeTruthy();
  });

  it("a review marks the learner’s answer against the key", () => {
    render(
      <SlotsView
        {...common}
        mode={ViewMode.Review}
        spec={pageSpec(gaps) as PageSpecOf<typeof Family.Slots>}
        value={{ gaps: { g1: "show", g2: "c2" } }}
        answerKey={gaps.key}
        verdict={{ correct: false, mistake_class: "other_wrong", parts: [] }}
      />,
    );
    expect(screen.getByText("show").dataset["tone"]).toBe("try_again");
    expect(screen.getByText("update").dataset["tone"]).toBe("green");
  });
});
