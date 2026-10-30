import { LESSON_FILES } from "@jadwigo/testing";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DraftMessage } from "./draft.ts";
import { keepDrawn, LessonBuilderScreen } from "./LessonBuilderScreen.tsx";

afterEach(cleanup);

const equalGroups = LESSON_FILES.find((f) => (f as { id?: unknown }).id === "equal-groups");

/** A message as dev/draft-watch.ts sends it, for `draft`. */
const messageOf = (draft: unknown, extra: Partial<DraftMessage> = {}): DraftMessage => ({
  dir: "/drafts",
  drafts: [{ draft_id: "x", title: "Równe grupy", mtime: 0 }],
  draft_id: "x",
  draft,
  check: null,
  error: null,
  ...extra,
});

/** The fixture with every `{pl, uk, en}` line in Polish, the language it is written for. */
const says = ["s02", "s05", "s06", "s07"].map((id) => {
  const step = (
    equalGroups as { script: { parts: { steps: { id: string; say: { pl: string } }[] }[] } }
  ).script.parts
    .flatMap((p) => p.steps)
    .find((s) => s.id === id);
  return { id, say: step?.say.pl ?? "" };
});

describe("LessonBuilderScreen with a draft", () => {
  it("draws every question step of equal-groups with its say and a rungs strip", () => {
    render(<LessonBuilderScreen initial={messageOf(equalGroups)} />);
    expect(screen.getByRole("heading", { name: "Równe grupy" })).toBeTruthy();
    for (const part of ["warm_up", "teach", "practise", "wrap_up"])
      expect(screen.getByRole("region", { name: `Part ${part}` })).toBeTruthy();

    for (const { id, say } of says) {
      const step = screen.getByRole("region", { name: `Step ${id}` });
      expect(step.querySelector("[data-say]")?.textContent, id).toBe(say);
      const strip = within(step).getByRole("list", { name: "Help rungs" });
      expect(
        [...strip.querySelectorAll("[data-rung]")].map((r) => r.getAttribute("data-rung")),
      ).toEqual(["look", "boost", "almost", "worked", "twin"]);
    }
    // Teaching steps are not drawn.
    expect(screen.queryByRole("region", { name: "Step s01" })).toBeNull();
  });

  it("shows which rungs are written and which are empty", () => {
    const draft = structuredClone(equalGroups) as {
      script: {
        parts: { steps: { id: string; question?: { help: Record<string, unknown> } }[] }[];
      };
    };
    const s02 = draft.script.parts[0]?.steps.find((s) => s.id === "s02");
    if (s02?.question === undefined) throw new Error("the fixture's s02 changed");
    s02.question.help["look"] = { text: { pl: "", uk: "", en: "" } };
    delete s02.question.help["twin"];
    render(<LessonBuilderScreen initial={messageOf(draft)} />);
    const strip = within(screen.getByRole("region", { name: "Step s02" })).getByRole("list", {
      name: "Help rungs",
    });
    const written = (rung: string) =>
      strip.querySelector(`[data-rung="${rung}"]`)?.getAttribute("data-written");
    expect(written("look")).toBe("false");
    expect(written("boost")).toBe("true");
    expect(written("twin")).toBe("false");
  });

  it("keeps the key off until the switch turns it on", () => {
    render(<LessonBuilderScreen initial={messageOf(equalGroups)} />);
    const toggle = screen.getByRole("switch", { name: "Show the key" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    act(() => fireEvent.click(toggle));
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("plays one step with Try it and goes back to the preview", () => {
    render(<LessonBuilderScreen initial={messageOf(equalGroups)} />);
    const step = screen.getByRole("region", { name: "Step s02" });
    act(() => fireEvent.click(within(step).getByRole("button", { name: "Try it" })));
    expect(within(step).getByRole("button", { name: "Back to preview" })).toBeTruthy();
    act(() => fireEvent.click(within(step).getByRole("button", { name: "Back to preview" })));
    expect(within(step).getByRole("button", { name: "Try it" })).toBeTruthy();
  });

  it("draws a step it cannot play as a card with the reason, and the rest as usual", () => {
    const draft = structuredClone(equalGroups) as {
      script: { parts: { steps: { id: string; question_type?: string }[] }[] };
    };
    const s02 = draft.script.parts[0]?.steps.find((s) => s.id === "s02");
    if (s02 === undefined) throw new Error("the fixture's s02 changed");
    s02.question_type = "riddle";
    render(<LessonBuilderScreen initial={messageOf(draft)} />);
    const card = screen.getByRole("region", { name: "Step s02" });
    expect(card.hasAttribute("data-skipped")).toBe(true);
    expect(
      within(card).getByText(/^Not drawn: .*\(script\.parts\[0\]\.steps\[1\]\.question_type\)$/),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Step s05" })).toBeTruthy();
  });

  it("offers a picker when there is more than one draft, and says where drafts go when none", () => {
    render(
      <LessonBuilderScreen
        initial={messageOf(equalGroups, {
          drafts: [
            { draft_id: "x", title: "Równe grupy", mtime: 2 },
            { draft_id: "y", title: "", mtime: 1 },
          ],
        })}
      />,
    );
    const picker = screen.getByRole("combobox", { name: "Draft" });
    expect([...picker.querySelectorAll("option")].map((o) => o.textContent)).toEqual([
      "Równe grupy (x)",
      "y",
    ]);
    cleanup();
    render(<LessonBuilderScreen initial={messageOf(null, { drafts: [], draft_id: null })} />);
    expect(screen.getByText("/drafts")).toBeTruthy();
  });

  it("says why a draft cannot be drawn yet", () => {
    render(<LessonBuilderScreen initial={messageOf({ title: "Half", language: "pl" })} />);
    const alert = screen.getByRole("alert").textContent ?? "";
    expect(alert.startsWith("x cannot be drawn yet: lesson file undefined:")).toBe(true);
    expect(alert).toContain("script");
  });
});

describe("keepDrawn", () => {
  it("keeps the last draft read when the same draft's next read fails", () => {
    const good = messageOf(equalGroups, { check: { ok: true } });
    const half = messageOf(null, { error: "x.json: Unexpected end of JSON input" });
    expect(keepDrawn(good, half)).toEqual({ ...half, draft: equalGroups, check: { ok: true } });
    expect(keepDrawn(good, messageOf(null, { draft_id: "y", error: "bad" })).draft).toBeNull();
    expect(keepDrawn(null, half)).toBe(half);
    const next = messageOf({ title: "New" });
    expect(keepDrawn(good, next)).toBe(next);
  });
});
