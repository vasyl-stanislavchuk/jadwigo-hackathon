/**
 * The lesson's language on the question's own text (dl-uukj.38): with a Polish lesson on English
 * screens the stem and the answer carry lang="pl", while Check and the help bulb keep the page's
 * en; with no lesson language the frame adds no lang at all.
 */

import { copy } from "@jadwigo/copy";
import { cleanup, render } from "@testing-library/react";
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
});
