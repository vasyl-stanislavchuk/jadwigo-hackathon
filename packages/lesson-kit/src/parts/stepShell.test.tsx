/**
 * The lesson frame (decision dl-q3p9, lesson-frame README): the footer at rest and as each band,
 * the help note with its way out, the top bar and the pause sheet, focus on open, and the state
 * table.
 */

import { copy } from "@jadwigo/copy";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Feedback } from "../stage/types.ts";
import { must } from "./must.ts";
import {
  bandWords,
  LessonFrame,
  StepShell,
  type StepShellProps,
  spokenInstruction,
} from "./StepShell.tsx";
import { STATUS, StepStatus, statusOf } from "./status.ts";
import type { StepField, StepKeysInput } from "./stepKeys.ts";
import { Tools } from "./Tools.tsx";

// A step test is written for a phone window, 390 x 844: the lesson picks its frame from the window
// (frame.ts), and happy-dom opens at 1024 x 768.
beforeAll(() => {
  (
    window as unknown as {
      happyDOM: { setViewport(size: { width: number; height: number }): void };
    }
  ).happyDOM.setViewport({ width: 390, height: 844 });
});

afterEach(cleanup);

const press = (fn = vi.fn()) => ({ onPointerDown: () => fn(), onClick: () => undefined });
const field = (id: string, value: string, more: Partial<StepField> = {}): StepField => ({
  id,
  kind: "field",
  maxLength: 2,
  value,
  marked: false,
  ...more,
});
/** A laptop's window for one test: tooltips show on a mouse or a keyboard only, so only the laptop
 * frame draws them (frame.ts reads the window). */
function asLaptop(): () => void {
  const was = window.innerWidth;
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1280 });
  return () => Object.defineProperty(window, "innerWidth", { configurable: true, value: was });
}
const keysOf = (fields: StepField[]): StepKeysInput => ({
  fields,
  clear: () => undefined,
  select: () => undefined,
});

function shell(props: Partial<StepShellProps> = {}) {
  return (
    <StepShell
      language="en"
      category="child"
      feedback={null}
      stem={<p>7 + 5</p>}
      answer={<p>answer</p>}
      action={{ ready: true, press: press() }}
      {...props}
    />
  );
}

const en = (key: Parameters<typeof copy>[1]) => copy("en", key);
const bar = (c: HTMLElement) => must(c.querySelector<HTMLElement>("[data-bar]"));
const miss: Feedback = { kind: "try_again", index: 0 };
const ask = () => ({ enabled: true, press: press() });
const hints = [{ text: "Count the rows." }, { text: "Now the columns." }, { text: "So 7 and 8." }];
const released = (n: number) => ({
  rung: n,
  card: null,
  focus: null,
  given: null,
  worked: null,
  twin: null,
  more: n < hints.length,
  hints: hints.slice(0, n),
  hintsTotal: hints.length,
});

describe("the footer at rest", () => {
  it("sits after the column: the bulb for help from the first frame, then Sprawdź", () => {
    const { container } = render(shell({ ladder: { help: null, ask: ask(), refused: false } }));
    const stage = must(bar(container).previousElementSibling);
    expect(stage.hasAttribute("data-stage")).toBe(true);
    expect(bar(container).getAttribute("data-band")).toBe("none");
    const buttons = [...bar(container).querySelectorAll("button")].map(
      (b) => b.getAttribute("aria-label") ?? b.textContent,
    );
    expect(buttons).toEqual([en("help_me"), en("check")]);
  });

  it("draws no bulb when there is no help to give and no way out", () => {
    const { container } = render(
      shell({
        moveOn: { enabled: false, press: press() },
        ladder: { help: null, ask: { enabled: false, press: press() }, refused: false },
      }),
    );
    expect(container.querySelector("[data-help-ask]")).toBeNull();
  });

  it("lets a Check that is not ready still be pressed, and says what is left", () => {
    const fn = vi.fn();
    render(shell({ action: { ready: false, press: press(fn) }, incomplete: "incomplete_gaps" }));
    const check = screen.getByRole("button", { name: "Check" });
    expect(check.getAttribute("aria-disabled")).toBe("true");
    fireEvent.pointerDown(check);
    expect(fn).toHaveBeenCalledOnce();
    expect(screen.getByText("Fill in the empty spaces too.")).toBeTruthy();
  });

  it("while quiet points the way: the focus goes to the first empty field (§3.5)", () => {
    const fields = (
      <>
        <input aria-label="hours" data-field="h" defaultValue="4" />
        <input aria-label="minutes" data-field="m" />
      </>
    );
    render(
      shell({
        answer: fields,
        action: { ready: false, press: press() },
        keys: keysOf([field("h", "4"), field("m", "")]),
      }),
    );
    fireEvent.pointerDown(screen.getByRole("button", { name: "Check" }));
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "minutes" }));
  });
});

describe("the quiet Sprawdź tooltip (§3.5)", () => {
  it("repeats the instruction before a miss, and the band’s line after one, on a laptop only", () => {
    const restore = asLaptop();
    const quiet = { ready: false, press: press() };
    const { container, rerender } = render(
      shell({ action: quiet, instruction: "Write the **missing** number." }),
    );
    expect(
      must(
        must(must(container.querySelector("[data-check]")).closest(".kid-tooltip")).querySelector(
          '[role="tooltip"]',
        ),
      ).textContent,
    ).toBe("Write the missing number.");
    rerender(shell({ action: quiet, instruction: "Write $3 \\times 4$." }));
    expect(must(container.querySelector("[data-check]")).closest(".kid-tooltip")).toBeNull();
    rerender(shell({ action: { ready: true, press: press() }, instruction: "Write the number." }));
    expect(must(container.querySelector("[data-check]")).closest(".kid-tooltip")).toBeNull();
    restore();
    cleanup();
    // A phone never shows a tooltip, so it draws none.
    const phone = render(shell({ action: quiet, instruction: "Write the missing number." }));
    expect(must(phone.container.querySelector("[data-check]")).closest(".kid-tooltip")).toBeNull();
  });

  it("names no tooltip from words that are not on the screen", () => {
    expect(spokenInstruction(undefined)).toBeNull();
    expect(spokenInstruction("Look at ![a cat](cat.png)")).toBeNull();
    expect(spokenInstruction("_Fill_ in the gaps.")).toBe("Fill in the gaps.");
  });
});

describe("the bands", () => {
  it('after a miss: "Not yet.", the fix line and help, no Check; it folds back once the answer changes', () => {
    const { container, rerender } = render(
      shell({
        answer: <input aria-label="answer" />,
        feedback: miss,
        ladder: { help: null, ask: ask(), refused: false },
      }),
    );
    expect(bar(container).getAttribute("data-band")).toBe("miss");
    expect(bar(container).textContent).toContain(en("ds_miss_short"));
    expect(bar(container).textContent).toContain(en("ds_miss_fix"));
    expect(bar(container).querySelector("[data-help-ask]")).not.toBeNull();
    expect(bar(container).querySelector("[data-check]")).toBeNull();
    fireEvent.input(screen.getByRole("textbox", { name: "answer" }), { target: { value: "12" } });
    expect(bar(container).getAttribute("data-band")).toBe("none");
    expect(bar(container).hasAttribute("data-folded")).toBe(true);
    expect(must(bar(container).querySelector("[data-check]")).getAttribute("aria-disabled")).toBe(
      "false",
    );
    rerender(
      shell({
        answer: <input aria-label="answer" />,
        feedback: { kind: "try_again", index: 1 },
        ladder: { help: null, ask: ask(), refused: false },
      }),
    );
    expect(bar(container).getAttribute("data-band")).toBe("miss");
  });

  it('after a right answer: "Well done!", the worked line and Dalej, and no Check', () => {
    const fn = vi.fn();
    const { container } = render(
      shell({
        feedback: { kind: "praise", index: 0 },
        workedSolution: ["8 + 8", "2 × 8 = 16"],
        next: { press: press(fn) },
      }),
    );
    expect(bar(container).getAttribute("data-band")).toBe("right");
    expect(must(bar(container).querySelector("[data-band-title]")).textContent).toBe(
      en("ds_right_short"),
    );
    expect(must(bar(container).querySelector("[data-band-line]")).textContent).toBe("2 × 8 = 16");
    expect(container.querySelector("[data-check]")).toBeNull();
    fireEvent.pointerDown(must(bar(container).querySelector("[data-next]")));
    expect(fn).toHaveBeenCalledOnce();
    // The worked solution is in the band, not again in the help area.
    expect(container.querySelector('[data-help="worked"]')).toBeNull();
  });

  it("names every right answer of a several-answer step, from the worked line's list (addendum 1.3, dl-uukj.29.76)", () => {
    const worked = [
      "Są 2 rzędy po 9.",
      "Do rysunku pasują te wyrażenia:\n\n- $9+9$\n- $2\\times9$",
    ];
    const { container } = render(
      shell({
        language: "pl",
        feedback: { kind: "praise", index: 0 },
        workedSolution: worked,
        next: { press: press() },
      }),
    );
    const line = must(bar(container).querySelector("[data-band-line]"));
    expect(line.textContent).toContain(" i ");
    expect(line.textContent).not.toContain("Do rysunku");
    expect(bandWords(must(worked[1]), "pl")).toBe("$9+9$ i $2\\times9$");
    expect(bandWords("- a\n- b\n- c", "en")).toBe("a, b, and c");
    expect(bandWords("2 × 8 = 16", "en")).toBe("2 × 8 = 16");
    expect(bandWords("So:\n\n$2 \\times 8$", "en")).toBe("So: $2 \\times 8$");
  });

  it("names the other form on the right band when there is no worked line (dl-w3.68.1)", () => {
    const { container } = render(
      shell({
        language: "pl",
        feedback: { kind: "praise", index: 0, also: "trzy pomnożone przez cztery" },
        next: { press: press() },
      }),
    );
    expect(must(bar(container).querySelector("[data-band-line]")).textContent).toBe(
      "Można też napisać: trzy pomnożone przez cztery",
    );
  });

  it('after "I don\'t know yet": the solution band with Dalej; without Dalej it says the moved-on line', () => {
    const back = asLaptop();
    const laptop = render(
      shell({ action: null, feedback: { kind: "moved_on", index: 0 }, next: { press: press() } }),
    );
    expect(must(bar(laptop.container).querySelector("[data-band-title]")).textContent).toBe(
      en("ds_solution_band"),
    );
    expect(must(bar(laptop.container).querySelector("[data-band-line]")).textContent).toBe(
      en("ds_compare_solution"),
    );
    back();
    cleanup();
    // A phone's band has the short title and keeps the second line (addendum 1.3, dl-uukj.29.80).
    const { container, rerender } = render(
      shell({ action: null, feedback: { kind: "moved_on", index: 0 }, next: { press: press() } }),
    );
    expect(bar(container).getAttribute("data-band")).toBe("solution");
    expect(must(bar(container).querySelector("[data-band-title]")).textContent).toBe(
      en("ds_solution_label"),
    );
    expect(must(bar(container).querySelector("[data-band-line]")).textContent).toBe(
      en("ds_compare_solution"),
    );
    expect(
      must(bar(container).querySelector("[data-band-line]")).hasAttribute("data-wide-only"),
    ).toBe(false);
    expect(bar(container).querySelector("[data-next]")).not.toBeNull();
    rerender(shell({ action: null, feedback: { kind: "moved_on", index: 0 } }));
    expect(must(bar(container).querySelector("[data-band-title]")).textContent).toBe(
      en("moved_on"),
    );
    expect(bar(container).querySelector("[data-next]")).toBeNull();
  });

  it("announces the band in one live region", () => {
    const { container } = render(shell({ feedback: miss }));
    expect(must(container.querySelector("[data-announce]")).textContent).toBe(
      `${en("ds_miss_short")} ${en("ds_miss_fix")}`,
    );
  });
});

// Choose addendum 1.2 (decision dl-n501, dl-uukj.29.86).
describe("the solution card", () => {
  const lines = [
    { text: "7 × 5 = 35" },
    { text: "35 + 7 = 42" },
    { text: "So $7 \\times 6$ is **not** 48." },
  ];
  const card = (c: HTMLElement) =>
    c.querySelector<HTMLElement>('[data-area="help"] [data-solution-card]');

  it('after "I don\'t know yet" stands under the answer with every worked line numbered, and the help note folds away', () => {
    const { container } = render(
      shell({
        action: null,
        feedback: { kind: "moved_on", index: 0 },
        next: { press: press() },
        solutionLines: lines,
        moveOn: { enabled: true, press: press() },
        ladder: { help: released(2), ask: ask(), refused: false },
      }),
    );
    const box = must(card(container));
    expect(box).not.toBeNull();
    expect(must(box.querySelector("[data-solution-card-head]")).textContent).toBe(
      en("worked_solution"),
    );
    expect([...box.querySelectorAll("[data-solution-n]")].map((n) => n.textContent)).toEqual([
      "1.",
      "2.",
      "3.",
    ]);
    expect([...box.querySelectorAll("[data-solution-text]")].map((n) => n.textContent)).toEqual([
      "7 × 5 = 35",
      "35 + 7 = 42",
      "So 7 × 6 is not 48.",
    ]);
    expect(container.querySelector("[data-help-note]")).toBeNull();
    expect(container.querySelector('[data-help="worked"]')).toBeNull();
    // Yellow stays help: the card is never the help note.
    expect(box.classList.contains("kid-help-note")).toBe(false);
  });

  it("takes a worked solution released before when no lines came with the solution, its colours off", () => {
    const { container } = render(
      shell({
        action: null,
        feedback: { kind: "moved_on", index: 0 },
        next: { press: press() },
        workedSolution: ["There are $\\blueD7$ rows."],
      }),
    );
    expect(must(must(card(container)).querySelector("[data-solution-text]")).textContent).toBe(
      "There are 7 rows.",
    );
    expect(must(card(container)).innerHTML).not.toContain("tex-blue");
  });

  // dl-uukj.29.96: the worked solution a Choose step with no help gets after its second miss drew
  // as a yellow help note with a bulb. It is the same ink card, never help's yellow.
  it("takes a worked solution released mid-step, after the second miss, in ink and never as help", () => {
    const { container } = render(
      shell({
        feedback: { kind: "try_again", index: 1 },
        workedSolution: ["There are $\\blueD4$ jumps.", "$4 \\cdot 4$"],
      }),
    );
    const box = must(card(container));
    expect(box).not.toBeNull();
    expect([...box.querySelectorAll("[data-solution-n]")].map((n) => n.textContent)).toEqual([
      "1.",
      "2.",
    ]);
    expect(must(box.querySelector("[data-solution-text]")).textContent).toBe("There are 4 jumps.");
    expect(container.querySelector('[data-help="worked"]')).toBeNull();
    expect(container.querySelector(".kid-help-note")).toBeNull();
    expect(container.querySelector(".kid-help-bulb")).toBeNull();
  });

  it("is not drawn on a step with no worked lines, nor after a right answer, which keeps its one worked line in the band", () => {
    const none = render(
      shell({
        action: null,
        feedback: { kind: "moved_on", index: 0 },
        next: { press: press() },
        solutionLines: [],
      }),
    );
    expect(card(none.container)).toBeNull();
    cleanup();
    const right = render(
      shell({
        feedback: { kind: "praise", index: 0 },
        next: { press: press() },
        workedSolution: lines.map((l) => l.text),
        solutionLines: lines,
      }),
    );
    expect(card(right.container)).toBeNull();
    expect(bar(right.container).getAttribute("data-band")).toBe("right");
    expect(must(bar(right.container).querySelector("[data-band-line]")).textContent).toBe(
      "So 7 × 6 is not 48.",
    );
  });

  it("comes into view whole, once the finger that pressed is up", async () => {
    const scroll = await import("./scroll.ts");
    fireEvent.pointerUp(document.body);
    const show = vi.spyOn(scroll, "scrollToShow");
    const lesson = (feedback: Feedback | null) => (
      <div data-learner-view>
        {shell({
          answer: <div data-solution>12</div>,
          action: null,
          feedback,
          next: feedback ? { press: press() } : null,
          solutionLines: lines,
        })}
      </div>
    );
    const { container, rerender } = render(lesson(null));
    fireEvent.pointerDown(document.body);
    rerender(lesson({ kind: "moved_on", index: 0 }));
    expect(show).not.toHaveBeenCalled();
    fireEvent.pointerUp(document.body);
    expect(show).toHaveBeenLastCalledWith(card(container));
    show.mockRestore();
  });
});

// dl-uukj.29.78: Khan's colour macros were read out ("Jest blueD7 rzędów").
describe("the live region reads words, never TeX", () => {
  it("reads the right band's worked line and a hint as words", () => {
    const worked = ["The following image shows $\\blueD3\\times\\maroonD2$:"];
    const { container } = render(
      shell({
        feedback: { kind: "praise", index: 0 },
        next: { press: press() },
        workedSolution: worked,
      }),
    );
    expect(must(container.querySelector("[data-announce]")).textContent).toBe(
      `${en("ds_right_short")} The following image shows 3 × 2:`,
    );
    cleanup();
    const help = {
      ...released(1),
      hints: [{ text: "Jest $\\blueD7$ rzędów, a w każdym **rzędzie** $\\purpleC6$ kwiatów." }],
    };
    const hinted = render(
      shell({ language: "pl", feedback: miss, ladder: { help, ask: ask(), refused: false } }),
    );
    expect(must(hinted.container.querySelector("[data-announce]")).textContent).toBe(
      "Jest 7 rzędów, a w każdym rzędzie 6 kwiatów.",
    );
  });
});

describe("the help note", () => {
  it("grows under one counter, keeps the bulb's width, and ends with the way out", () => {
    const { container } = render(
      shell({
        moveOn: { enabled: true, press: press() },
        ladder: { help: released(2), ask: ask(), refused: false },
      }),
    );
    const note = must(container.querySelector('[data-area="help"] [data-help-note]'));
    expect(must(note.querySelector("[data-help-count]")).textContent).toBe("2 of 3");
    expect([...note.querySelectorAll("[data-help-card]")].map((c) => c.textContent)).toEqual([
      "Count the rows.",
      "Now the columns.",
    ]);
    expect(note.querySelector("[data-help-more]")).not.toBeNull();
    expect(must(note.lastElementChild).textContent).toBe(en("dont_know_yet"));
    const bulb = must(bar(container).querySelector("[data-bulb]"));
    expect(bulb.hasAttribute("data-held")).toBe(true);
    expect(bulb.getAttribute("aria-hidden")).toBe("true");
  });

  it("folds the miss band once help is out, Sprawdź resting until the answer changes", () => {
    const { container } = render(
      shell({ feedback: miss, ladder: { help: released(1), ask: ask(), refused: false } }),
    );
    expect(bar(container).getAttribute("data-band")).toBe("none");
    expect(must(bar(container).querySelector("[data-check]")).getAttribute("aria-disabled")).toBe(
      "true",
    );
  });

  it("with no help to give, the bulb's slot holds Jeszcze nie wiem, one tap away (dl-uukj.29.154)", () => {
    const out = vi.fn();
    const { container } = render(shell({ moveOn: { enabled: true, press: press(out) } }));
    expect(bar(container).querySelector("[data-bulb]")).toBeNull();
    const wayOut = must(bar(container).querySelector<HTMLElement>("[data-move-on]"));
    expect(wayOut.textContent).toContain(en("dont_know_yet"));
    fireEvent.pointerDown(wayOut);
    expect(out).toHaveBeenCalledOnce();
    expect(container.querySelector("[data-help-note]")).toBeNull();
  });

  it("draws a rung the api wrote itself, a card and no hints, as the note's one card", () => {
    const look = {
      ...released(0),
      rung: 1,
      card: { text: "Spójrz jeszcze raz." },
      hints: [],
      hintsTotal: null,
      more: true,
    };
    const { container } = render(shell({ ladder: { help: look, ask: ask(), refused: false } }));
    const cards = container.querySelectorAll("[data-help-card]");
    expect(cards).toHaveLength(1);
    expect(cards[0]?.textContent).toContain("Spójrz jeszcze raz.");
    // With more to come and no total, the counter is not drawn: "1 z 1" beside Więcej pomocy lied.
    expect(container.querySelector("[data-help-count]")).toBeNull();
  });

  it("a rung with nothing to show opens no empty note: the bulb gives way to Jeszcze nie wiem", () => {
    const empty = { ...released(0), more: true, hints: [] };
    const { container } = render(
      shell({
        ladder: { help: empty, ask: ask(), refused: false },
        moveOn: { enabled: true, press: press() },
      }),
    );
    expect(container.querySelector("[data-help-note]")).toBeNull();
    expect(bar(container).querySelector("[data-bulb]")).toBeNull();
    expect(bar(container).querySelector("[data-move-on]")).not.toBeNull();
  });

  it("says to have a go first when the gate holds the next card", () => {
    const { container } = render(
      shell({ ladder: { help: released(1), ask: null, refused: true } }),
    );
    expect(must(container.querySelector("[data-help-refused]")).textContent).toBe(
      en("help_try_first"),
    );
  });

  it("draws the dashed blank only where the almost-there card leaves one", () => {
    const card = (blank: boolean) => ({
      ...released(1),
      hints: [{ text: "", lines: ["7 + 7 = □"], blank }],
    });
    const { container, rerender } = render(
      shell({ ladder: { help: card(true), ask: null, refused: false } }),
    );
    expect(container.querySelector("[data-help-blank]")).not.toBeNull();
    rerender(shell({ ladder: { help: card(false), ask: null, refused: false } }));
    expect(container.querySelector("[data-help-blank]")).toBeNull();
  });
});

describe("the top bar and the pause sheet", () => {
  it("is drawn only in a lesson, its step bar spoken as words", () => {
    const { container, rerender } = render(shell());
    expect(container.querySelector("[data-topbar]")).toBeNull();
    rerender(shell({ progress: { done: 3, total: 6 } }));
    expect(must(container.querySelector("[data-progress]")).getAttribute("aria-label")).toBe(
      en("ds_progress_half"),
    );
    expect(must(container.querySelector<HTMLElement>("[data-progress-fill]")).style.width).toBe(
      "50%",
    );
  });

  it("close pauses and never quits: back returns to the same step, and stopping is the page's", () => {
    const stop = vi.fn();
    render(
      <LessonFrame.Provider value={{ onStop: stop }}>
        {shell({ progress: { done: 0, total: 4 } })}
      </LessonFrame.Provider>,
    );
    fireEvent.click(screen.getByRole("button", { name: en("ds_pause_title") }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(document.activeElement?.textContent).toBe(en("ds_pause_back"));
    fireEvent.click(screen.getByRole("button", { name: en("ds_pause_stop") }));
    expect(stop).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: en("ds_pause_back") }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("7 + 5")).toBeTruthy();
  });
});

// The typed-answer flow (decision 2026-10-24-a-typed-question-flows-like-duolingo-s, dl-w3.68.32).
describe("focus on open", () => {
  it("gives the first field in fill order the focus when the step opens, without scrolling", () => {
    const focus = vi.spyOn(HTMLElement.prototype, "focus");
    render(
      shell({
        answer: <input aria-label="answer" data-field="a" />,
        keys: keysOf([field("a", "")]),
      }),
    );
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "answer" }));
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    focus.mockRestore();
  });

  it("focuses a field, never a tile, a keypad key or a one-tap option, and never takes the focus from a control", () => {
    const { unmount } = render(
      shell({
        answer: (
          <div>
            <button type="button">7</button>
            <button type="button" aria-haspopup="listbox" data-field="g">
              gap
            </button>
          </div>
        ),
        keys: keysOf([field("g", "")]),
      }),
    );
    expect(document.activeElement?.textContent).toBe("gap");
    unmount();
    render(
      shell({
        answer: (
          <div>
            <button type="button">7</button>
            <button type="button" data-tile>
              tile
            </button>
          </div>
        ),
      }),
    );
    // A tile step opens like a choice step, with nothing focused (paper-behaviour README §3.6).
    expect(document.activeElement).toBe(document.body);
    cleanup();
    render(shell({ answer: <button type="button">7</button> }));
    expect(document.activeElement).toBe(document.body);
    cleanup();

    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    render(
      shell({
        answer: <input aria-label="answer" data-field="a" />,
        keys: keysOf([field("a", "")]),
      }),
    );
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it("focuses nothing on a choice step, so 1 to 4 work at once (§3.6): no radio or checkbox takes the focus", () => {
    render(
      shell({
        answer: (
          <div role="radiogroup">
            <label data-option>
              <input type="radio" name="o" className="sr-only" />7
            </label>
            <label data-option>
              <input type="checkbox" className="sr-only" />8
            </label>
          </div>
        ),
      }),
    );
    expect(document.activeElement).toBe(document.body);
  });

  it("keeps the focus where it is on a verdict: it moves only when the step opens", () => {
    const { rerender } = render(shell({ answer: <input aria-label="answer" /> }));
    const field = screen.getByRole("textbox", { name: "answer" });
    field.blur();
    rerender(
      shell({ answer: <input aria-label="answer" />, feedback: { kind: "try_again", index: 0 } }),
    );
    expect(document.activeElement).not.toBe(field);
  });
});

describe("the state table", () => {
  it("gives every state that has words an icon too, so colour and words never stand alone", () => {
    for (const [state, row] of Object.entries(STATUS)) {
      if (row.words !== null) expect(row.icon, state).not.toBeNull();
    }
  });

  it("never uses amber for a missing part: it is not a verdict", () => {
    expect(STATUS.incomplete.tone).toBe("missing");
  });

  it("maps every feedback kind, checking and an incomplete answer to one state", () => {
    expect(statusOf({ feedback: null })).toBe(StepStatus.Answering);
    expect(statusOf({ feedback: { kind: "praise", index: 0 } })).toBe(StepStatus.Right);
    expect(statusOf({ feedback: { kind: "try_again", index: 0 } })).toBe(StepStatus.NotYet);
    expect(statusOf({ feedback: { kind: "moved_on", index: 0 } })).toBe(StepStatus.MovedOn);
    expect(statusOf({ feedback: null, checking: true })).toBe(StepStatus.Checking);
    expect(
      statusOf({ feedback: { kind: "try_again", index: 0 }, incomplete: "incomplete_gaps" }),
    ).toBe(StepStatus.Incomplete);
  });
});

/**
 * The two keyboard demos of designs/Lesson Behaviour.dc.html (paper-behaviour README §4), replayed
 * key by key through the shell: the same three rows, the same answers, the same judge (each field
 * against its answer, the misses marked until edited).
 */
const DEMOS = {
  fields: {
    slot: false,
    max: 2,
    rows: ["6 × 4 =", "7 × 4 =", "8 × 4 ="],
    answers: ["24", "28", "32"],
  },
  slots: {
    slot: true,
    max: 1,
    rows: ["4 × 7 = 2", "4 × 9 =", "4 × 8 = 3"],
    answers: ["8", "3", "2"],
  },
} as const;

function Demo({
  demo,
  onCheck,
  ladder,
}: {
  demo: keyof typeof DEMOS;
  onCheck(): void;
  ladder?: StepShellProps["ladder"];
}): JSX.Element {
  const c = DEMOS[demo];
  const [vals, setVals] = useState(["", "", ""]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [edited, setEdited] = useState<ReadonlySet<number>>(new Set());
  const set = (i: number, v: string) => {
    const digits = v.replace(/\D/g, "");
    setVals((old) =>
      old.map((x, j) => (j === i ? (c.slot ? digits.slice(-1) : digits.slice(0, c.max)) : x)),
    );
    setEdited((e) => new Set([...e, i]));
  };
  const marked = (i: number) =>
    feedback?.kind === "try_again" && vals[i] !== c.answers[i] && !edited.has(i);
  const right = feedback?.kind === "praise";
  const complete = vals.every((v) => v !== "");
  // As a view does: a press on an answer not yet complete commits nothing.
  const commit = () => {
    if (!complete) return;
    onCheck();
    setEdited(new Set());
    const parts = vals.map((v, i) => ({ id: String(i), correct: v === c.answers[i] }));
    setFeedback(
      parts.every((p) => p.correct)
        ? { kind: "praise", index: 0 }
        : { kind: "try_again", index: 0, parts },
    );
  };
  const keys: StepKeysInput = {
    fields: vals.map((v, i) => ({
      id: String(i),
      kind: c.slot ? "slot" : "field",
      maxLength: c.max,
      value: v,
      marked: marked(i),
    })),
    clear: (id) => setVals((old) => old.map((x, j) => (String(j) === id ? "" : x))),
    select: () => undefined,
  };
  return (
    <StepShell
      language="pl"
      category="child"
      feedback={feedback}
      stem={<p>{demo}</p>}
      ladder={ladder}
      keys={keys}
      action={{
        ready: complete && !right,
        press: { onPointerDown: commit, onClick: (e) => e.detail === 0 && commit() },
      }}
      next={right ? { press: press() } : null}
      answer={c.rows.map((row, i) => (
        <label key={row}>
          {row}
          <input
            aria-label={`Pole ${i + 1}`}
            data-field={String(i)}
            data-tone={marked(i) ? "amber" : "idle"}
            value={vals[i]}
            readOnly={right}
            onChange={(e) => set(i, e.target.value)}
          />
        </label>
      ))}
    />
  );
}

const pole = (n: number) => screen.getByRole("textbox", { name: `Pole ${n}` }) as HTMLInputElement;
const focused = () => (document.activeElement as HTMLInputElement).getAttribute("aria-label");
const key = (k: string, more: object = {}) =>
  fireEvent.keyDown(must(document.activeElement), { key: k, ...more });
const type = (v: string) =>
  fireEvent.change(must(document.activeElement), { target: { value: v } });
const selection = () => {
  const el = document.activeElement as HTMLInputElement;
  return [el.selectionStart, el.selectionEnd];
};
const band = () => must(document.querySelector("[data-bar]")).getAttribute("data-band");
const ready = () =>
  document.querySelector("[data-check]")?.getAttribute("aria-disabled") === "false";

describe("the keyboard demo with fields of any length (§3.4, §3.5)", () => {
  it("opens in the first field; a field never jumps; Enter goes to the next empty field and stays in an empty one", () => {
    const checks = vi.fn();
    render(<Demo demo="fields" onCheck={checks} />);
    expect(focused()).toBe("Pole 1");
    type("2");
    expect(focused()).toBe("Pole 1");
    type("24");
    expect(focused()).toBe("Pole 1");
    key("Enter");
    expect(focused()).toBe("Pole 2");
    key("Enter");
    expect(focused()).toBe("Pole 2");
    type("28");
    key("Enter");
    expect(focused()).toBe("Pole 3");
    // Enter in a filled field with nothing empty after it wraps to the start.
    type("32");
    pole(1).focus();
    type("");
    pole(2).focus();
    key("Enter");
    expect(focused()).toBe("Pole 1");
    expect(checks).not.toHaveBeenCalled();
  });

  it("walks Tab, Shift+Tab and the arrows in fill order, and stops at the ends", () => {
    render(<Demo demo="fields" onCheck={vi.fn()} />);
    key("Tab");
    expect(focused()).toBe("Pole 2");
    key("Tab", { shiftKey: true });
    expect(focused()).toBe("Pole 1");
    key("ArrowUp");
    expect(focused()).toBe("Pole 1");
    key("ArrowDown");
    key("ArrowDown");
    expect(focused()).toBe("Pole 3");
    key("ArrowDown");
    expect(focused()).toBe("Pole 3");
    type("32");
    // ← moves only from the start of the text, → only from its end.
    pole(3).setSelectionRange(1, 1);
    key("ArrowLeft");
    key("ArrowRight");
    expect(focused()).toBe("Pole 3");
    pole(3).setSelectionRange(0, 0);
    key("ArrowLeft");
    expect(focused()).toBe("Pole 2");
    // The caret lands at the end of the text, nothing selected.
    key("ArrowDown");
    expect(selection()).toEqual([2, 2]);
  });

  it("checks only on Enter with every field filled, then a miss focuses the first marked field with its text selected", () => {
    const checks = vi.fn();
    render(<Demo demo="fields" onCheck={checks} />);
    type("2");
    key("Tab");
    type("28");
    key("Tab");
    type("33");
    expect(checks).not.toHaveBeenCalled();
    key("Enter");
    expect(checks).toHaveBeenCalledOnce();
    expect(band()).toBe("miss");
    expect(focused()).toBe("Pole 1");
    expect(selection()).toEqual([0, 1]);
  });

  it("walks every field after a miss, selecting the marked ones, and checks from the last only once a marked part changed", () => {
    const checks = vi.fn();
    render(<Demo demo="fields" onCheck={checks} />);
    type("2");
    key("Tab");
    type("28");
    key("Tab");
    type("33");
    key("Enter");
    expect(checks).toHaveBeenCalledTimes(1);
    key("Enter");
    expect(focused()).toBe("Pole 2");
    expect(selection()).toEqual([2, 2]);
    key("Enter");
    expect(focused()).toBe("Pole 3");
    expect(selection()).toEqual([0, 2]);
    // The last field before any change: no second check, back to the first marked field.
    key("Enter");
    expect(checks).toHaveBeenCalledTimes(1);
    expect(focused()).toBe("Pole 1");
    expect(selection()).toEqual([0, 1]);
    // An unmarked field stays editable, and editing it does not make Sprawdź ready.
    pole(2).focus();
    type("27");
    expect(band()).toBe("miss");
    type("28");
    // The first edit in a marked field folds the band and makes Sprawdź ready; the other mark stays.
    pole(1).focus();
    type("24");
    expect(band()).toBe("none");
    expect(ready()).toBe(true);
    expect(pole(1).getAttribute("data-tone")).toBe("idle");
    expect(pole(3).getAttribute("data-tone")).toBe("amber");
    key("Enter");
    expect(focused()).toBe("Pole 2");
    key("Enter");
    expect(focused()).toBe("Pole 3");
    key("Enter");
    expect(checks).toHaveBeenCalledTimes(2);
    // Still 33: a miss again, the focus on the one marked field.
    expect(band()).toBe("miss");
    expect(focused()).toBe("Pole 3");
    expect(selection()).toEqual([0, 2]);
    type("32");
    key("Enter");
    expect(checks).toHaveBeenCalledTimes(3);
    expect(band()).toBe("right");
  });

  it("a quiet Sprawdź goes to the first empty field, and after a miss to the first marked one, its tooltip repeating the band", () => {
    const restore = asLaptop();
    const checks = vi.fn();
    render(
      <Demo
        demo="fields"
        onCheck={checks}
        ladder={{ help: released(1), ask: null, refused: false }}
      />,
    );
    type("24");
    fireEvent.pointerDown(screen.getByRole("button", { name: copy("pl", "check") }));
    expect(checks).not.toHaveBeenCalled();
    expect(focused()).toBe("Pole 2");
    type("28");
    key("Tab");
    type("31");
    key("Enter");
    expect(checks).toHaveBeenCalledOnce();
    // Help is out, so the band is folded and Sprawdź stays quiet until a marked part changes.
    pole(1).focus();
    const check = screen.getByRole("button", { name: copy("pl", "check") });
    expect(check.getAttribute("aria-disabled")).toBe("true");
    expect(must(check.closest(".kid-tooltip")).textContent).toContain("Popraw zaznaczone miejsce.");
    fireEvent.pointerDown(check);
    expect(checks).toHaveBeenCalledOnce();
    expect(focused()).toBe("Pole 3");
    expect(selection()).toEqual([0, 2]);
    restore();
  });

  it('tells the phone keyboard "next" until the last empty field, then "go"', () => {
    render(<Demo demo="fields" onCheck={vi.fn()} />);
    expect(pole(1).getAttribute("enterkeyhint")).toBe("next");
    type("24");
    key("Tab");
    type("28");
    expect(pole(3).getAttribute("enterkeyhint")).toBe("go");
    expect(pole(1).getAttribute("enterkeyhint")).toBe("next");
  });
});

describe("the keyboard demo with one-digit slots (§3.4, §3.5)", () => {
  it("a filled slot jumps to the next empty slot, wrapping, and stays when none is empty", () => {
    const checks = vi.fn();
    render(<Demo demo="slots" onCheck={checks} />);
    key("Tab");
    type("3");
    expect(focused()).toBe("Pole 3");
    type("2");
    expect(focused()).toBe("Pole 1");
    type("8");
    expect(focused()).toBe("Pole 1");
    // A new digit replaces the slot's digit; filling the last slot never checks.
    type("89");
    expect(pole(1).value).toBe("9");
    expect(checks).not.toHaveBeenCalled();
  });

  it("Backspace in an empty slot goes back to the previous slot and clears it; ← → always move in slots", () => {
    render(<Demo demo="slots" onCheck={vi.fn()} />);
    type("8");
    type("3");
    expect(focused()).toBe("Pole 3");
    key("Backspace");
    expect(focused()).toBe("Pole 2");
    expect(pole(2).value).toBe("");
    // Backspace in the first slot has nowhere to go.
    pole(1).focus();
    key("Backspace");
    expect(focused()).toBe("Pole 1");
    key("ArrowRight");
    expect(focused()).toBe("Pole 2");
    key("ArrowLeft");
    key("ArrowLeft");
    expect(focused()).toBe("Pole 1");
  });

  it("after a miss a slot does not jump until a marked slot is edited, and Enter in the last slot checks once one is", () => {
    const checks = vi.fn();
    render(<Demo demo="slots" onCheck={checks} />);
    type("8");
    type("3");
    type("1");
    key("Enter");
    expect(checks).toHaveBeenCalledOnce();
    expect(focused()).toBe("Pole 3");
    expect(selection()).toEqual([0, 1]);
    // An unmarked slot edited while the miss stands: no jump, the band stays.
    pole(1).focus();
    type("8");
    expect(focused()).toBe("Pole 1");
    expect(band()).toBe("miss");
    pole(3).focus();
    type("2");
    expect(band()).toBe("none");
    expect(focused()).toBe("Pole 3");
    key("Enter");
    expect(checks).toHaveBeenCalledTimes(2);
    expect(band()).toBe("right");
  });
});

// Step life (paper-behaviour README §3.2, §3.6 and §4; dl-uukj.29.62).
describe("the step ends, help comes, and the live region", () => {
  const typed = (value: string, marked = false) => ({
    answer: (
      <input
        aria-label="answer"
        data-field="a"
        data-tone={marked ? "amber" : "idle"}
        defaultValue={value}
      />
    ),
    keys: keysOf([field("a", value, { marked })]),
  });

  it("moves the focus to Dalej when the step is right, and when it shows the solution", () => {
    const { rerender } = render(shell({ ...typed("12") }));
    expect(document.activeElement?.getAttribute("aria-label")).toBe("answer");
    rerender(
      shell({ ...typed("12"), feedback: { kind: "praise", index: 0 }, next: { press: press() } }),
    );
    expect(document.activeElement?.hasAttribute("data-next")).toBe(true);
    cleanup();
    const { rerender: again } = render(shell({ ...typed("3") }));
    again(
      shell({
        ...typed("3"),
        action: null,
        feedback: { kind: "moved_on", index: 0 },
        next: { press: press() },
      }),
    );
    expect(document.activeElement?.hasAttribute("data-next")).toBe(true);
  });

  it("keeps the focus on Więcej pomocy, and after the last rung gives it to the first empty field", () => {
    const fields = (
      <>
        <input aria-label="hours" data-field="h" defaultValue="4" />
        <input aria-label="minutes" data-field="m" />
      </>
    );
    const keys = keysOf([field("h", "4"), field("m", "")]);
    const at = (n: number) =>
      shell({
        answer: fields,
        keys,
        action: { ready: false, press: press() },
        ladder: { help: released(n), ask: n < 3 ? ask() : null, refused: false },
      });
    const { rerender } = render(at(2));
    const more = screen.getByRole("button", { name: en("help_more") });
    more.focus();
    rerender(at(2));
    expect(document.activeElement).toBe(more);
    rerender(at(3));
    expect(screen.queryByRole("button", { name: en("help_more") })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "minutes" }));
  });

  it("after a miss the last rung gives the focus to the first marked field, its text selected", () => {
    const at = (n: number) =>
      shell({
        ...typed("13", true),
        feedback: miss,
        ladder: { help: released(n), ask: n < 3 ? ask() : null, refused: false },
      });
    const { rerender } = render(at(2));
    screen.getByRole("button", { name: en("help_more") }).focus();
    rerender(at(3));
    const answer = screen.getByRole("textbox", { name: "answer" }) as HTMLInputElement;
    expect(document.activeElement).toBe(answer);
    expect([answer.selectionStart, answer.selectionEnd]).toEqual([0, 2]);
  });

  it("has one polite live region, which reads the band and then each new rung", () => {
    const at = (n: number) =>
      shell({
        ...typed("13", true),
        feedback: miss,
        ladder: { help: n === 0 ? null : released(n), ask: ask(), refused: false },
      });
    const { container, rerender } = render(at(0));
    expect(container.querySelectorAll("[aria-live]").length).toBe(1);
    expect(must(container.querySelector("[data-announce]")).textContent).toBe(
      `${en("ds_miss_short")} ${en("ds_miss_fix")}`,
    );
    rerender(at(1));
    expect(must(container.querySelector("[data-announce]")).textContent).toBe("Count the rows.");
    rerender(at(2));
    expect(must(container.querySelector("[data-announce]")).textContent).toBe("Now the columns.");
    expect(container.querySelectorAll("[aria-live]").length).toBe(1);
  });
});

describe("the solution comes into view (§3.7)", () => {
  it("scrolls to the solution’s first line when it marks one, else to the solution", async () => {
    const scroll = await import("./scroll.ts");
    // A tap left down by an earlier test would hold the scroll until it lifts (scroll.ts afterRelease).
    fireEvent.pointerUp(document.body);
    const show = vi.spyOn(scroll, "scrollToShow");
    const lesson = (answer: JSX.Element, feedback: Feedback | null) => (
      <div data-learner-view>
        {shell({ answer, action: null, feedback, next: feedback ? { press: press() } : null })}
      </div>
    );
    const lined = (
      <div data-solution>
        <p data-solution-line>first</p>
        <p>second</p>
      </div>
    );
    const { rerender } = render(lesson(lined, null));
    rerender(lesson(lined, { kind: "moved_on", index: 0 }));
    expect(show).toHaveBeenLastCalledWith(screen.getByText("first"));
    cleanup();
    const box = <div data-solution>12</div>;
    const again = render(lesson(box, null));
    again.rerender(lesson(box, { kind: "moved_on", index: 0 }));
    expect(show).toHaveBeenLastCalledWith(screen.getByText("12"));
    show.mockRestore();
  });
});

// Phone spelling (lesson-frame README rule 18, paper-behaviour §3.5; dl-uukj.29.51).
describe("a word on a touch phone", () => {
  const word = (marked: boolean) => ({
    answer: (
      <input
        aria-label="answer"
        data-field="a"
        data-tone={marked ? "amber" : "idle"}
        defaultValue="kot"
      />
    ),
    keys: keysOf([field("a", "kot", { marked, word: true, maxLength: 12 })]),
  });

  it("closes the keyboard on a miss so the band is seen, and a tap opens it again with the word selected", () => {
    const { container, rerender } = render(<div data-input-touch>{shell({ ...word(false) })}</div>);
    const answer = screen.getByRole("textbox", { name: "answer" }) as HTMLInputElement;
    expect(document.activeElement).toBe(answer);
    rerender(<div data-input-touch>{shell({ ...word(true), feedback: miss })}</div>);
    expect(document.activeElement).not.toBe(answer);
    expect(bar(container).getAttribute("data-band")).toBe("miss");
    fireEvent.pointerDown(answer);
    answer.focus();
    answer.setSelectionRange(1, 1);
    fireEvent.click(answer);
    expect([answer.selectionStart, answer.selectionEnd]).toEqual([0, 3]);
  });

  it("keeps the focus and the selection in the field with a real keyboard and pointer", () => {
    const { rerender } = render(shell({ ...word(false) }));
    rerender(shell({ ...word(true), feedback: miss }));
    const answer = screen.getByRole("textbox", { name: "answer" }) as HTMLInputElement;
    expect(document.activeElement).toBe(answer);
    expect([answer.selectionStart, answer.selectionEnd]).toEqual([0, 3]);
  });

  it("rides the docked tools on the system keyboard while it is up", () => {
    const viewport = Object.assign(new EventTarget(), { height: 844, offsetTop: 0, width: 390 });
    const was = Object.getOwnPropertyDescriptor(window, "visualViewport");
    Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
    const { container } = render(
      <div data-input-touch data-learner-view>
        {shell({ ...word(false), progress: { done: 0, total: 3 } })}
      </div>,
    );
    const step = must(container.querySelector("[data-step-shell]"));
    expect(step.hasAttribute("data-keyboard")).toBe(false);
    act(() => {
      viewport.height = 844 - 300;
      viewport.dispatchEvent(new Event("resize"));
    });
    expect(step.hasAttribute("data-keyboard")).toBe(true);
    expect(document.documentElement.style.getPropertyValue("--kid-keyboard")).toBe(
      `${window.innerHeight - 544}px`,
    );
    if (was) Object.defineProperty(window, "visualViewport", was);
    else delete (window as { visualViewport?: unknown }).visualViewport;
  });
});

// Choose addendum 1.1 and 1.1.1 (decision dl-n501, owner 2026-10-26; dl-uukj.29.83).
describe("on a phone in a lesson the answer sits in the page", () => {
  const keypad = (
    <>
      <input aria-label="answer" data-field="a" />
      <Tools kind="keypad">
        <div data-keypad>keys</div>
      </Tools>
    </>
  );
  const lesson = (props: Partial<StepShellProps> = {}) => (
    <div data-learner-view>
      {shell({
        answer: keypad,
        keys: keysOf([field("a", "")]),
        progress: { done: 0, total: 3 },
        ...props,
      })}
    </div>
  );

  it("keeps the fields in the page and docks only the keypad above the footer", () => {
    const { container } = render(lesson());
    const answer = must(container.querySelector<HTMLElement>('[data-area="answer"]'));
    const dock = must(container.querySelector<HTMLElement>("[data-tools-dock]"));
    expect(answer.hasAttribute("data-docked")).toBe(false);
    expect(answer.contains(screen.getByRole("textbox", { name: "answer" }))).toBe(true);
    expect(dock.hidden).toBe(false);
    expect(dock.querySelector("[data-keypad]")).not.toBeNull();
    expect(answer.querySelector("[data-keypad]")).toBeNull();
    // The fold arrow is the dock's, not the answer's.
    expect(must(dock.querySelector("[data-fold]")).getAttribute("aria-expanded")).toBe("true");
    expect(answer.querySelector("[data-fold]")).toBeNull();
  });

  it("folds the docked keypad when help opens, keeping it mounted, and a tap on a field brings it back", () => {
    const { container, rerender } = render(lesson());
    rerender(lesson({ ladder: { help: released(1), ask: ask(), refused: false } }));
    const dock = must(container.querySelector<HTMLElement>("[data-tools-dock]"));
    const slot = must(dock.querySelector<HTMLElement>("[data-tools-slot]"));
    expect(slot.hidden).toBe(true);
    expect(dock.querySelector("[data-keypad]")).not.toBeNull();
    // Folded, the square fold arrow stays on the dock line, pointing up (Enter addendum section 5).
    expect(dock.hidden).toBe(false);
    expect(dock.hasAttribute("data-folded")).toBe(true);
    expect(must(dock.querySelector("[data-fold]")).getAttribute("aria-expanded")).toBe("false");
    fireEvent.pointerDown(screen.getByRole("textbox", { name: "answer" }));
    expect(slot.hidden).toBe(false);
    expect(dock.hasAttribute("data-folded")).toBe(false);
  });

  // dl-uukj.29.140: at 360x640 and 390x844 the note opened under the keypad. The bulb that opened it
  // went with the focus on it, the focus went back to the field, and that unfolded the dock.
  it("keeps the keypad folded when help opens and the focus goes back to the field from the bulb", () => {
    const miss = { feedback: { kind: "try_again", index: 0 } } as const;
    const { container, rerender } = render(
      lesson({ ...miss, ladder: { help: null, ask: ask(), refused: false } }),
    );
    const bulb = must(container.querySelector<HTMLElement>("[data-bulb]"));
    bulb.focus();
    rerender(lesson({ ...miss, ladder: { help: released(1), ask: ask(), refused: false } }));
    const dock = must(container.querySelector<HTMLElement>("[data-tools-dock]"));
    expect(bulb.isConnected && document.activeElement === bulb).toBe(false);
    expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "answer" }));
    expect(dock.hasAttribute("data-folded")).toBe(true);
    // The child's own tap on the field still brings the keypad back.
    fireEvent.pointerDown(screen.getByRole("textbox", { name: "answer" }));
    expect(dock.hasAttribute("data-folded")).toBe(false);
  });

  it("a tap on the folded arrow opens the keypad again, and the dock goes once the step ends", () => {
    const { container, rerender } = render(lesson());
    rerender(lesson({ ladder: { help: released(1), ask: ask(), refused: false } }));
    const dock = must(container.querySelector<HTMLElement>("[data-tools-dock]"));
    expect(must(dock.querySelector<HTMLElement>("[data-tools-slot]")).hidden).toBe(true);
    fireEvent.click(must(dock.querySelector("[data-fold]")));
    expect(must(dock.querySelector<HTMLElement>("[data-tools-slot]")).hidden).toBe(false);
    rerender(lesson({ feedback: { kind: "praise", index: 0 } }));
    expect(must(container.querySelector<HTMLElement>("[data-tools-dock]")).hidden).toBe(true);
  });

  // dl-uukj.29.111: at 390 × 844 the fraction nudge line landed under the fold arrow's top half.
  it("keeps a line above the dock clear of the fold arrow that stands over the dock line", async () => {
    const { insetsOf } = await import("./scroll.ts");
    const { container } = render(lesson());
    const dock = must(container.querySelector<HTMLElement>("[data-tools-dock]"));
    Object.defineProperty(
      must(container.querySelector<HTMLElement>("[data-bar]")),
      "offsetHeight",
      {
        value: 96,
      },
    );
    Object.defineProperty(dock, "offsetHeight", { value: 362 });
    Object.defineProperty(must(dock.querySelector<HTMLElement>("[data-fold]")), "offsetHeight", {
      value: 56,
    });
    // Anything in the page stops 16 above the arrow's top: the footer, the dock and its 28 above the line.
    expect(insetsOf(screen.getByRole("textbox", { name: "answer" })).bottom).toBe(
      96 + 362 + 28 + 16,
    );
    // A key in the dock only clears the footer.
    expect(insetsOf(must(dock.querySelector("[data-keypad]"))).bottom).toBe(96 + 16);
  });

  it("hides the dock on a step without tools, and draws none outside a lesson", () => {
    const options = render(
      <div data-learner-view>{shell({ progress: { done: 0, total: 3 } })}</div>,
    );
    expect(must(options.container.querySelector<HTMLElement>("[data-tools-dock]")).hidden).toBe(
      true,
    );
    cleanup();
    const alone = render(shell({ answer: keypad, keys: keysOf([field("a", "")]) }));
    expect(alone.container.querySelector("[data-tools-dock]")).toBeNull();
    const answer = must(alone.container.querySelector<HTMLElement>('[data-area="answer"]'));
    expect(answer.querySelector("[data-keypad]")).not.toBeNull();
    expect(answer.querySelector("[data-fold]")).not.toBeNull();
  });
});

describe("a step opens with its first field in view (§3.4, §3.6)", () => {
  it("jumps the least that lifts a first field off the footer, and leaves one in view alone", () => {
    const to = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    const rect = vi
      .spyOn(HTMLInputElement.prototype, "getBoundingClientRect")
      .mockReturnValue({ top: 830, bottom: 880 } as DOMRect);
    render(
      <div data-learner-view>
        {shell({
          answer: <input aria-label="hours" data-field="h" />,
          keys: keysOf([field("h", "")]),
          progress: { done: 0, total: 3 },
        })}
      </div>,
    );
    // The open resets to the top, then lifts the field 16 px clear of the window's bottom.
    expect(to).toHaveBeenLastCalledWith({
      top: window.scrollY + (880 - (window.innerHeight - 16)),
    });
    cleanup();
    to.mockClear();
    rect.mockReturnValue({ top: 300, bottom: 360 } as DOMRect);
    render(
      <div data-learner-view>
        {shell({
          answer: <input aria-label="hours" data-field="h" />,
          keys: keysOf([field("h", "")]),
          progress: { done: 0, total: 3 },
        })}
      </div>,
    );
    expect(to).toHaveBeenLastCalledWith({ top: 0 });
    to.mockRestore();
    rect.mockRestore();
  });

  // dl-uukj.29.116, measured at 390x844 on groups-as-product: top bar 56, footer 96, keypad dock
  // 426 and its 56 px fold arrow, half of it counted over the dock line (scroll.ts insetsOf), so
  // the room for the page runs from 72 (56 + 16) to 278 (844 - 96 - 426 - 28 - 16). The
  // instruction starts at 76 and the field ends at 357: 281 px that do not fit in 206. It opened at scroll 79 before (field clear,
  // the instruction at -3 to 46 under the top bar). It now opens at 4, the instruction 16 px under
  // the bar (72-121, field 289-353), and the first key lifts the field to 214-278 (scroll 79).
  const heights: [string, number][] = [
    ["[data-topbar]", 56],
    ["[data-bar]", 96],
    ["[data-tools-dock]", 426],
    ["[data-fold]", 56],
  ];
  function openOn(
    instruction: { top: number; bottom: number },
    input: { top: number; bottom: number },
  ) {
    // No finger left down by an earlier test: a scroll waits for it to lift (scroll.ts).
    fireEvent.pointerUp(document.body);
    const was = [window.innerWidth, window.innerHeight];
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    const to = vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    // Reduced motion: every scroll lands at once, so the test reads where it ends.
    const reduce = vi.spyOn(window, "matchMedia").mockImplementation(
      (q: string) =>
        ({
          matches: q.includes("reduce"),
          media: q,
          addEventListener() {},
          removeEventListener() {},
        }) as unknown as MediaQueryList,
    );
    const tall = vi
      .spyOn(HTMLElement.prototype, "offsetHeight", "get")
      .mockImplementation(function (this: HTMLElement) {
        return heights.find(([s]) => this.matches(s))?.[1] ?? 0;
      });
    const rects = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        return (
          this.matches("[data-instruction]")
            ? instruction
            : this.matches("input")
              ? input
              : { top: 0, bottom: 0 }
        ) as DOMRect;
      });
    const step = (value: string) => (
      <div data-learner-view>
        {shell({
          stem: <div data-instruction>Write a multiplication.</div>,
          answer: (
            <>
              <input aria-label="answer" data-field="a" value={value} readOnly />
              <Tools kind="keypad">
                <div data-keypad>keys</div>
              </Tools>
            </>
          ),
          keys: keysOf([field("a", value)]),
          progress: { done: 0, total: 3 },
        })}
      </div>
    );
    // The dock shows once its keypad has mounted, after the first field took the focus; the
    // stage's resize observer shows the step again then, as a browser's does.
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(private readonly seen: () => void) {}
        observe(): void {
          setTimeout(this.seen, 0);
        }
        disconnect(): void {}
      },
    );
    const { rerender } = render(step(""));
    const restore = (): void => {
      to.mockRestore();
      reduce.mockRestore();
      tall.mockRestore();
      rects.mockRestore();
      vi.unstubAllGlobals();
      Object.defineProperty(window, "innerWidth", { configurable: true, value: was[0] });
      Object.defineProperty(window, "innerHeight", { configurable: true, value: was[1] });
    };
    return { to, restore, type: (value: string) => rerender(step(value)) };
  }

  const settle = () => act(() => new Promise((done) => setTimeout(done, 10)));

  it("opens with the instruction, the card and the field all in view when they fit between the top bar and the fold arrow", async () => {
    // The field ends at 270, above 278: the step stays at its top.
    let open = openOn({ top: 76, bottom: 125 }, { top: 206, bottom: 270 });
    await settle();
    expect(open.to).toHaveBeenLastCalledWith({ top: 0 });
    open.restore();
    cleanup();
    // The field ends at 300 and the instruction starts at 100: the least jump that clears the
    // field (22) leaves the instruction at 78, still in view.
    open = openOn({ top: 100, bottom: 149 }, { top: 236, bottom: 300 });
    await settle();
    expect(open.to).toHaveBeenLastCalledWith({ top: 22 });
    open.restore();
  });

  it("opens a step too tall for the room on its field above the dock, the instruction scrolled off (Slots addendum 2.5)", async () => {
    const open = openOn({ top: 76, bottom: 125 }, { top: 293, bottom: 357 });
    await settle();
    // 76 to 357 does not fit in 72 to 278, so the field wins: 357 - 278 = 79.
    expect(open.to).toHaveBeenLastCalledWith({ top: 79 });
    open.to.mockClear();
    open.type("3");
    // The window is not really scrolled in the test, so the field is where it opened: 79 down.
    expect(open.to).toHaveBeenLastCalledWith({ top: 79 });
    open.restore();
  });
});
