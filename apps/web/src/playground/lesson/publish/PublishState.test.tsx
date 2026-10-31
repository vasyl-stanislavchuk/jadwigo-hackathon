import { LESSON_FILES } from "@jadwigo/testing";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DraftMessage } from "../draft.ts";
import { LessonBuilderScreen } from "../LessonBuilderScreen.tsx";

afterEach(cleanup);

const AT = "2026-10-31T10:00:00.000Z";
const equalGroups = LESSON_FILES.find((f) => (f as { id?: unknown }).id === "equal-groups");
const publish = {
  draft_id: "x",
  request: "lekcja o równych grupach",
  lesson_id: "lesson_1",
  version: 1,
  assignment_id: "asg_1",
  play_url: "http://127.0.0.1:5173/play/asg_1",
  verified: {
    api_health: { ok: true, status: 200, detail: "" },
    attempt_started: { ok: true, status: 201, detail: "" },
    play_page: { ok: true, status: 200, detail: "" },
  },
  verified_at: AT,
  ok: true,
  target: "local",
  published_at: AT,
  timings: {},
};

function draw(mtime: number, publish_: unknown) {
  const message: DraftMessage = {
    dir: "/drafts",
    drafts: [{ draft_id: "x", title: "Równe grupy", mtime }],
    draft_id: "x",
    draft: equalGroups,
    check: null,
    render: null,
    publish: publish_,
    error: null,
  };
  render(<LessonBuilderScreen initial={message} />);
  return screen.getByLabelText("Publish");
}

describe("the publish state", () => {
  it("shows the play link and each check when the draft has not changed since", () => {
    const state = draw(Date.parse(AT) - 5_000, publish);
    expect(state.hasAttribute("data-stale")).toBe(false);
    expect(state.textContent).toContain("Published and verified to local as lesson_1 v1");
    expect(within(state).getByRole("link").getAttribute("href")).toBe(publish.play_url);
    expect(
      [...state.querySelectorAll("[data-check]")].map((c) => [
        c.getAttribute("data-check"),
        c.getAttribute("data-ok"),
      ]),
    ).toEqual([
      ["api_health", "true"],
      ["attempt_started", "true"],
      ["play_page", "true"],
    ]);
    expect(within(state).queryByRole("status")).toBeNull();
  });

  it("says the link plays an older draft when the draft changed after the publish", () => {
    const state = draw(Date.parse(AT) + 5_000, publish);
    expect(state.hasAttribute("data-stale")).toBe(true);
    expect(within(state).getByRole("status").textContent).toContain(
      "Published before the last change",
    );
  });

  it("does not call a publish with a failed check verified, and says when there is none", () => {
    const failed = {
      ...publish,
      ok: false,
      verified: {
        ...publish.verified,
        attempt_started: { ok: false, status: 500, detail: "the api answered 500" },
      },
    };
    const state = draw(Date.parse(AT) - 5_000, failed);
    expect(state.textContent).toContain("Published, not verified");
    expect(state.querySelector("[data-check='attempt_started']")?.textContent).toBe(
      "✗ attempt_started · 500 · the api answered 500",
    );
    cleanup();
    expect(draw(0, null).textContent).toContain("Not published yet");
  });
});
