/**
 * The Explain view in play and in review (dl-w3.51.11): an empty field is incomplete, a short one
 * gets one ask for more and then commits as written, a miss marks each criterion as a dot with
 * none of the key's words, the dots clear on the first change, a miss with no marks turns the
 * field amber, and a parent's review lists the criteria with their marks.
 */

import { copy } from "@jadwigo/copy";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import type { Feedback } from "../../stage/types.ts";
import { Family, QuestionType } from "../names.ts";
import { pageSpec, type SpecOf } from "../types.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";
import { ExplainView } from "./ExplainView.tsx";
import { EXPLAIN_MIN_WORDS, isShort, wordCount } from "./model.ts";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-18T00:00:00.000Z" }) };
const common = { language: "en" as const, category: "child" as const, clock };
const spec: SpecOf<typeof Family.Explain> = {
  id: "x11",
  question_type: QuestionType.Explain,
  family: Family.Explain,
  say: "Why is 3 × 4 the same as 4 × 3?",
  data: { input: "text" },
  key: {
    criteria: [
      { id: "k1", text: "Says the product is the same.", cite: "CCSS 3.OA.B.5" },
      { id: "k2", text: "Gives a reason with an array or groups.", cite: "CCSS 3.OA.A.3" },
    ],
    criteria_version: "draft-2",
  },
};
const page = pageSpec(spec) as PageSpecOf<typeof Family.Explain>;
const miss = (parts?: { id: string; correct: boolean }[]): Feedback => ({
  kind: "try_again",
  index: 0,
  ...(parts ? { parts } : {}),
});

function play(onCommit = vi.fn()) {
  const props = (feedback: Feedback | null, attemptNo: number) =>
    ({
      ...common,
      mode: ViewMode.Play,
      spec: page,
      live: true,
      attemptNo,
      feedback,
      onCommit,
    }) as const;
  const out = render(
    <StepFrame stepId="x11">
      <ExplainView {...props(null, 1)} />
    </StepFrame>,
  );
  const again = (feedback: Feedback | null, attemptNo: number) =>
    out.rerender(
      <StepFrame stepId="x11">
        <ExplainView {...props(feedback, attemptNo)} />
      </StepFrame>,
    );
  const field = () => screen.getByLabelText(copy("en", "explain_field")) as HTMLTextAreaElement;
  const check = () => screen.getByText(copy("en", "check"));
  const status = () => screen.getByRole("status");
  return { ...out, again, field, check, status, onCommit };
}

describe("the soft minimum (model)", () => {
  it("counts words with a letter or a digit, so punctuation alone is nothing", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount(" . ")).toBe(0);
    expect(wordCount("Bo to te same kropki.")).toBe(5);
    expect(wordCount("3 + 3 + 3")).toBe(3);
  });

  it("is short under the step’s minimum or the default, never when empty", () => {
    expect(isShort({}, "")).toBe(false);
    expect(isShort({}, "Bo.")).toBe(true);
    expect(isShort({}, "one two three four")).toBe(EXPLAIN_MIN_WORDS > 4);
    expect(isShort({ min_words: 2 }, "one two")).toBe(false);
    expect(isShort({ min_words: 2 }, "one")).toBe(true);
  });
});

describe("Explain in play", () => {
  it("says an empty answer is missing and commits nothing", () => {
    const p = play();
    fireEvent.click(p.check());
    expect(p.status().dataset["status"]).toBe("incomplete");
    expect(p.status().textContent).toContain(copy("en", "incomplete_text"));
    expect(p.onCommit).not.toHaveBeenCalled();
  });

  it("asks once for a little more under the soft minimum, then commits the text as written", () => {
    const p = play();
    fireEvent.change(p.field(), { target: { value: "Bo." } });
    expect(p.check().getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(p.check());
    expect(p.status().dataset["status"]).toBe("incomplete");
    expect(p.status().textContent).toContain(copy("en", "explain_more"));
    expect(p.onCommit).not.toHaveBeenCalled();
    fireEvent.click(p.check());
    expect(p.onCommit).toHaveBeenCalledTimes(1);
    expect(must(p.onCommit.mock.calls[0])[0].value).toEqual({ text: "Bo." });
  });

  it("commits a full sentence at once, exactly as typed", () => {
    const p = play();
    fireEvent.change(p.field(), { target: { value: "  Bo to te same kropki, tylko obrócone.  " } });
    expect(p.check().getAttribute("aria-disabled")).toBe("false");
    fireEvent.click(p.check());
    expect(must(p.onCommit.mock.calls[0])[0].value).toEqual({
      text: "  Bo to te same kropki, tylko obrócone.  ",
    });
    expect(must(p.onCommit.mock.calls[0])[0].modality).toBe("keyboard");
  });

  it("after a miss, marks each criterion as a dot with none of its words, keeps the text, and clears the dots on a change", () => {
    const p = play();
    fireEvent.change(p.field(), { target: { value: "Bo wychodzi tyle samo." } });
    fireEvent.click(p.check());
    p.again(
      miss([
        { id: "k1", correct: true },
        { id: "k2", correct: false },
      ]),
      2,
    );
    expect(p.field().value).toBe("Bo wychodzi tyle samo.");
    expect(p.field().dataset["tone"]).toBe("idle");
    const dots = p.container.querySelectorAll("[data-pieces] [data-part]");
    expect([...dots].map((d) => (d as HTMLElement).dataset["tone"])).toEqual(["green", "amber"]);
    expect(p.container.textContent).not.toContain("Says the product");
    expect(p.container.textContent).not.toContain("CCSS");
    fireEvent.change(p.field(), { target: { value: "Bo wychodzi tyle samo. To te same kropki." } });
    expect(
      [...p.container.querySelectorAll("[data-pieces] [data-part]")].map(
        (d) => (d as HTMLElement).dataset["tone"],
      ),
    ).toEqual(["idle", "idle"]);
  });

  it("a miss that marked nothing turns the whole field amber until the first change", () => {
    const p = play();
    fireEvent.change(p.field(), { target: { value: "Bo wychodzi tyle samo." } });
    p.again(miss(), 2);
    expect(p.field().dataset["tone"]).toBe("amber");
    expect(p.container.querySelector("[data-pieces]")).toBeNull();
    fireEvent.change(p.field(), { target: { value: "Bo wychodzi tyle samo, bo" } });
    expect(p.field().dataset["tone"]).toBe("idle");
  });

  it("after praise the field is green", () => {
    const p = play();
    fireEvent.change(p.field(), { target: { value: "Bo to te same kropki." } });
    p.again({ kind: "praise", index: 0 }, 1);
    expect(p.field().dataset["tone"]).toBe("green");
  });
});

describe("Explain in the still modes", () => {
  it("a review shows the text as written and each criterion with its mark", () => {
    const { container } = render(
      <ExplainView
        {...common}
        mode={ViewMode.Review}
        spec={page}
        value={{ text: "Bo wychodzi tyle samo." }}
        answerKey={spec.key}
        verdict={{
          correct: false,
          mistake_class: "criterion_missed",
          parts: [
            { id: "k1", correct: true, mistake_class: null },
            { id: "k2", correct: false, mistake_class: "criterion_missed" },
          ],
        }}
      />,
    );
    expect(container.textContent).toContain("Bo wychodzi tyle samo.");
    const rows = [...container.querySelectorAll("[data-criteria] [data-part]")] as HTMLElement[];
    expect(rows.map((r) => r.dataset["tone"])).toEqual(["green", "amber"]);
    expect(container.textContent).toContain("Gives a reason with an array or groups.");
  });

  it("a preview shows the criteria only when asked", () => {
    const off = render(
      <ExplainView
        {...common}
        mode={ViewMode.Preview}
        spec={page}
        answerKey={spec.key}
        showKey={false}
      />,
    );
    expect(off.container.textContent).not.toContain("Says the product");
    off.unmount();
    const on = render(
      <ExplainView {...common} mode={ViewMode.Preview} spec={page} answerKey={spec.key} showKey />,
    );
    expect(on.container.textContent).toContain("Says the product");
  });
});
