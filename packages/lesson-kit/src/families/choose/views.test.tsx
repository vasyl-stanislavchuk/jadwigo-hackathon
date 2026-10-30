/**
 * Choose with pictures and TeX as options (dl-w3.25): a picture option keeps its box from its
 * size, a row of pictures reads as one option, every option sits at the kid tap size, the letter
 * shortcuts still pick a picture, and after a miss only the distractors picked are marked (a miss
 * that is only a missed option marks the whole set). The real Khan items play the same way.
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

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-18T00:00:00.000Z" }) };
const miss = (parts?: { id: string; correct: boolean }[]): Feedback => ({
  kind: "try_again",
  index: 0,
  ...(parts ? { parts } : {}),
});
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

const line = (alt: string, to: number) => ({
  kind: "image" as const,
  image: `/media/khan/line-${to}.svg`,
  alt,
  width: 380,
  height: 80,
  labels: {
    range: [
      [0, 10],
      [0, 1],
    ] as [[number, number], [number, number]],
    items: [
      { content: String(to), coordinates: [10, 0.5] as [number, number], alignment: "below" },
    ],
  },
});

/** Pick one of three number lines: two with their size and labels, one as a bare picture. */
const lines: SpecOf<typeof Family.Choose> = {
  id: "s1",
  say: "Which number line shows 3 times 4?",
  question_type: QuestionType.Recognition,
  family: Family.Choose,
  data: {
    options: [
      { id: "o1", content: line("A number line from 0 to 12 with jumps of 4.", 12) },
      { id: "o2", content: line("A number line from 0 to 7 with jumps of 1.", 7) },
      {
        id: "o3",
        content: {
          kind: "image",
          image: "/media/khan/bare.png",
          alt: "A number line with no marks.",
        },
      },
    ],
    select: "one",
    layout: "list",
  },
  key: { correct: ["o1"] },
};

const horse = (n: number) => ({
  src: "/media/khan/horses.png",
  alt: `A group of ${n} horses.`,
  width: 70,
  height: 38,
});

/** Pick every option that shows 6: a TeX sum, a row of pictures, a TeX product and a picture. */
const many: SpecOf<typeof Family.Choose> = {
  ...lines,
  question_type: QuestionType.MultiSelect,
  say: "Which show 6?",
  data: {
    options: [
      { id: "o1", content: { kind: "text", text: "$3 + 3$" } },
      { id: "o2", content: { kind: "pictures", pictures: [horse(2), horse(2), horse(2)] } },
      { id: "o3", content: { kind: "text", text: "$3 \\times 3$" } },
      {
        id: "o4",
        content: {
          kind: "image",
          image: "/media/khan/five.png",
          alt: "A group of five horses.",
          width: 90,
          height: 44,
        },
      },
    ],
    select: "many",
    layout: "list",
  },
  key: { correct: ["o1", "o2"] },
};

function draw(spec: SpecOf<typeof Family.Choose>, ladder: PageHelp | null = null) {
  const onCommit = vi.fn();
  const props = (
    feedback: Feedback | null,
    attemptNo: number,
    h: PageHelp | null,
  ): Record<string, unknown> => ({
    mode: ViewMode.Play,
    spec: pageSpec(spec),
    language: "en",
    category: "child",
    clock,
    live: true,
    attemptNo,
    feedback,
    onCommit,
    around: { checking: false, moveOn: null, ladder: { help: h, ask: null, refused: false } },
  });
  const tree = (feedback: Feedback | null, attemptNo: number, h: PageHelp | null) => (
    <StepFrame stepId="s1">
      <ChooseView
        {...(props(feedback, attemptNo, h) as unknown as ViewProps<typeof Family.Choose>)}
      />
    </StepFrame>
  );
  const out = render(tree(null, 1, ladder));
  const again = (feedback: Feedback | null, attemptNo = 2, h: PageHelp | null = ladder) =>
    act(() => out.rerender(tree(feedback, attemptNo, h)));
  return { onCommit, again };
}

/** Each option's element: the one carrying its tone, a checkbox or a radio's label. */
const options = () =>
  [...document.querySelectorAll<HTMLElement>("[data-tone]")].filter((el) =>
    el.closest('[role="radiogroup"],[role="group"]'),
  );
const check = () => fireEvent.click(screen.getByRole("button", { name: "Check" }), { detail: 0 });

describe("Choose: pictures as options", () => {
  it("reserves each sized picture’s box, overlays its labels, and draws a bare one as it comes", () => {
    draw(lines);
    const imgs = [...document.querySelectorAll<HTMLImageElement>('[role="radiogroup"] img')];
    expect(imgs.map((i) => i.alt)).toEqual([
      "A number line from 0 to 12 with jumps of 4.",
      "A number line from 0 to 7 with jumps of 1.",
      "A number line with no marks.",
    ]);
    expect(
      imgs.slice(0, 2).map((i) => [i.getAttribute("width"), i.getAttribute("height")]),
    ).toEqual([
      ["380", "80"],
      ["380", "80"],
    ]);
    expect(
      imgs.slice(0, 2).every((i) => (i.parentElement as HTMLElement).style.width === "380px"),
    ).toBe(true);
    expect(must(imgs[2]).getAttribute("width")).toBeNull();
    expect(must(options()[0]).textContent).toContain("12");
  });

  it("every option, picture or TeX, sits at the kid tap size", () => {
    draw(many);
    for (const el of options()) expect(el.className).toContain("min-h-[var(--kid-tap-min)]");
    expect(document.querySelectorAll('[role="group"] [data-tex]').length).toBe(2);
  });

  it("a radio with pictures is picked by tap and by its number key, never a letter, then Check commits it", () => {
    const { onCommit } = draw(lines);
    const radios = screen.getAllByRole("radio") as HTMLInputElement[];
    expect(radios).toHaveLength(3);
    must(radios[0]).focus();
    // A to E are not keys on screen (Choose addendum 2.2): 1 to 4 are.
    fireEvent.keyDown(must(radios[0]), { key: "b" });
    expect(radios.some((r) => r.checked)).toBe(false);
    fireEvent.keyDown(must(radios[0]), { key: "2" });
    expect(must(radios[1]).checked).toBe(true);
    fireEvent.pointerDown(must(options()[0]), { button: 0 });
    expect(must(radios[0]).checked).toBe(true);
    check();
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ chosen: ["o1"] });
  });

  it("a row of pictures is one checkbox named by its pictures’ words", () => {
    const { onCommit } = draw(many);
    const row = screen.getByRole("checkbox", { name: /2 horses.*2 horses.*2 horses/ });
    expect(row.querySelectorAll("img")).toHaveLength(3);
    fireEvent.click(row, { detail: 0 });
    // A TeX option has no accessible name yet: KaTeX's HTML output is aria-hidden (a
    // finding for the rich text lane), so the sum is reached by its place.
    fireEvent.click(must(screen.getAllByRole("checkbox")[0]), { detail: 0 });
    check();
    expect(must(onCommit.mock.calls[0])[0].value).toEqual({ chosen: ["o2", "o1"] });
  });

  it("after a miss only the distractors picked are marked; a missed option alone marks the whole set", () => {
    const { again } = draw(many);
    const sum = must(screen.getAllByRole("checkbox")[0]);
    fireEvent.click(sum, { detail: 0 });
    fireEvent.click(screen.getByRole("checkbox", { name: /five horses/ }), { detail: 0 });
    again(miss([{ id: "o4", correct: false }]));
    expect(screen.getByRole("checkbox", { name: /five horses/ }).dataset["tone"]).toBe("try_again");
    expect(sum.dataset["tone"]).toBe("idle");
    expect(screen.getByText("tried")).toBeTruthy();
    expect(
      document.querySelector('[data-area="answer"] > [data-whole]')?.getAttribute("data-whole"),
    ).toBe("idle");
    again(miss(), 3);
    expect(
      document.querySelector('[data-area="answer"] > [data-whole]')?.getAttribute("data-whole"),
    ).toBe("try_again");
    expect(options().every((el) => el.dataset["tone"] === "idle")).toBe(true);
  });

  it("Check with nothing picked commits nothing and goes to the first option (paper-behaviour §3.3)", () => {
    const { onCommit } = draw(many);
    check();
    expect(onCommit).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getAllByRole("checkbox")[0]);
  });

  it("rung 2 greys a picture option it took away, in its place", () => {
    const { again } = draw(lines);
    const before = options().map((el) => el.textContent);
    again(null, 1, help({ rung: 2, given: { removed: ["o2"] } }));
    expect(options().map((el) => el.textContent)).toEqual(before);
    expect(must(options()[1]).dataset["helpRemoved"]).toBe("true");
    expect(must(options()[1]).className).toContain("bg-muted");
    expect(must(options()[1]).querySelector("img")?.alt).toBe(
      "A number line from 0 to 7 with jumps of 1.",
    );
  });

  it("the solution view shows the right picture beside the pick, with no control left", () => {
    render(
      <ChooseView
        mode={ViewMode.Solution}
        spec={pageSpec(lines) as never}
        language="en"
        category="child"
        clock={clock}
        value={{ chosen: ["o2"] }}
        solution={{ chosen: ["o1"] }}
      />,
    );
    expect(screen.queryByRole("radio")).toBeNull();
    const items = [...document.querySelectorAll<HTMLElement>("li[data-tone]")];
    expect(items.map((el) => el.dataset["tone"])).toEqual(["green", "try_again", "idle"]);
    expect(must(items[0]).querySelector("img")?.getAttribute("width")).toBe("380");
    expect(screen.getByText("The answer")).toBeTruthy();
    expect(screen.getByText("Your answer")).toBeTruthy();
  });
});
