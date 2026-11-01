/**
 * The lesson's language on the question's own text (dl-uukj.38): with a Polish lesson on English
 * screens the stem and the answer carry lang="pl", while Check and the help bulb keep the page's
 * en; with no lesson language the frame adds no lang at all.
 */

import { copy } from "@jadwigo/copy";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StepFrame } from "../stage/StepFrame.tsx";
import type { Language } from "../stage/types.ts";
import { must } from "./must.ts";
import { StepShell } from "./StepShell.tsx";

const press = () => ({ onPointerDown: vi.fn(), onClick: () => undefined });

function step(lessonLanguage?: Language) {
  return (
    <StepFrame stepId="s1" {...(lessonLanguage === undefined ? {} : { lessonLanguage })}>
      <StepShell
        language="en"
        category="child"
        feedback={null}
        stem={<p data-prompt>Ile to jest 7 + 5?</p>}
        answer={<p data-choice>12</p>}
        action={{ ready: true, press: press() }}
        ladder={{ help: null, ask: { enabled: true, press: press() }, refused: false }}
      />
    </StepFrame>
  );
}

const langOf = (el: Element): string | null | undefined =>
  el.closest("[lang]")?.getAttribute("lang");

beforeEach(() => {
  document.documentElement.lang = "en";
});
afterEach(cleanup);

describe("the lesson's language", () => {
  it("is on the question's own text, and Check keeps the screens' lang", () => {
    const { container } = render(step("pl"));
    expect(langOf(must(container.querySelector("[data-prompt]")))).toBe("pl");
    expect(langOf(must(container.querySelector("[data-choice]")))).toBe("pl");
    const check = must(container.querySelector("[data-check]"));
    expect(check.textContent).toContain(copy("en", "check"));
    expect(langOf(check)).toBe("en");
    expect(langOf(must(container.querySelector("[data-bulb]")))).toBe("en");
  });

  it("adds no lang anywhere when the frame has none", () => {
    const { container } = render(step());
    expect(container.querySelector("[lang]")).toBeNull();
  });

  // dl-uukj.39: the hint and solution cards are the lesson's text; their headings and the help
  // note's buttons keep the page's lang.
  const hints = [{ text: "Policz rzędy." }, { text: "Teraz kolumny." }];
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
  function shellWith(props: Record<string, unknown>, lessonLanguage?: Language) {
    return render(
      <StepFrame stepId="s1" {...(lessonLanguage === undefined ? {} : { lessonLanguage })}>
        <StepShell
          language="en"
          category="child"
          feedback={null}
          stem={<p>7 × 6</p>}
          answer={<p>42</p>}
          action={{ ready: true, press: press() }}
          {...props}
        />
      </StepFrame>,
    );
  }

  it("puts the lesson's lang on each hint, and the page's on the note's head and buttons", () => {
    const { container } = shellWith(
      {
        moveOn: { enabled: true, press: press() },
        ladder: { help: released(1), ask: { enabled: true, press: press() }, refused: false },
      },
      "pl",
    );
    expect(langOf(must(container.querySelector("[data-hint]")))).toBe("pl");
    expect(langOf(must(container.querySelector("[data-help-head]")))).toBe("en");
    expect(langOf(must(container.querySelector("[data-help-more]")))).toBe("en");
    expect(langOf(must(container.querySelector("[data-dont-know]")))).toBe("en");
  });

  it("puts the lesson's lang on the boost's words and the solution's lines, not their heads", () => {
    const boost = shellWith({ hint: "Policz rzędy." }, "pl");
    expect(langOf(screen.getByText("Policz rzędy."))).toBe("pl");
    expect(langOf(must(boost.container.querySelector("[data-help-head]")))).toBe("en");
    cleanup();
    const solved = shellWith(
      {
        action: null,
        feedback: { kind: "moved_on", index: 0 },
        next: { press: press() },
        solutionLines: [{ text: "7 × 6 = 42" }],
        moveOn: { enabled: true, press: press() },
      },
      "pl",
    );
    expect(langOf(must(solved.container.querySelector("[data-solution-text]")))).toBe("pl");
    expect(langOf(must(solved.container.querySelector("[data-solution-card-head]")))).toBe("en");
  });

  it("adds no lang to the cards when the frame has none", () => {
    const { container } = shellWith({
      hint: "Policz rzędy.",
      solutionLines: [{ text: "7 × 6 = 42" }],
    });
    expect(container.querySelector("[lang]")).toBeNull();
  });
});
