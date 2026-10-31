import { LESSON_FILES } from "@jadwigo/testing";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DraftMessage } from "./draft.ts";
import { LessonBuilderScreen } from "./LessonBuilderScreen.tsx";
import { renderFindings } from "./render/rules.ts";

afterEach(cleanup);

type Raw = {
  script: {
    parts: {
      steps: { id: string; question?: { help: { twin: { data: Record<string, unknown> } } } }[];
    }[];
  };
};

/** s05 is equal-groups' second question, the first step of part 2. */
const TWIN_PATH = "script.parts[2].steps[0].question.help.twin";

/** equal-groups with a picture planted in s05's twin, and `render` as the dev server sends it. */
function draw(render_: unknown) {
  const raw = structuredClone(
    LESSON_FILES.find((f) => (f as { id?: unknown }).id === "equal-groups"),
  ) as Raw;
  const s05 = raw.script.parts[2]?.steps.find((s) => s.id === "s05");
  if (s05?.question === undefined) throw new Error("the fixture's s05 changed");
  const twin = s05.question.help.twin;
  twin.data = { ...twin.data, stem: { text: "Policz kropki.", image: { src: "", alt: "kropki" } } };
  const message: DraftMessage = {
    dir: "/drafts",
    drafts: [{ draft_id: "x", title: "", mtime: 0 }],
    draft_id: "x",
    draft: raw,
    check: null,
    render: render_,
    error: null,
  };
  render(<LessonBuilderScreen initial={message} />);
}

describe("the twin row", () => {
  it("draws each twin under its step as s<n>t, at its path in the file", () => {
    draw(null);
    const twin = screen.getByRole("region", { name: "Twin s05t" });
    expect(twin.textContent).toContain(TWIN_PATH);
    const step = screen.getByRole("region", { name: "Step s05" });
    expect(step.compareDocumentPosition(twin) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getAllByRole("region", { name: /^Twin / }).map((r) => r.id)).toEqual([
      "s02t",
      "s05t",
      "s06t",
      "s07t",
    ]);
  });

  it("lets the render rules find the twin's broken picture, and pins the finding under the twin", () => {
    draw(null);
    const drawn = screen
      .getByRole("region", { name: "Twin s05t" })
      .querySelector(".kid-step") as HTMLElement;
    const found = renderFindings(drawn, { step_id: "s05t", path: TWIN_PATH });
    expect(found.map((f) => [f.step_id, f.path, f.rule])).toEqual([
      ["s05t", TWIN_PATH, "render-picture-missing"],
    ]);
    cleanup();

    // The dev server writes them to render.json and sends them back with the draft.
    draw({ draft_id: "x", findings: found, rendered_at: "2026-10-31T00:00:00.000Z" });
    const twin = screen.getByRole("region", { name: "Twin s05t" });
    const pinned = within(twin).getByRole("list", { name: "Findings on s05t" });
    expect(pinned.textContent).toContain("render-picture-missing");
    expect(pinned.textContent).toContain(TWIN_PATH);
    expect(
      within(screen.getByRole("region", { name: "Step s05" })).queryByText(
        /render-picture-missing/,
      ),
    ).toBeNull();
  });
});
