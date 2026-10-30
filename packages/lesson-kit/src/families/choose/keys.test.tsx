/**
 * Options, one answer and several (paper-behaviour README §3.3, dl-uukj.29.61): one test per row of
 * the table. A tap picks and nothing checks or scrolls; the picked one stays picked with one answer
 * and switches with several; 1 to 4 pick, with badges on the first four only; the arrows move the
 * focus and the pick together; Space picks; Enter checks, or with nothing picked takes the focus to
 * the first option; after a miss the mark and the band stay until another pick, and the focus comes
 * back to the pick after every check. Invented items only.
 *
 * Space is the browser's: on a focused radio or button it fires a click with detail 0, which is what
 * these tests send. The real keys were walked in /playground (docs/plan/widgets/img/dl-uukj.29.61/).
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { Feedback, PageHelp } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { ViewMode, type ViewProps } from "../view.ts";
import { ChooseView } from "./ChooseView.tsx";

afterEach(cleanup);

const scrolled = vi.fn();
beforeEach(() => {
  scrolled.mockReset();
  Element.prototype.scrollIntoView = scrolled;
});

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-25T00:00:00.000Z" }) };
const miss = (parts?: { id: string; correct: boolean }[]): Feedback => ({
  kind: "try_again",
  index: 0,
  ...(parts ? { parts } : {}),
});

/** Which is the biggest? Five options, so the fifth has no key. */
const one: SpecOf<typeof Family.Choose> = {
  id: "k1",
  say: "Which is the biggest?",
  question_type: QuestionType.Recognition,
  family: Family.Choose,
  data: {
    options: [
      { id: "o1", content: { kind: "number", number: 12 } },
      { id: "o2", content: { kind: "number", number: 21 } },
      { id: "o3", content: { kind: "number", number: 9 } },
      { id: "o4", content: { kind: "number", number: 19 } },
      { id: "o5", content: { kind: "number", number: 2 } },
    ],
    select: "one",
    layout: "list",
  },
  key: { correct: ["o2"] },
};

/** Which are even? Several may be picked. */
const many: SpecOf<typeof Family.Choose> = {
  ...one,
  question_type: QuestionType.MultiSelect,
  say: "Which are even?",
  data: { ...one.data, options: one.data.options.slice(0, 4), select: "many" },
  key: { correct: ["o1"] },
};

function draw(spec: SpecOf<typeof Family.Choose>) {
  const onCommit = vi.fn();
  const tree = (
    feedback: Feedback | null,
    attemptNo: number,
    live: boolean,
    help: PageHelp | null,
  ) => (
    <StepFrame stepId="k1">
      <ChooseView
        {...({
          mode: ViewMode.Play,
          spec: pageSpec(spec),
          language: "en",
          category: "child",
          clock,
          live,
          attemptNo,
          feedback,
          onCommit,
          around: { checking: false, moveOn: null, ladder: { help, ask: null, refused: false } },
        } as unknown as ViewProps<typeof Family.Choose>)}
      />
    </StepFrame>
  );
  const out = render(tree(null, 1, true, null));
  const again = (
    feedback: Feedback | null,
    attemptNo = 2,
    live = true,
    help: PageHelp | null = null,
  ) => act(() => out.rerender(tree(feedback, attemptNo, live, help)));
  return { onCommit, again };
}

const radios = () => screen.getAllByRole("radio") as HTMLInputElement[];
const boxes = () => screen.getAllByRole("checkbox");
const label = (i: number) => must(radios()[i]).closest("label") as HTMLElement;
const sprawdz = () => must(document.querySelector<HTMLElement>("[data-check]"));
const ready = () => sprawdz().getAttribute("aria-disabled") !== "true";
const band = () => must(document.querySelector("[data-step-shell]")).getAttribute("data-band");
const enter = (on: Element = document.activeElement ?? document.body) =>
  fireEvent.keyDown(on, { key: "Enter" });
const tap = (el: Element) => fireEvent.pointerDown(el, { button: 0 });

describe("§3.3 tap and click", () => {
  it("a tap picks and makes Sprawdź ready at once; nothing is checked and nothing scrolls", () => {
    const { onCommit } = draw(one);
    expect(ready()).toBe(false);
    tap(label(1));
    expect(must(radios()[1]).checked).toBe(true);
    expect(ready()).toBe(true);
    expect(onCommit).not.toHaveBeenCalled();
    expect(scrolled).not.toHaveBeenCalled();
  });

  it("a tap on another moves the pick to it", () => {
    draw(one);
    tap(label(1));
    tap(label(3));
    expect(radios().map((r) => r.checked)).toEqual([false, false, false, true, false]);
  });

  it("a tap on the picked one leaves it picked, with one answer", () => {
    draw(one);
    tap(label(1));
    tap(label(1));
    expect(must(radios()[1]).checked).toBe(true);
    expect(ready()).toBe(true);
  });

  it("with several a tap switches, and Sprawdź is ready while at least one is picked", () => {
    draw(many);
    fireEvent.click(must(boxes()[0]), { detail: 0 });
    fireEvent.click(must(boxes()[2]), { detail: 0 });
    expect(ready()).toBe(true);
    fireEvent.click(must(boxes()[0]), { detail: 0 });
    expect(must(boxes()[0]).getAttribute("aria-checked")).toBe("false");
    expect(ready()).toBe(true);
    fireEvent.click(must(boxes()[2]), { detail: 0 });
    expect(ready()).toBe(false);
  });
});

describe("§3.3 keys", () => {
  it("1 to 4 pick that option and take the focus to it; the badges stop at 4", () => {
    draw(one);
    expect([...document.querySelectorAll("[data-key-badge]")].map((b) => b.textContent)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ]);
    fireEvent.keyDown(document.body, { key: "3" });
    expect(must(radios()[2]).checked).toBe(true);
    expect(document.activeElement).toBe(radios()[2]);
    // A key on the focused radio is still the options', not a field's.
    fireEvent.keyDown(must(radios()[2]), { key: "2" });
    expect(must(radios()[1]).checked).toBe(true);
    fireEvent.keyDown(document.body, { key: "5" });
    expect(must(radios()[4]).checked).toBe(false);
  });

  it("↑ and ↓ move the focus and the pick together, wrapping, over an option help took away", () => {
    const { again } = draw(one);
    again(null, 1, true, {
      rung: 2,
      card: null,
      focus: null,
      given: { removed: ["o3"] },
      worked: null,
      twin: null,
      more: true,
    });
    must(radios()[1]).focus();
    fireEvent.keyDown(must(radios()[1]), { key: "ArrowDown" });
    expect(document.activeElement).toBe(radios()[3]);
    expect(must(radios()[3]).checked).toBe(true);
    fireEvent.keyDown(must(radios()[3]), { key: "ArrowUp" });
    expect(must(radios()[1]).checked).toBe(true);
    fireEvent.keyDown(must(radios()[1]), { key: "ArrowUp" });
    fireEvent.keyDown(must(radios()[0]), { key: "ArrowUp" });
    expect(document.activeElement).toBe(radios()[4]);
    expect(must(radios()[4]).checked).toBe(true);
  });

  it("with several, ↑ and ↓ move the focus only", () => {
    draw(many);
    must(boxes()[0]).focus();
    fireEvent.keyDown(must(boxes()[0]), { key: "ArrowDown" });
    expect(document.activeElement).toBe(boxes()[1]);
    expect(boxes().every((b) => b.getAttribute("aria-checked") === "false")).toBe(true);
    fireEvent.keyDown(must(boxes()[1]), { key: "ArrowUp" });
    fireEvent.keyDown(must(boxes()[0]), { key: "ArrowUp" });
    expect(document.activeElement).toBe(boxes()[3]);
  });

  it("Space picks the focused option", () => {
    draw(one);
    must(radios()[2]).focus();
    fireEvent.click(must(radios()[2]), { detail: 0 });
    expect(must(radios()[2]).checked).toBe(true);
    expect(ready()).toBe(true);
  });

  it("Enter checks when something is picked", () => {
    const { onCommit } = draw(one);
    fireEvent.keyDown(document.body, { key: "2" });
    enter();
    expect(must(onCommit.mock.calls[0])[0]).toMatchObject({
      value: { chosen: ["o2"] },
      modality: "keyboard",
    });
  });

  it("Enter with nothing picked takes the focus to the first option, checks nothing and says nothing", () => {
    const { onCommit } = draw(one);
    enter(document.body);
    expect(onCommit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(radios()[0]);
    expect(must(radios()[0]).checked).toBe(false);
    expect(screen.queryByRole("status")?.textContent ?? "").toBe("");
    // Sprawdź pressed with nothing picked does the same.
    fireEvent.pointerDown(sprawdz(), { button: 0 });
    expect(onCommit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(radios()[0]);
  });

  it("with several, Enter on a checkbox checks and does not switch it; with nothing picked it goes to the first", () => {
    const { onCommit } = draw(many);
    must(boxes()[2]).focus();
    enter(boxes()[2]);
    expect(onCommit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(boxes()[0]);
    fireEvent.click(must(boxes()[1]), { detail: 0 });
    enter(boxes()[1]);
    expect(must(boxes()[1]).getAttribute("aria-checked")).toBe("true");
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ chosen: ["o2"] });
  });
});

describe("§3.3 after a miss", () => {
  it("the wrong option keeps its mark and the band stays, through Tab and a tap on the pick", () => {
    const { again } = draw(one);
    tap(label(0));
    again(miss([{ id: "o1", correct: false }]));
    expect(label(0).dataset["tone"]).toBe("try_again");
    expect(band()).toBe("miss");
    fireEvent.keyDown(must(radios()[0]), { key: "Tab" });
    tap(label(0));
    expect(label(0).dataset["tone"]).toBe("try_again");
    expect(band()).toBe("miss");
    // The band holds the footer: there is no Sprawdź to press until another pick.
    expect(document.querySelector("[data-check]")).toBeNull();
  });

  it("picking another fades the old mark, folds the band and makes Sprawdź ready", () => {
    const { again } = draw(one);
    tap(label(0));
    again(miss([{ id: "o1", correct: false }]));
    tap(label(1));
    expect(label(0).dataset["tone"]).toBe("idle");
    expect(screen.queryByText("tried")).toBeNull();
    expect(band()).toBe("none");
    expect(ready()).toBe(true);
    // The fade is the mark's 120 ms (foundation.css --jw-dur-mark).
    expect(label(0).className).toContain("duration-[var(--jw-dur-mark,120ms)]");
  });

  it("an arrow after a miss is a pick too: the mark goes and the band folds", () => {
    const { again } = draw(one);
    fireEvent.keyDown(document.body, { key: "1" });
    again(miss([{ id: "o1", correct: false }]));
    fireEvent.keyDown(must(radios()[0]), { key: "ArrowDown" });
    expect(label(0).dataset["tone"]).toBe("idle");
    expect(band()).toBe("none");
  });

  it("with several, switching a marked option folds the band; the others keep their marks", () => {
    const { again } = draw(many);
    fireEvent.click(must(boxes()[1]), { detail: 0 });
    fireEvent.click(must(boxes()[2]), { detail: 0 });
    again(
      miss([
        { id: "o2", correct: false },
        { id: "o3", correct: false },
      ]),
    );
    expect(band()).toBe("miss");
    fireEvent.click(must(boxes()[1]), { detail: 0 });
    expect(must(boxes()[1]).dataset["tone"]).toBe("idle");
    expect(must(boxes()[2]).dataset["tone"]).toBe("try_again");
    expect(band()).toBe("none");
    expect(ready()).toBe(true);
  });

  it("the focus stays on the pick after every check, even one made by a click on Sprawdź", () => {
    const { onCommit, again } = draw(one);
    tap(label(3));
    sprawdz().focus();
    fireEvent.pointerDown(sprawdz(), { button: 0 });
    expect(onCommit).toHaveBeenCalledTimes(1);
    // The press's own mousedown does not take the focus to the button (or to nothing once the
    // band replaces it); the next one does as usual.
    expect(fireEvent.mouseDown(sprawdz(), { button: 0 })).toBe(false);
    fireEvent.click(document.body);
    expect(fireEvent.mouseDown(sprawdz(), { button: 0 })).toBe(true);
    // The step is not live while the check is out; the focus comes back once it is.
    again(null, 1, false);
    again(miss([{ id: "o4", correct: false }]));
    expect(document.activeElement).toBe(radios()[3]);
  });

  it("with several the focus goes back to the option last switched", () => {
    const { again } = draw(many);
    fireEvent.click(must(boxes()[0]), { detail: 0 });
    fireEvent.click(must(boxes()[2]), { detail: 0 });
    sprawdz().focus();
    again(miss([{ id: "o3", correct: false }]));
    expect(document.activeElement).toBe(boxes()[2]);
  });
});
