/**
 * A stem's reference sheet (dl-w3.70.8): Khan's explanation in a question, folded behind its prompt.
 * The page draws it closed in play and open on paper, and validate refuses one that is empty or
 * holds the answer.
 */
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { must } from "../../parts/must.ts";
import type { Clock, Instant } from "../../stage/clock.ts";
import { StepFrame } from "../../stage/StepFrame.tsx";
import { EnterView } from "../enter/EnterView.tsx";
import { Family, QuestionType } from "../names.ts";
import { type FamilySpec, pageSpec } from "../types.ts";
import { validate } from "../validate.ts";
import { type PageSpecOf, ViewMode } from "../view.ts";

afterEach(cleanup);

const clock: Clock = { now: (): Instant => ({ perf: 1, wall: "2026-10-25T00:00:00.000Z" }) };
const SHEET = "Units | |\n- | -\n$1$ week $= 7$ days | $1$ day $= 24$ hours";

/** An invented step: weeks to days, with a units sheet folded under the task. */
function convert(accept: string, text = SHEET, prompt = "Reference sheet"): FamilySpec {
  return {
    id: "ref-1",
    say: "How many days are in three weeks?",
    question_type: QuestionType.Production,
    family: Family.Enter,
    data: {
      input: "number",
      entry: "keypad",
      stem: { text: "$3$ weeks $=$ ? days", reference: { prompt, text } },
    },
    key: { accept: [accept] },
  } as FamilySpec;
}

const rules = (spec: FamilySpec) =>
  validate(spec)
    .filter((p) => p.level === "error")
    .map((p) => p.rule);

describe("a stem reference", () => {
  it("is a closed fold-out in play, its prompt a button the keyboard opens", () => {
    const page = pageSpec(convert("21")) as PageSpecOf<typeof Family.Enter>;
    const { container } = render(
      <StepFrame stepId="ref-1">
        <EnterView
          mode={ViewMode.Play}
          spec={page}
          language="en"
          category="child"
          clock={clock}
          live
          attemptNo={1}
          feedback={null}
          solution={null}
          onCommit={() => {}}
        />
      </StepFrame>,
    );
    const details = must(container.querySelector<HTMLDetailsElement>("details[data-reference]"));
    expect(details).not.toBeNull();
    expect(details.open).toBe(false);
    expect(must(details.querySelector("summary")).textContent).toBe("Reference sheet");
    expect(details.querySelector("table")).not.toBeNull();
  });

  it("is drawn open on paper", () => {
    const page = pageSpec(convert("21")) as PageSpecOf<typeof Family.Enter>;
    const { container } = render(
      <EnterView
        mode={ViewMode.Print}
        spec={page}
        language="en"
        category="child"
        clock={{ now: () => ({ perf: 0, wall: "2026-10-25T00:00:00.000Z" }) }}
      />,
    );
    expect(must(container.querySelector<HTMLDetailsElement>("details[data-reference]")).open).toBe(
      true,
    );
  });

  it("validates when it has words and no answer, and is refused when it gives the answer or is empty", () => {
    expect(rules(convert("21"))).toEqual([]);
    expect(rules(convert("7"))).toContain("key_in_reference");
    // A thousands separator in TeX does not hide the key.
    expect(rules(convert("1000", "$1$ km $= 1{,}000$ m"))).toContain("key_in_reference");
    // A relation sign is on every row of a sheet and never counts as the answer (dl-w3.70.8).
    expect(rules(convert("="))).not.toContain("key_in_reference");
    expect(rules(convert("<", "$1$ cm $<$ $1$ m"))).not.toContain("key_in_reference");
    expect(rules(convert("21", SHEET, " "))).toContain("empty_label");
    expect(rules(convert("21", ""))).toContain("empty_label");
  });
});
