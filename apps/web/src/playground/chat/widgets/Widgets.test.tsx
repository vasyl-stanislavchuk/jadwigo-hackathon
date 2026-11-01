import type { Run } from "@jadwigo/contracts/run";
import { RunId } from "@jadwigo/contracts/run";
import type { ChatItem, RunView } from "@jadwigo/core";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ChatPane } from "../ChatPane.tsx";

afterEach(cleanup);

type ToolItem = Extract<ChatItem, { kind: "tool" }>;

const RUN_ID = RunId.parse("run_00000000000000000000000001");

const FINDINGS = {
  publishable: false,
  findings: [
    {
      step_id: "s02",
      path: "script.parts[0].steps[1].question.key",
      level: "error",
      rule: "missing-key",
      text: "the question has no key",
      fix: "add the answer under question.key",
    },
    {
      step_id: null,
      path: "title",
      level: "warn",
      rule: "long-title",
      text: "the title is long",
      fix: "",
    },
  ],
};

function tool(seq: number, change: Partial<ToolItem>): ToolItem {
  return {
    kind: "tool",
    seq,
    call_id: `call_${seq}`,
    verb: "lesson_check",
    state: "done",
    error: null,
    ...change,
  };
}

function draw(tools: ToolItem[], language: "pl" | "en" = "pl") {
  const view: RunView = {
    chat: tools,
    lesson: null,
    previous_lesson: null,
    status: "completed",
    turn_open: false,
    spent_usd: 0,
    cap_usd: 1,
    budget: "none",
    cursor: tools.length,
    plan: null,
  };
  const run = { id: RUN_ID, status: "completed" } as Run;
  render(
    <ChatPane
      language={language}
      turns={[{ run, view }]}
      queued={[]}
      restoring={false}
      stopping={false}
      sendFailed={false}
      onSend={() => {}}
      onStop={() => {}}
    />,
  );
}

describe("the verb → widget registry (dl-z5ja.24)", () => {
  it("draws lesson_check's findings as its widget, in view under the fold, in plain words", () => {
    draw([tool(1, { view: { kind: "lesson_check", data: FINDINGS } })]);
    const widget = screen.getByRole("region", { name: "Sprawdzam lekcję" });
    expect(widget.getAttribute("data-widget")).toBe("lesson_check");
    expect(widget.closest("details")).toBeNull();
    expect(within(widget).getByText("1 uwaga do poprawy")).toBeTruthy();
    const rows = widget.querySelectorAll("li[data-level]");
    expect([...rows].map((r) => r.getAttribute("data-level"))).toEqual(["error", "warn"]);
    expect(rows[0]?.textContent).toContain("Do poprawy · Krok s02 · the question has no key");
    expect(rows[1]?.textContent).toContain("Warto spojrzeć · the title is long");
    expect(widget.textContent).not.toMatch(/\berror\b|\bwarn\b/);
  });

  it("says a clean check passed", () => {
    draw(
      [tool(1, { view: { kind: "lesson_check", data: { publishable: true, findings: [] } } })],
      "en",
    );
    const widget = screen.getByRole("region", { name: "Checking the lesson" });
    expect(widget.textContent).toContain("The lesson passed its checks.");
  });

  it("draws a verb with no widget as the plain card, inside the fold", () => {
    draw([
      tool(1, {
        verb: "lesson_show",
        view: { kind: "lesson_show", data: { title: "Dodawanie", steps: [] } },
      }),
    ]);
    expect(document.querySelector("[data-widget]")).toBeNull();
    const card = document.querySelector("[data-card='plain']");
    expect(card?.getAttribute("data-tool")).toBe("lesson_show");
    expect(card?.parentElement?.closest("details")).not.toBeNull();
    expect(card?.querySelector("summary")?.textContent).toBe("Szczegóły kroku");
    expect(card?.querySelector("[data-card-output]")?.textContent).toContain(
      '"title": "Dodawanie"',
    );
  });

  it("falls back to the plain card on a malformed view, and on a view naming another verb", () => {
    draw([
      tool(1, { view: { kind: "lesson_check", data: { publishable: "yes", findings: [] } } }),
      tool(2, { verb: "question_search", view: { kind: "lesson_check", data: FINDINGS } }),
    ]);
    expect(document.querySelector("[data-widget]")).toBeNull();
    const cards = document.querySelectorAll("[data-card='plain']");
    expect([...cards].map((c) => c.getAttribute("data-tool"))).toEqual([
      "lesson_check",
      "question_search",
    ]);
  });

  it("draws nothing until the call is done", () => {
    draw([
      tool(1, { state: "running", view: { kind: "lesson_check", data: FINDINGS } }),
      tool(2, { state: "failed", view: { kind: "lesson_check", data: FINDINGS } }),
      tool(3, { state: "rejected" }),
    ]);
    expect(document.querySelector("[data-widget]")).toBeNull();
    expect(document.querySelector("[data-card]")).toBeNull();
    expect(document.querySelector("[data-state='rejected']")?.textContent).toBe(
      "Sprawdzam lekcję: pominięte, jak prosisz",
    );
  });

  it("draws question_search's sets as chips, and says so when none fits", () => {
    draw([
      tool(1, {
        verb: "question_search",
        view: {
          kind: "question_search",
          data: { sets: [{ set_id: "set_demo", title: "Adding within 20" }] },
        },
      }),
      tool(2, { verb: "question_search", view: { kind: "question_search", data: { sets: [] } } }),
    ]);
    const widgets = screen.getAllByRole("region", { name: "Zestawy zadań" });
    expect(widgets[0]?.querySelector("[data-set='set_demo']")?.textContent).toBe(
      "Adding within 20",
    );
    expect(widgets[1]?.textContent).toContain(
      "Żaden zestaw zadań nie pasuje jeszcze do tej prośby.",
    );
  });

  it("draws the steps lesson_edit changed", () => {
    draw([
      tool(1, {
        verb: "lesson_edit",
        view: { kind: "lesson_edit", data: { changed_step_ids: ["s01"] } },
      }),
    ]);
    const widget = screen.getByRole("region", { name: "Zmieniam lekcję" });
    expect(widget.querySelector("[data-edited-step='s01']")?.textContent).toBe("Krok s01");
  });

  it("the plain card shows what the assistant sent and what came back (dl-z5ja.68)", () => {
    draw([
      tool(1, {
        verb: "lesson_draft",
        input: { topic: "dodawanie do 20", grade: "1" },
        output: { draft_id: "run_1", title: "Dodawanie" },
      }),
    ]);
    const card = document.querySelector("[data-card='plain']");
    expect(card?.querySelector("[data-card-input]")?.textContent).toContain(
      '"topic": "dodawanie do 20"',
    );
    expect(card?.querySelector("[data-card-output]")?.textContent).toContain(
      '"title": "Dodawanie"',
    );
    expect(card?.textContent).toContain("Co asystent podał");
    expect(card?.textContent).toContain("Co wróciło");
  });
});
