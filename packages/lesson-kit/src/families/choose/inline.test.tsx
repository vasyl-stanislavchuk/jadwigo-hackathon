/**
 * Mark the numbers (dl-w3.61.2): Choose with `layout: inline`. The text is drawn once, each number
 * a toggle button in its sentence; a pick changes background and border, never weight; a plain
 * word under `tokens: 'words'` is a toggle too; and validate holds the markers to the options.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { validate } from "../validate.ts";
import { ViewMode, type ViewProps } from "../view.ts";
import { ChooseView } from "./ChooseView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-19T00:00:00.000Z" }) };

const stickers: SpecOf<typeof Family.Choose> = {
  id: "m1",
  question_type: QuestionType.MarkNumbers,
  say: "Tap the numbers you need.",
  family: Family.Choose,
  data: {
    stem: {
      text: "Tom is {o1} years old. He bought {o2} packs of {o3} stickers. How many stickers?",
    },
    options: [8, 3, 6].map((n, i) => ({
      id: `o${i + 1}`,
      content: { kind: "number" as const, number: n },
    })),
    select: "many",
    layout: "inline",
  },
  key: { correct: ["o2", "o3"] },
};

describe("validate", () => {
  const rules = (s: SpecOf<typeof Family.Choose>) => validate(s).map((p) => p.rule);
  it("holds every option to a marker and every marker to an option", () => {
    expect(validate(stickers).filter((p) => p.level === "error")).toEqual([]);
    expect(
      rules({
        ...stickers,
        data: { ...stickers.data, stem: { text: "Tom is {o1}. {o2} packs, {o9}." } },
      }),
    ).toEqual(expect.arrayContaining(["option_not_marked", "unknown_marker"]));
    expect(rules({ ...stickers, data: { ...stickers.data, select: "one" } })).toContain(
      "inline_needs_many",
    );
    expect(rules({ ...stickers, key: { correct: ["o1", "o2", "o3"] } })).toContain(
      "nothing_to_leave_out",
    );
  });
});

describe("the inline view", () => {
  function draw(spec: SpecOf<typeof Family.Choose>) {
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
      around: { checking: false, moveOn: null, ladder: { help: null, ask: null, refused: false } },
    };
    render(
      <StepFrame stepId="m1">
        <ChooseView {...(props as unknown as ViewProps<typeof Family.Choose>)} />
      </StepFrame>,
    );
    return onCommit;
  }

  it("draws each number as a toggle in its sentence, and a pick changes colour, not size or weight", () => {
    const onCommit = draw(stickers);
    const three = screen.getByRole("button", { name: "3" });
    expect(three.getAttribute("aria-pressed")).toBe("false");
    expect(three.className).toMatch(/min-h-\[var\(--kid-tap-min\)\]/);
    const before = three.className;
    fireEvent.click(three, { detail: 0 });
    const after = screen.getByRole("button", { name: "3" });
    expect(after.getAttribute("aria-pressed")).toBe("true");
    const sizing = (c: string) =>
      c
        .split(/\s+/)
        .filter((x) => /^(font-|text-|p[xy]?-|m[xy]?-|min-|border-2$)/.test(x))
        .sort();
    expect(sizing(after.className)).toEqual(sizing(before));
    expect(screen.getByText(/years old/)).toBeTruthy();
    expect(document.body.textContent).not.toContain("{o");
    fireEvent.click(screen.getByRole("button", { name: "6" }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(onCommit).toHaveBeenCalledWith(
      expect.objectContaining({ value: { chosen: ["o2", "o3"] } }),
    );
  });

  it("with every word tappable, a word is a toggle too", () => {
    draw({ ...stickers, data: { ...stickers.data, tokens: "words" } });
    const tom = screen.getByRole("button", { name: "Tom" });
    expect(tom.dataset["token"]).toBe("w:1");
  });
});
