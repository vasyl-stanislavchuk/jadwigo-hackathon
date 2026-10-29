/**
 * The Enter step's layout (Enter addendum 2.2, 2.4, 2.8, 3.1; dl-uukj.29.106): the field in the
 * maths line, the "checked too soon" line directly under the field with the footer plain, and the
 * solution that keeps the child's field with the card's last line the answer.
 */

import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inlineLine } from "../../parts/InlineField.tsx";
import { must } from "../../parts/must.ts";
import { EMPTY_FIELD } from "../../parts/tone.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { Feedback, PageSolutionLine } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { ViewMode } from "../view.ts";
import { EnterView, solutionCardLines } from "./EnterView.tsx";
import type { EnterData, EnterValue } from "./model.ts";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-26T00:00:00.000Z" }) };

const SEVEN: EnterData = {
  input: "number",
  entry: "keypad",
  figure: { kind: "expression", text: "7 × 8 = ?" },
};

function step(
  data: EnterData,
  props: {
    feedback?: Feedback | null;
    attemptNo?: number;
    live?: boolean;
    solution?: EnterValue | null;
    solutionLines?: PageSolutionLine[] | null;
    say?: string;
  } = {},
) {
  return (
    <StepFrame stepId="e1">
      <EnterView
        mode={ViewMode.Play}
        spec={{
          id: "e1",
          say: props.say ?? "Ile to jest siedem razy osiem?",
          question_type: QuestionType.Production,
          family: Family.Enter,
          data,
        }}
        language="pl"
        category="child"
        clock={clock}
        live={props.live ?? true}
        attemptNo={props.attemptNo ?? 1}
        feedback={props.feedback ?? null}
        solution={props.solution ?? null}
        solutionLines={props.solutionLines ?? null}
        onCommit={vi.fn()}
      />
    </StepFrame>
  );
}

const key = (k: string) => fireEvent.keyDown(document.activeElement ?? document.body, { key: k });
const field = () => must(document.querySelector<HTMLElement>('[data-field="entry"]'));
const check = () => fireEvent.click(must(document.querySelector("[data-check]")), { detail: 0 });
const tooSoon = () => document.querySelector("[data-too-soon]");

describe("inlineLine (addendum 2.4)", () => {
  it('takes a line ending in "= ?" or "=", and leaves every other line under the card', () => {
    expect(inlineLine("7 × 8 = ?")).toBe("7 × 8 =");
    expect(inlineLine("4 × 7 =")).toBe("4 × 7 =");
    expect(inlineLine("$12 + 8 = ?$")).toBe("$12 + 8 =$");
    expect(inlineLine("7 × 8")).toBeNull();
    expect(inlineLine("? = 7 × 8")).toBeNull();
    expect(inlineLine("$116$, $117$, $118$, $119$,")).toBeNull();
  });
});

describe("the field in the maths line (addendum 2.4, 3.1)", () => {
  it('seven-eights: the instruction above the card, the field in "7 × 8 =" inside the card, the card the scroll target', () => {
    render(step(SEVEN));
    const instruction = must(document.querySelector("[data-instruction]"));
    expect(instruction.textContent).toBe("Ile to jest siedem razy osiem?");
    const card = must(document.querySelector("[data-prompt-card]"));
    expect(card.hasAttribute("data-scroll-target")).toBe(true);
    const line = must(card.querySelector("[data-inline-line]"));
    expect(must(line.querySelector("[data-inline-text]")).textContent).toBe("7 × 8 =");
    expect(line.querySelector('[data-inline-field] [data-field="entry"]')).toBe(field());
    // No "?" is drawn, and the instruction is not repeated in the card.
    expect(card.textContent).not.toContain("?");
    expect(card.textContent).not.toContain("siedem");
  });

  it("keeps the line on one baseline through the first digit: the empty field holds a no-break space", () => {
    // A flex box drops a plain space, so an empty field had no baseline and the line's text sat
    // lower until the first digit (dl-e8ov.2.32.45). happy-dom draws no layout; the text pins it.
    render(step(SEVEN));
    expect(field().textContent).toBe(EMPTY_FIELD);
    field().focus();
    key("5");
    expect(field().textContent).toBe("5");
  });

  it('a decimal, a text answer or a line with no "=" keeps the field under the card', () => {
    render(
      step({
        input: "number",
        entry: "keypad",
        decimal: true,
        figure: { kind: "expression", text: "0,3 + 0,4 = ?" },
      }),
    );
    expect(document.querySelector("[data-inline-line]")).toBeNull();
    expect(must(document.querySelector("[data-prompt-card]")).contains(field())).toBe(false);
    cleanup();
    render(
      step({ input: "number", entry: "keypad", figure: { kind: "expression", text: "7 × 8" } }),
    );
    expect(document.querySelector("[data-inline-line]")).toBeNull();
  });

  it("a card with a figure of its own has the instruction above it; a card with nothing else holds it", () => {
    render(
      step(
        {
          input: "expression",
          entry: "keypad",
          figure: { kind: "groups", groups: 3, each: 4, icon: "apple", alt: "apples" },
        },
        { say: "Zapisz mnożenie." },
      ),
    );
    expect(must(document.querySelector("[data-instruction]")).textContent).toBe("Zapisz mnożenie.");
    expect(must(document.querySelector("[data-prompt-card]")).textContent).not.toContain("Zapisz");
    cleanup();
    render(step({ input: "text", entry: "keyboard" }, { say: "Zapisz słowami liczbę 47." }));
    expect(document.querySelector("[data-instruction]")).toBeNull();
    expect(must(document.querySelector("[data-prompt-card]")).textContent).toBe(
      "Zapisz słowami liczbę 47.",
    );
  });

  // dl-uukj.29.113: EnterStep.dc.html centres the decimal step's 37/100 in its card.
  it("a stem that is one formula is centred in its card at the maths size; a stem in words is not", () => {
    render(
      step(
        { input: "number", entry: "keypad", decimal: true, stem: { text: "$\\dfrac{37}{100}$" } },
        { say: "Zapisz ułamek jako ułamek dziesiętny." },
      ),
    );
    const formula = must(must(document.querySelector("[data-prompt-card]")).firstElementChild);
    expect(formula.querySelector(".katex")).not.toBeNull();
    expect(formula.className).toContain("text-center");
    expect(formula.className).toContain("text-jw-math");
    cleanup();
    render(
      step(
        { input: "number", entry: "keypad", stem: { text: "Ile to jest $3 \\times 4$?" } },
        { say: "Policz." },
      ),
    );
    expect(
      must(must(document.querySelector("[data-prompt-card]")).firstElementChild).className,
    ).not.toContain("text-center");
  });
});

describe("checked too soon (addendum 2.2)", () => {
  it("the line stands directly under the field, the field dashed, the footer plain; the first key takes both away", () => {
    {
      render(
        step(
          { input: "number", entry: "keypad", decimal: true, stem: { text: "$\\dfrac{37}{100}$" } },
          { say: "Zapisz ułamek jako ułamek dziesiętny." },
        ),
      );
      key("0");
      key(",");
      check();
      expect(must(tooSoon()).textContent).toBe("Dopisz cyfrę po przecinku.");
      // Directly after the field: nothing between them.
      // The field's box, then the live region (out of the flow), then the line.
      const box = must(field().parentElement);
      expect(box.nextElementSibling?.matches("[data-too-soon-live]")).toBe(true);
      expect(box.nextElementSibling?.nextElementSibling).toBe(tooSoon());
      expect(field().getAttribute("data-tone")).toBe("missing");
      expect(must(document.querySelector("[data-too-soon-live]")).getAttribute("aria-live")).toBe(
        "polite",
      );
      expect(must(document.querySelector("[data-too-soon-live]")).textContent).toBe(
        "Dopisz cyfrę po przecinku.",
      );
      // The footer keeps no line of its own.
      expect(document.querySelector("[data-bar] [data-bar-verdict]")).toBeNull();
      key("3");
      expect(field().getAttribute("data-tone")).not.toBe("missing");
      // It fades out (or goes at once where nothing animates), and the live region is empty.
      expect(tooSoon() === null || must(tooSoon()).hasAttribute("data-leaving")).toBe(true);
      expect(must(document.querySelector("[data-too-soon-live]")).textContent).toBe("");
    }
  });

  it("with the field in the maths line, the line stands under the card", () => {
    render(step(SEVEN));
    check();
    const line = must(tooSoon());
    expect(line.textContent).toBe("Najpierw wpisz odpowiedź.");
    expect(must(document.querySelector("[data-prompt-card]")).contains(line)).toBe(false);
    expect(
      must(document.querySelector("[data-prompt-card]")).compareDocumentPosition(line) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe("the solution keeps the child's field (addendum 2.8)", () => {
  it('the field stays in the line with its miss mark, no "Twoja odpowiedź", the card ends on the answer, "Rozwiązanie" once', () => {
    const { rerender } = render(step(SEVEN));
    key("6");
    key("3");
    rerender(step(SEVEN, { feedback: { kind: "try_again", index: 0 }, attemptNo: 2 }));
    const inLine = field();
    rerender(
      step(SEVEN, {
        feedback: { kind: "moved_on", index: 0 },
        attemptNo: 2,
        live: false,
        solution: { entered: "56" },
        solutionLines: [{ text: "7 × 4 = 28" }, { text: "28 + 28 = 56" }, { text: "7 × 8 = 56" }],
      }),
    );
    expect(field()).toBe(inLine);
    expect(field().closest("[data-inline-line]")).not.toBeNull();
    expect(field().textContent).toBe("63");
    expect(field().getAttribute("data-tone")).toBe("amber");
    expect(field().hasAttribute("data-active")).toBe(false);
    expect(document.body.textContent).not.toContain("Twoja odpowiedź");
    // The card's last line is the answer (a Polish page draws × as ·, notation.ts).
    const steps = [...document.querySelectorAll("[data-solution-text]")];
    expect(must(steps.at(-1)).textContent).toMatch(/^7 . 8 = 56$/);
    expect(must(document.body.textContent).match(/Rozwiązanie/g)).toHaveLength(1);
    expect(document.querySelectorAll("[data-field]")).toHaveLength(1);
  });

  it("a step with no worked lines still shows the answer as the card's last line", () => {
    expect(solutionCardLines(null, "56")).toEqual([{ text: "56" }]);
    expect(solutionCardLines([{ text: "7 × 8 = 56" }], "56")).toEqual([{ text: "7 × 8 = 56" }]);
    expect(solutionCardLines([{ text: "3 grupy po 4 to 3 × 4" }], "3×4")).toEqual([
      { text: "3 grupy po 4 to 3 × 4" },
    ]);
    expect(solutionCardLines([{ text: "Policz grupy." }], "3×4")).toEqual([
      { text: "Policz grupy." },
      { text: "3×4" },
    ]);
  });
});
