/**
 * The help ladder in the Choose view (families/help.ts): rung 1 outlines the options to look at,
 * rung 2 takes wrong ones away. A taken option stays in its place, settled and not pickable, and
 * is dropped from the picks, so nothing moves under the child's finger (docs/17 §2f rule 2).
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { PageHelp } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { ViewMode, type ViewProps } from "../view.ts";
import { ChooseView } from "./ChooseView.tsx";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-13T00:00:00.000Z" }) };
const help = (h: Partial<PageHelp>): PageHelp => ({
  rung: 1,
  card: null,
  focus: null,
  given: null,
  worked: null,
  twin: null,
  more: true,
  ...h,
});

const lettered: SpecOf<typeof Family.Choose> = {
  id: "s1",
  say: "Pick the product",
  question_type: QuestionType.LetteredChoice,
  family: Family.Choose,
  data: {
    options: [42, 48, 56, 54].map((n, i) => ({
      id: `o${i + 1}`,
      letter: "ABCD"[i],
      content: { kind: "number", number: n },
    })),
    select: "one",
    layout: "lettered",
  },
  key: { correct: ["o3"] },
};

const many: SpecOf<typeof Family.Choose> = {
  ...lettered,
  question_type: QuestionType.MultiSelect,
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

function draw(spec: SpecOf<typeof Family.Choose>, ladder: PageHelp | null, onCommit = vi.fn()) {
  const props = (h: PageHelp | null): Record<string, unknown> => ({
    mode: ViewMode.Play,
    spec: pageSpec(spec),
    language: "en",
    category: "child",
    clock,
    live: true,
    attemptNo: 1,
    feedback: null,
    onCommit,
    around: { checking: false, moveOn: null, ladder: { help: h, ask: null, refused: false } },
  });
  const out = render(
    <StepFrame stepId="s1">
      <ChooseView {...(props(ladder) as unknown as ViewProps<typeof Family.Choose>)} />
    </StepFrame>,
  );
  const again = (h: PageHelp | null) =>
    out.rerender(
      <StepFrame stepId="s1">
        <ChooseView {...(props(h) as unknown as ViewProps<typeof Family.Choose>)} />
      </StepFrame>,
    );
  return { again, onCommit };
}

/** Each option's element: the one carrying its tone, a checkbox or a radio's label. */
const options = () =>
  [...document.querySelectorAll<HTMLElement>("[data-tone]")].filter((el) =>
    el.closest('[role="radiogroup"],[role="group"]'),
  );
const option = (n: number) => must(options().find((el) => el.textContent?.includes(String(n))));
const order = () => options().map((el) => el.textContent);
const picked = (n: number) =>
  option(n).getAttribute("aria-checked") ??
  String(option(n).querySelector("input")?.checked ?? option(n).dataset["state"] === "checked");

describe("Choose: the help ladder", () => {
  it("outlines the focused options on rung 1, and only those", () => {
    draw(lettered, help({ focus: ["o2", "o3"] }));
    expect(option(48).dataset["helpFocus"]).toBe("true");
    expect(option(56).dataset["helpFocus"]).toBe("true");
    expect(option(42).dataset["helpFocus"]).toBeUndefined();
    expect(option(48).className).toContain("outline-dashed");
  });

  it("draws no ring when rung 1 would outline every option, so the card's words point instead (dl-w3.46.28)", () => {
    draw(lettered, help({ focus: ["o1", "o2", "o3", "o4"] }));
    for (const n of [42, 48, 56, 54]) {
      expect(option(n).dataset["helpFocus"]).toBeUndefined();
      expect(option(n).className).not.toContain("outline-dotted");
    }
  });

  it("keeps a removed option in its place, not pickable, and unpicks it", () => {
    const { again, onCommit } = draw(lettered, null);
    const before = order();
    fireEvent.click(option(42), { detail: 0 });
    expect(picked(42)).toBe("true");
    again(help({ rung: 2, given: { removed: ["o1"] } }));
    expect(order()).toEqual(before);
    expect(option(42).dataset["helpRemoved"]).toBe("true");
    expect(option(42).className).toContain("line-through");
    expect(picked(42)).toBe("false");
    fireEvent.click(option(42), { detail: 0 });
    expect(picked(42)).toBe("false");
    fireEvent.click(option(56), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ chosen: ["o3"] });
  });

  it("in a pick-all, a removed checkbox is aria-disabled and ignores a tap", () => {
    draw(many, help({ rung: 2, given: { removed: ["o2"] } }));
    expect(option(7).getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(option(7), { detail: 0 });
    expect(picked(7)).toBe("false");
    expect(order()).toHaveLength(3);
  });
});
