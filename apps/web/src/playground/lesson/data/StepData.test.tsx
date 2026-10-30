import type { Finding } from "@jadwigo/lesson-import/file";
import { LESSON_FILES } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DraftMessage } from "../draft.ts";
import { LessonBuilderScreen } from "../LessonBuilderScreen.tsx";

afterEach(cleanup);

type Raw = {
  script: {
    parts: { steps: { id: string; say?: { pl: string }; question?: { data: unknown } }[] }[];
  };
};
const equalGroups = () =>
  structuredClone(LESSON_FILES.find((f) => (f as { id?: unknown }).id === "equal-groups")) as Raw;

/** s05 is equal-groups' second question, the first step of part 2. */
const S05 = "script.parts[2].steps[0]";

const finding: Finding = {
  step_id: "s05",
  path: `${S05}.question.help.look`,
  level: "error",
  rule: "words",
  text: "The look rung names the answer.",
  fix: "Point at the groups, not the total.",
};

function draw(previous: Raw | null) {
  const now = equalGroups();
  const s05 = now.script.parts[2]?.steps.find((s) => s.id === "s05");
  if (s05?.say === undefined) throw new Error("the fixture's s05 changed");
  s05.say.pl = "Ile to jest trzy razy cztery? Policz kropki.";
  const message: DraftMessage = {
    dir: "/drafts",
    drafts: [{ draft_id: "x", title: "", mtime: 0 }],
    draft_id: "x",
    draft: now,
    check: { ok: false, findings: [finding] },
    render: null,
    error: null,
  };
  render(<LessonBuilderScreen initial={message} initialPrevious={previous} />);
  const step = screen.getByRole("region", { name: "Step s05" });
  act(() => fireEvent.click(within(step).getByRole("button", { name: "Data" })));
  return within(step).getByRole("region", { name: `Data of ${S05}` });
}

const line = (data: HTMLElement, path: string) =>
  data.querySelector(`[data-path='${path}']`) as HTMLElement | null;

describe("the Data view", () => {
  it("shows the step's JSON with the key hidden until the key switch shows it", () => {
    const data = draw(null);
    expect(line(data, `${S05}.say`)?.textContent).toContain("Policz kropki.");
    expect(line(data, `${S05}.question.data`)).not.toBeNull();
    expect(line(data, `${S05}.question.key`)?.textContent).toContain("hidden");
    expect(line(data, `${S05}.question.key.accept`)).toBeNull();
    act(() => fireEvent.click(screen.getByRole("switch", { name: "Show the key" })));
    const shown = screen.getByRole("region", { name: `Data of ${S05}` });
    expect(line(shown, `${S05}.question.key`)?.textContent).not.toContain("hidden");
    expect(line(shown, `${S05}.question.key.accept[0]`)?.textContent).toBe('"12"');
  });

  it("marks a line a finding's path names, and a line changed since the draft before", () => {
    const data = draw(equalGroups());
    expect(line(data, `${S05}.question.help.look`)?.getAttribute("data-level")).toBe("error");
    expect(line(data, `${S05}.say`)?.getAttribute("data-level")).toBeNull();
    expect(line(data, `${S05}.say`)?.hasAttribute("data-changed")).toBe(true);
    expect(line(data, `${S05}.question_type`)?.hasAttribute("data-changed")).toBe(false);
    expect(data.textContent).toContain("1 changed and 0 removed since the draft before");
  });

  it("says whom to ask about the step", () => {
    const data = draw(null);
    expect(data.querySelector("[data-origin]")?.getAttribute("data-origin")).toBe("authored");
    expect(data.textContent).toContain("no earlier draft seen on this page");
  });
});
