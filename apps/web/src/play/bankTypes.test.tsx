/**
 * Every question type the bank holds plays as a bank-drawn lesson step (dl-w3.84): a made-up body
 * of the bank's shape (bankBodies.ts) goes the way a drawn step goes to the child. The server
 * holds it as a family question, the wire carries its page half with its question type, the play
 * screen's specOf makes the spec and FamilyView draws it in play. Each type shows its own
 * behaviour, not only its family's, and a right and a wrong answer committed through the view grade
 * as such in judge(). Layout (where things sit, scroll, fold) is not checked here: happy-dom does
 * no layout, so a layout claim goes to apps/web/e2e.
 */

import { FamilyQuestion, PageAttemptQuestion } from "@jadwigo/contracts";
import { judge } from "@jadwigo/core";
import { browserClock, FamilyView, StepFrame, ViewMode } from "@jadwigo/lesson-kit";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { specOf } from "../review/Still.tsx";
import { BANK_BODIES, type BankBody } from "./bankBodies.ts";

beforeAll(() => {
  (
    window as unknown as {
      happyDOM: { setViewport(size: { width: number; height: number }): void };
    }
  ).happyDOM.setViewport({ width: 390, height: 844 });
});
afterEach(cleanup);

/** The step as the wire carries it to the play screen: the page's half, no key. */
function wired(body: BankBody): PageAttemptQuestion {
  return PageAttemptQuestion.parse({
    seq: 1,
    lesson_question_id: "lq_2h4m8gyw0fb1cvz2nkqw0px8fq",
    question_type: body.question_type,
    say: body.say,
    question: { family: body.family, data: body.data },
    added: "planned",
    placed: null,
    added_for: null,
    help_released: 0,
    help: [],
    tries: 0,
    ended: null,
    asked_at: "2026-11-02T10:00:00.000Z",
  });
}

/** Draw the step in play, seeded with `value`, as the play screen draws it. Returns what Check
 * commits. */
function play(body: BankBody, value?: unknown): { container: HTMLElement; check(): unknown } {
  const spec = specOf(wired(body));
  const committed: unknown[] = [];
  const { container } = render(
    <StepFrame stepId={spec.id}>
      <FamilyView
        mode={ViewMode.Play}
        spec={spec as never}
        language="pl"
        category="child"
        clock={browserClock}
        live
        attemptNo={1}
        feedback={null}
        onCommit={(c) => committed.push(c.value)}
        {...(value === undefined ? {} : { initialValue: value as never })}
      />
    </StepFrame>,
  );
  return {
    container,
    check() {
      const button = container.querySelector<HTMLElement>("[data-check]");
      if (button === null) throw new Error("no Check button");
      act(() => {
        fireEvent.click(button, { detail: 0 });
      });
      return committed.at(-1);
    },
  };
}

/** Move the first card of a sortable column one place down, from the keyboard. */
function moveFirstRowDown(root: HTMLElement): void {
  const card = root.querySelector<HTMLElement>("[data-sort-id] button[aria-pressed]");
  if (card === null) throw new Error("no card to move");
  act(() => {
    fireEvent.keyDown(card, { key: "ArrowDown" });
  });
}

const all = (root: HTMLElement, selector: string): Element[] => [
  ...root.querySelectorAll(selector),
];

/** What each type draws that its family alone would not: the type's own behaviour. */
const SHOWS: Record<string, (root: HTMLElement) => void> = {
  recognition(root) {
    expect(all(root, "[role=radiogroup]")).toHaveLength(1);
    expect(all(root, ".kid-choice-grid [data-option]")).toHaveLength(4);
  },
  lettered_choice(root) {
    // One pick from A to E in a list (addendum 2.2: a list on screen, lettered on paper), each
    // option carrying its letter, all 5 on the number keys, under the task's picture.
    expect(all(root, "[role=radiogroup]")).toHaveLength(1);
    expect(all(root, ".kid-choice-grid")).toHaveLength(0);
    expect(all(root, "[data-option]").map((o) => o.getAttribute("data-letter"))).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
    expect(all(root, "[data-key-badge]").map((b) => b.textContent)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
    expect(all(root, "[data-picture]")).not.toHaveLength(0);
  },
  multi_select(root) {
    expect(all(root, "[role=checkbox][data-option]")).toHaveLength(4);
    expect(all(root, "[role=radiogroup]")).toHaveLength(0);
  },
  fraction_compare(root) {
    expect(all(root, "[data-fraction]")).not.toHaveLength(0);
    expect(all(root, "[data-pick-slot]")).toHaveLength(1);
    expect(all(root, "[data-option]")).toHaveLength(3);
  },
  production(root) {
    expect(all(root, "[role=textbox]")).toHaveLength(1);
    expect(all(root, "[data-keypad]")).not.toHaveLength(0);
    expect(all(root, "[data-signs]")).toHaveLength(0);
  },
  expression(root) {
    expect(all(root, "[role=textbox]")).toHaveLength(1);
    expect(all(root, "[data-sign]").map((s) => s.getAttribute("data-sign"))).toContain("×");
  },
  fill_gaps(root) {
    expect(all(root, "[data-field]")).toHaveLength(1);
    expect(all(root, "[role=table]")).toHaveLength(0);
  },
  fill_table(root) {
    expect(all(root, "[role=table]")).toHaveLength(1);
    expect(all(root, "[role=columnheader]").map((h) => h.textContent)).toEqual(["a", "a + 1"]);
    expect(all(root, "[role=table] [data-field]")).toHaveLength(2);
  },
  label_picture(root) {
    expect(all(root, "[data-labelled]")).toHaveLength(1);
    expect(all(root, "[data-gap-at]")).toHaveLength(1);
    expect(all(root, "[data-menu]")).not.toHaveLength(0);
  },
  order(root) {
    expect(all(root, "[data-sort-id]")).toHaveLength(3);
    expect(all(root, "[data-beside]")).toHaveLength(0);
  },
  bucket(root) {
    // Zones to drop into, not a column beside the items.
    expect(all(root, "[data-drop-target]")).not.toHaveLength(0);
    expect(all(root, "[data-beside]")).toHaveLength(0);
  },
  match(root) {
    // Two columns: the right one reorders beside the left (group/model.ts layoutOf).
    expect(all(root, "[data-beside]")).not.toHaveLength(0);
    expect(all(root, "[data-drop-target]")).toHaveLength(0);
  },
  number_line_place(root) {
    expect(all(root, "[data-testid=number-line]")).toHaveLength(1);
    expect(all(root, "[role=slider]")).toHaveLength(1);
  },
  hotspot(root) {
    expect(all(root, "[data-testid=hotspot-picture]")).toHaveLength(1);
  },
  spatial_build(root) {
    expect(all(root, "[data-task-target]").map((t) => t.textContent)).toEqual(["2 × 3"]);
  },
  draw_graph(root) {
    expect(all(root, "[data-testid=bar-graph]")).toHaveLength(1);
    expect(all(root, "[role=slider]")).toHaveLength(2);
  },
};

describe("a bank-drawn step plays as its question type", () => {
  it("covers every type the bank holds, and only those", () => {
    expect(BANK_BODIES.map((b) => b.question_type).sort()).toEqual(Object.keys(SHOWS).sort());
  });

  for (const body of BANK_BODIES) {
    // The server's whole question, key included: the shape a bank body must meet to be drawn.
    const question = { ...FamilyQuestion.parse(body), question_type: body.question_type };

    it(`${body.question_type}: draws its own behaviour`, () => {
      const shows = SHOWS[body.question_type];
      if (shows === undefined) throw new Error(`no check for ${body.question_type}`);
      shows(play(body).container);
    });

    it(`${body.question_type}: a right answer committed through the view grades right`, () => {
      const step = play(body, body.byHand ? undefined : body.right);
      if (body.byHand) moveFirstRowDown(step.container);
      const value = step.check();
      expect(value).toEqual(body.right);
      expect(judge(question, value).correct).toBe(true);
    });

    it(`${body.question_type}: a wrong answer committed through the view grades wrong`, () => {
      const value = play(body, body.byHand ? undefined : body.wrong).check();
      expect(value).toEqual(body.wrong);
      expect(judge(question, value).correct).toBe(false);
    });
  }
});
