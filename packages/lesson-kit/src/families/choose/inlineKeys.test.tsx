/**
 * Mark the numbers takes the option keys (paper-behaviour README §3.3, dl-uukj.29.63): the tokens in
 * the text follow the several-answer rules of keys.test.tsx. Space switches the focused token, the
 * arrows move the focus between tokens, Enter checks (with nothing marked it goes to the first token
 * and checks nothing), the focus comes back to the last token switched after a check, and after a
 * miss a change to a marked token fades its mark and folds the band. Invented items only.
 *
 * Space is the browser's: on a focused button it fires a click with detail 0, which is what these
 * tests send.
 */

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { Feedback, PageHelp } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { ViewMode, type ViewProps } from "../view.ts";
import { ChooseView } from "./ChooseView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-25T00:00:00.000Z" }) };
const miss = (parts?: { id: string; correct: boolean }[]): Feedback => ({
  kind: "try_again",
  index: 0,
  ...(parts ? { parts } : {}),
});

/** Tom has 4 boxes of 5 pens and 2 sisters. How many pens? */
const pens: SpecOf<typeof Family.Choose> = {
  id: "t1",
  question_type: QuestionType.MarkNumbers,
  say: "Tap the numbers you need.",
  family: Family.Choose,
  data: {
    stem: { text: "Tom has {o1} boxes of {o2} pens and {o3} sisters. How many pens?" },
    options: [4, 5, 2].map((n, i) => ({
      id: `o${i + 1}`,
      content: { kind: "number" as const, number: n },
    })),
    select: "many",
    layout: "inline",
  },
  key: { correct: ["o1", "o2"] },
};

function draw(spec: SpecOf<typeof Family.Choose>) {
  const onCommit = vi.fn();
  const tree = (feedback: Feedback | null, attemptNo: number, help: PageHelp | null) => (
    <StepFrame stepId="t1">
      <ChooseView
        {...({
          mode: ViewMode.Play,
          spec: pageSpec(spec),
          language: "en",
          category: "child",
          clock,
          live: true,
          attemptNo,
          feedback,
          onCommit,
          around: { checking: false, moveOn: null, ladder: { help, ask: null, refused: false } },
        } as unknown as ViewProps<typeof Family.Choose>)}
      />
    </StepFrame>
  );
  const out = render(tree(null, 1, null));
  const again = (feedback: Feedback | null, attemptNo = 2, help: PageHelp | null = null) =>
    act(() => out.rerender(tree(feedback, attemptNo, help)));
  return { onCommit, again };
}

const tokens = () => [...document.querySelectorAll<HTMLElement>("button[data-token]")];
const pressed = () =>
  tokens()
    .map((t) => (t.getAttribute("aria-pressed") === "true" ? 1 : 0))
    .join("");
const space = (el: HTMLElement) => fireEvent.click(el, { detail: 0 });
const band = () => must(document.querySelector("[data-step-shell]")).getAttribute("data-band");
const sprawdz = () => document.querySelector<HTMLElement>("[data-check]");

describe("mark the numbers: §3.3 keys", () => {
  it("Space switches the focused token on and off", () => {
    draw(pens);
    must(tokens()[1]).focus();
    space(must(tokens()[1]));
    expect(pressed()).toBe("010");
    space(must(tokens()[1]));
    expect(pressed()).toBe("000");
  });

  it("the arrows move the focus between tokens, wrapping, and switch nothing", () => {
    draw(pens);
    must(tokens()[0]).focus();
    fireEvent.keyDown(must(tokens()[0]), { key: "ArrowRight" });
    expect(document.activeElement).toBe(tokens()[1]);
    fireEvent.keyDown(must(tokens()[1]), { key: "ArrowDown" });
    expect(document.activeElement).toBe(tokens()[2]);
    fireEvent.keyDown(must(tokens()[2]), { key: "ArrowRight" });
    expect(document.activeElement).toBe(tokens()[0]);
    fireEvent.keyDown(must(tokens()[0]), { key: "ArrowLeft" });
    expect(document.activeElement).toBe(tokens()[2]);
    fireEvent.keyDown(must(tokens()[2]), { key: "ArrowUp" });
    expect(document.activeElement).toBe(tokens()[1]);
    expect(pressed()).toBe("000");
  });

  it("the arrows step over a token the help ladder took away", () => {
    const { again } = draw(pens);
    again(null, 1, {
      rung: 2,
      card: null,
      focus: null,
      given: { removed: ["o2"] },
      worked: null,
      twin: null,
      more: true,
    });
    must(tokens()[0]).focus();
    fireEvent.keyDown(must(tokens()[0]), { key: "ArrowRight" });
    expect(document.activeElement).toBe(tokens()[2]);
  });

  it("Enter checks and does not switch the token it is on", () => {
    const { onCommit } = draw(pens);
    space(must(tokens()[0]));
    space(must(tokens()[1]));
    must(tokens()[1]).focus();
    fireEvent.keyDown(must(tokens()[1]), { key: "Enter" });
    expect(pressed()).toBe("110");
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ chosen: ["o1", "o2"] });
  });

  it("Enter with nothing marked takes the focus to the first token and checks nothing", () => {
    const { onCommit } = draw(pens);
    must(tokens()[2]).focus();
    fireEvent.keyDown(must(tokens()[2]), { key: "Enter" });
    expect(onCommit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(tokens()[0]);
    expect(pressed()).toBe("000");
  });

  it("after a check the focus comes back to the token last switched, even after a click on Sprawdź", () => {
    const { onCommit, again } = draw(pens);
    space(must(tokens()[0]));
    space(must(tokens()[2]));
    must(sprawdz()).focus();
    fireEvent.pointerDown(must(sprawdz()), { button: 0 });
    expect(onCommit).toHaveBeenCalledTimes(1);
    again(miss([{ id: "o3", correct: false }]));
    expect(document.activeElement).toBe(tokens()[2]);
  });

  it("after a miss the mark and the band stay until a marked token changes; then the mark fades and the band folds", () => {
    const { again } = draw(pens);
    space(must(tokens()[0]));
    space(must(tokens()[2]));
    again(miss([{ id: "o3", correct: false }]));
    expect(must(tokens()[2]).dataset["tone"]).toBe("try_again");
    expect(band()).toBe("miss");
    fireEvent.keyDown(must(tokens()[2]), { key: "ArrowLeft" });
    expect(band()).toBe("miss");
    space(must(tokens()[2]));
    expect(must(tokens()[2]).dataset["tone"]).toBe("idle");
    expect(must(tokens()[2]).className).toContain("duration-jw-mark");
    expect(band()).toBe("none");
    expect(must(sprawdz()).getAttribute("aria-disabled")).not.toBe("true");
    expect(screen.queryByRole("status")?.textContent ?? "").toBe("");
  });
});
