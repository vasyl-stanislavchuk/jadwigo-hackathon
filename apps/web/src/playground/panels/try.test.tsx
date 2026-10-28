/**
 * Try it judges nothing (owner, "scenarios to play + data lookup"):
 * - every scenario of every example, played from its button, shows its outcome, and its marks on a
 *   miss, in the real family view, with no answer reproduced;
 * - for every Choose, Enter and Slots example, the key's answer committed through the view shows
 *   right, and each written scenario's value committed through the view shows its outcome;
 * - a free answer is read from the authored data in order (scenarios, the key's accepted answer,
 *   the key's known wrong answers), exactly, and anything else is not judged.
 */

import type { Language } from "@jadwigo/copy";
import { type FamilySpec, LessonTheme, StepFrame, solutionOf } from "@jadwigo/lesson-kit";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { EXAMPLES, type WrittenExample } from "../examples/index.ts";
import { LANGUAGES, resolve } from "../localize.ts";
import { type Found, foundOf, lookUp, scenarioFor, scenariosIn, specOf } from "./question.ts";
import { TryExample } from "./TryExample.tsx";
import type { TryState } from "./tryState.ts";

// A step test is written for a phone window, 390 x 844: the lesson picks its frame from the window,
// and happy-dom opens at 1024 x 768.
beforeAll(() => {
  (
    window as unknown as {
      happyDOM: { setViewport(size: { width: number; height: number }): void };
    }
  ).happyDOM.setViewport({ width: 390, height: 844 });
});
afterEach(cleanup);

/** Draw `example`, played from a scenario or with an answer filled in, and return its state. */
function draw(
  example: WrittenExample,
  language: Language,
  options: { played?: { value: unknown; found: Found }; seed?: unknown },
): () => TryState {
  let last: TryState | null = null;
  const spec = specOf(example, language);
  render(
    <LessonTheme>
      <StepFrame stepId={spec.id}>
        <TryExample
          example={example}
          spec={spec}
          language={language}
          category="child"
          {...options}
          onState={(s) => {
            last = s;
          }}
        />
      </StepFrame>
    </LessonTheme>,
  );
  return () => {
    if (last === null) throw new Error("no state");
    return last;
  };
}

function check(): void {
  const button = document.querySelector<HTMLElement>("[data-check]");
  if (button === null) throw new Error("no Check button");
  act(() => {
    fireEvent.click(button, { detail: 0 });
  });
}

const band = (): string | null =>
  document.querySelector("[data-bar]")?.getAttribute("data-band") ?? null;

/** The state a found answer shows: praise and the right band, or try again with its marks. */
function expectShown(state: TryState, found: Pick<Found, "outcome" | "marks">): void {
  if (found.outcome === "correct") {
    expect(state.feedback?.kind).toBe("praise");
    expect(band()).toBe("right");
  } else {
    expect(state.feedback?.kind).toBe("try_again");
    expect(state.feedback?.parts ?? []).toEqual(found.marks);
    expect(band()).toBe("miss");
  }
}

const name = (e: WrittenExample): string => `${e.question.question_type}/${e.id}`;
const TYPED = EXAMPLES.filter((e) => ["choose", "enter", "slots"].includes(e.question.family));

describe("a scenario played from its button", () => {
  for (const example of EXAMPLES)
    for (const language of LANGUAGES)
      scenariosIn(example, language).forEach((scenario, i) => {
        it(`${name(example)} ${language} #${i + 1}: ${scenario.outcome}`, () => {
          const value = resolve(scenario.value, language);
          const state = draw(example, language, { played: { value, found: foundOf(scenario) } });
          expectShown(state(), scenario);
          expect(state().attempts.at(-1)?.found?.mistake_class).toBe(scenario.mistake_class);
        });
      });
});

describe("the key's answer committed through the view", () => {
  for (const example of TYPED)
    for (const language of LANGUAGES)
      it(`${name(example)} ${language}: right`, () => {
        const spec = specOf(example, language);
        const value = solutionOf(spec);
        // The key step alone names it right, via the key.
        expect(lookUp(null, spec, value, language)?.via).toBe("key");
        const state = draw(example, language, { seed: value });
        check();
        const found = state().attempts.at(-1)?.found;
        expect(found?.outcome).toBe("correct");
        // A scenario written with the same value comes first, as the lookup order says.
        expect(found?.via).toBe(
          scenarioFor(example, value, language) === null ? "key" : "scenario",
        );
        expectShown(state(), { outcome: "correct", marks: [] });
      });
});

/** Each known wrong answer a question's key names, as the value that commits it. */
function nearValues(spec: FamilySpec): { value: unknown; mistake_class: string }[] {
  if (spec.family === "enter")
    return Object.entries(spec.key.near ?? {}).map(([entered, mistake_class]) => ({
      value: { entered },
      mistake_class,
    }));
  if (spec.family === "choose")
    return Object.entries(spec.key.near ?? {}).map(([option, mistake_class]) => ({
      value: { chosen: [option] },
      mistake_class,
    }));
  return [];
}

describe("each known wrong answer in the key committed through the view", () => {
  for (const example of TYPED)
    for (const language of LANGUAGES) {
      const spec = specOf(example, language);
      for (const near of nearValues(spec))
        it(`${name(example)} ${language}: ${JSON.stringify(near.value)} is ${near.mistake_class}`, () => {
          // The near step alone names it, with its class and the whole question marked.
          expect(lookUp(null, spec, near.value, language)).toEqual({
            via: "near",
            outcome: "incorrect",
            mistake_class: near.mistake_class,
            marks: [],
          });
          const state = draw(example, language, { seed: near.value });
          check();
          const found = state().attempts.at(-1)?.found;
          // A scenario written with the same value comes first, as the lookup order says.
          const scenario = scenarioFor(example, near.value, language);
          if (scenario === null) {
            expect(found).toEqual({
              via: "near",
              outcome: "incorrect",
              mistake_class: near.mistake_class,
              marks: [],
            });
          } else {
            expect(found?.via).toBe("scenario");
            expect(found?.mistake_class).toBe(scenario.mistake_class);
          }
          expectShown(state(), found ?? { outcome: "incorrect", marks: [] });
        });
    }
});

describe("a written scenario's value committed through the view", () => {
  for (const example of TYPED)
    for (const language of LANGUAGES)
      scenariosIn(example, language).forEach((scenario, i) => {
        it(`${name(example)} ${language} #${i + 1}: ${scenario.outcome}`, () => {
          const state = draw(example, language, { seed: resolve(scenario.value, language) });
          check();
          const found = state().attempts.at(-1)?.found;
          expect(found?.via).toBe("scenario");
          expect(found?.outcome).toBe(scenario.outcome);
          expectShown(state(), scenario);
        });
      });
});

describe("a free answer read from the authored data", () => {
  const enter: FamilySpec = {
    id: "e",
    question_type: "production",
    say: "Seven times six?",
    family: "enter",
    data: { input: "number", entry: "keypad" },
    key: { accept: ["42", "42.0"], near: { "48": "neighbour_row" } },
  };
  const choose: FamilySpec = {
    id: "c",
    question_type: "recognition",
    say: "Pick it.",
    family: "choose",
    data: {
      options: [
        { id: "o1", content: { kind: "number", number: 42 } },
        { id: "o2", content: { kind: "number", number: 48 } },
        { id: "o3", content: { kind: "number", number: 13 } },
      ],
      select: "one",
      layout: "grid",
    },
    key: { correct: ["o1"], near: { o2: "neighbour_row" } },
  };
  const slots: FamilySpec = {
    id: "s",
    question_type: "fill_gaps",
    say: "Fill them in.",
    family: "slots",
    data: {
      template: "{a} and {b}",
      gaps: [
        { id: "a", kind: "enter", input: "text" },
        { id: "b", kind: "choose", options: [{ id: "x", label: "x" }] },
      ],
    },
    key: {
      gaps: {
        a: { kind: "enter", accept: ["mróz", "mrozy"] },
        b: { kind: "choose", correct: ["x"] },
      },
    },
  };
  const read = (spec: FamilySpec, value: unknown) => lookUp(null, spec, value, "pl");

  it("takes the key's accepted answers as right, whole and gap by gap", () => {
    expect(read(enter, { entered: "42" })?.via).toBe("key");
    expect(read(enter, { entered: "42.0" })?.outcome).toBe("correct");
    expect(read(choose, { chosen: ["o1"] })?.outcome).toBe("correct");
    expect(read(slots, { gaps: { a: "mrozy", b: "x" } })?.outcome).toBe("correct");
  });

  it("takes the key's known wrong answers as a miss of the whole question", () => {
    expect(read(enter, { entered: "48" })).toEqual({
      via: "near",
      outcome: "incorrect",
      mistake_class: "neighbour_row",
      marks: [],
    });
    expect(read(choose, { chosen: ["o2"] })?.mistake_class).toBe("neighbour_row");
  });

  it("reads nothing else: no tolerance, no maths, no folding", () => {
    for (const entered of ["42 ", "6×7", "41", "042"])
      expect(read(enter, { entered }), entered).toBeNull();
    expect(read(choose, { chosen: ["o3"] })).toBeNull();
    expect(read(slots, { gaps: { a: "mroz", b: "x" } })).toBeNull();
    expect(read(slots, { gaps: { a: "mróz" } })).toBeNull();
  });
});
