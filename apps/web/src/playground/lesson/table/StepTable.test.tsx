import type { Finding } from "@jadwigo/lesson-import/file";
import { LESSON_FILES } from "@jadwigo/testing";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DraftMessage } from "../draft.ts";
import { LessonBuilderScreen } from "../LessonBuilderScreen.tsx";

afterEach(cleanup);

const equalGroups = LESSON_FILES.find((f) => (f as { id?: unknown }).id === "equal-groups");

/** The second question step of equal-groups is s05: the "q2" of the acceptance. */
const error: Finding = {
  step_id: "s05",
  path: "script.parts[2].steps[0].question.help.almost",
  level: "error",
  rule: "empty-rung",
  text: "Rung 3 (almost) is empty.",
  fix: "Write the almost rung: the worked lines with the last one left blank.",
};
const warn: Finding = {
  step_id: null,
  path: "title",
  level: "warn",
  rule: "long-title",
  text: "The title is longer than a parent reads at a glance.",
  fix: "Keep the title under 40 characters.",
};

const message: DraftMessage = {
  dir: "/drafts",
  drafts: [{ draft_id: "x", title: "Równe grupy", mtime: 0 }],
  draft_id: "x",
  draft: equalGroups,
  check: { ok: false, findings: [error, warn] },
  render: null,
  publish: null,
  error: null,
};

describe("the step table and the findings", () => {
  it("pins the error under s05, the lesson's warn above the table, and tones s05's row", () => {
    render(<LessonBuilderScreen initial={message} />);

    const step = screen.getByRole("region", { name: "Step s05" });
    const pinned = within(step).getByRole("list", { name: "Findings on s05" });
    expect(pinned.querySelector("[data-level='error']")?.textContent).toContain(
      "empty-rung · Rung 3 (almost) is empty.",
    );
    expect(pinned.textContent).toContain(`Fix: ${error.fix}`);
    expect(pinned.textContent).toContain(error.path);

    const lesson = screen.getByRole("list", { name: "Lesson findings" });
    const table = screen.getByRole("table", { name: "Steps" });
    expect(lesson.textContent).toContain("long-title");
    // The lesson's findings come before the table in the page.
    expect(lesson.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(step).queryByText(/long-title/)).toBeNull();

    const row = table.querySelector("[data-row='s05']");
    expect(row?.getAttribute("data-tone")).toBe("error");
    expect(table.querySelector("[data-row='s02']")?.hasAttribute("data-tone")).toBe(false);
    expect(
      within(row as HTMLElement)
        .getByRole("link", { name: "s05" })
        .getAttribute("href"),
    ).toBe("#s05");
    // The link lands on the drawn step.
    expect(document.getElementById("s05")).toBe(step);
  });

  it("has a row per question step, and hides the key until the switch shows it", () => {
    render(<LessonBuilderScreen initial={message} />);
    const table = screen.getByRole("table", { name: "Steps" });
    expect(
      [...table.querySelectorAll("[data-row]")].map((r) => r.getAttribute("data-row")),
    ).toEqual(["s02", "s05", "s06", "s07"]);
    expect(table.querySelector("[data-row='s02'] [data-key]")?.textContent).toBe("hidden");
  });

  it("draws no findings and no tone when the draft was never checked", () => {
    render(<LessonBuilderScreen initial={{ ...message, check: null }} />);
    expect(screen.queryByRole("list", { name: "Lesson findings" })).toBeNull();
    expect(screen.getByRole("table", { name: "Steps" }).querySelector("[data-tone]")).toBeNull();
  });
});
