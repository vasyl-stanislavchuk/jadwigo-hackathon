import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ActivitySlot } from "../slots.ts";
import { type ActivityPayload, ActivityProvider } from "./source.ts";
import { WorkFold } from "./WorkFold.tsx";

afterEach(cleanup);

function renderWith(payload: ActivityPayload) {
  return render(
    <ActivityProvider payload={payload}>
      <ActivitySlot />
    </ActivityProvider>,
  );
}

describe("ActivitySlot", () => {
  it("lists what the session did with a mark on each line", () => {
    renderWith({
      session_id: "s1",
      steps: [
        { at: "2026-10-30T10:00:01.000Z", text: "Drew 6 questions from 2 sets", mark: "done" },
        { at: "2026-10-30T10:00:02.000Z", text: "Couldn't read notes.md", mark: "failed" },
        { at: "2026-10-30T10:00:03.000Z", text: "Check: running", mark: "current" },
      ],
    });
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual([
      "✓done: Drew 6 questions from 2 sets",
      "✕failed: Couldn't read notes.md",
      "›running: Check: running",
    ]);
  });

  it("says plainly when no builder session is running", () => {
    renderWith({ session_id: null, steps: [] });
    expect(screen.getByText("No builder session. Start one with make builder.")).toBeTruthy();
  });
});

describe("WorkFold", () => {
  it("opens by itself when a step failed, and counts the calls", () => {
    const { container } = render(
      <WorkFold
        work={{
          steps: [
            { text: "Reading lesson.json", ok: true },
            { text: "A command failed", ok: false },
          ],
          calls: 3,
          failed: 1,
          read: ["lesson.json"],
          changed: [],
        }}
      />,
    );
    const fold = container.querySelector("details");
    expect(fold?.open).toBe(true);
    expect(fold?.querySelector("summary")?.textContent).toBe(
      "What Claude did · 3 steps · 1 failed",
    );
    expect(screen.getByText("Repeated steps are shown once.")).toBeTruthy();
    expect(screen.getByText("Read: lesson.json")).toBeTruthy();
  });
});
