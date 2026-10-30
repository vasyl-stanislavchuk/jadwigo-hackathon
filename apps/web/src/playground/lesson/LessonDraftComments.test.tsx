import { LESSON_FILES } from "@jadwigo/testing";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DraftMessage } from "./draft.ts";
import { LessonBuilderScreen } from "./LessonBuilderScreen.tsx";

// Each CommentsSlot records the props it is given, so the test sees where a comment would go.
const slots = vi.hoisted(() => ({ props: [] as { draft_id?: string; step_id?: string }[] }));
vi.mock("./slots.ts", () => ({
  CommentsSlot: (props: { draft_id?: string; step_id?: string }) => {
    slots.props.push(props);
    return null;
  },
  ActivitySlot: () => null,
}));

afterEach(() => {
  cleanup();
  slots.props.length = 0;
});

const equalGroups = LESSON_FILES.find((f) => (f as { id?: unknown }).id === "equal-groups");

describe("comments follow the draft on the page", () => {
  it("gives every step's CommentsSlot, and the lesson's, the picked draft's id", () => {
    const message: DraftMessage = {
      dir: "/drafts",
      drafts: [
        { draft_id: "newest", title: "", mtime: 2 },
        { draft_id: "older", title: "Równe grupy", mtime: 1 },
      ],
      draft_id: "older",
      draft: equalGroups,
      check: null,
      render: null,
      error: null,
    };
    render(<LessonBuilderScreen initial={message} />);
    const steps = slots.props.filter((p) => p.step_id !== undefined);
    expect(new Set(steps.map((p) => p.step_id))).toEqual(new Set(["s02", "s05", "s06", "s07"]));
    expect(slots.props.every((p) => p.draft_id === "older")).toBe(true);
    expect(slots.props.some((p) => p.step_id === undefined)).toBe(true);
  });
});
