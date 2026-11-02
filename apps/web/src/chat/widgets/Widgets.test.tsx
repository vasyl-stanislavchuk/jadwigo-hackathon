import type { Run } from "@jadwigo/contracts/run";
import { RunId } from "@jadwigo/contracts/run";
import type { ChatItem, RunView } from "@jadwigo/core";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SKILLS } from "../../parent/learner/fixtures.ts";
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

function draw(
  tools: ToolItem[],
  language: "pl" | "en" = "pl",
  onSend: (text: string) => void = () => {},
) {
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
      onSend={onSend}
      onStop={() => {}}
    />,
  );
}

describe("the verb → widget registry (dl-z5ja.24)", () => {
  it("draws lesson_check's findings as its widget, in view under the fold, in plain words", () => {
    draw([tool(1, { view: { kind: "lesson_check", data: FINDINGS } })]);
    const widget = screen.getByRole("region", { name: "Sprawdzanie lekcji" });
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
    expect(card?.querySelector("summary")?.textContent).toBe("Szczegóły");
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
    expect(document.querySelector("[data-state='rejected'] summary")?.textContent).toBe(
      "Sprawdzanie lekcji · pominięte, jak prosisz",
    );
  });

  it("draws question_search's sets as chips, and says so when none fits", () => {
    draw([
      tool(1, {
        verb: "question_search",
        view: {
          kind: "question_search",
          // The whole set as question_search writes it, through the contracts' SearchSet.
          data: {
            sets: [
              {
                set_id: "set_demo",
                title: "Adding within 20",
                grades: ["1"],
                skills: ["add-20"],
                questions: 6,
                why_found: "dodawanie",
              },
            ],
          },
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
    const widget = screen.getByRole("region", { name: "Zmienianie lekcji" });
    expect(widget.querySelector("[data-edited-step='s01']")?.textContent).toBe("Krok s01");
  });

  it("the plain card shows what Jadwigo AI sent and what came back (dl-z5ja.68)", () => {
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
    expect(card?.textContent).toContain("Wysłane dane");
    expect(card?.textContent).toContain("Co wróciło");
  });

  it("draws learner_skills with the learner page's goal lists, in the parent's words", () => {
    const data = {
      learner: { id: SKILLS.learner.id, first_name: "Ola" },
      goals: SKILLS.goals,
      brief: SKILLS.brief,
      skills: SKILLS.catalogue,
    };
    draw([tool(1, { verb: "learner_skills", view: { kind: "learner_skills", data } })]);
    const widget = screen.getByRole("region", { name: "Czytanie celów dziecka" });
    expect(widget.querySelector("[data-goals]")).not.toBeNull();
    expect(widget.querySelectorAll("[data-goal]")).toHaveLength(2);
    expect(widget.textContent).toContain("Dodaje w zakresie 10.");
    expect(widget.textContent).not.toMatch(/familiar|attempted|mastered|proficient/);
  });

  it("draws learner_week with the week strip, and a malformed one as the plain card", () => {
    const weeks = [
      { monday: "2026-10-26", lessons: 0, moved_up: 0, attention: null },
      { monday: "2026-11-02", lessons: 2, moved_up: 1, attention: 1 },
    ];
    const data = { learner: { id: SKILLS.learner.id, first_name: "Ola" }, weeks, lessons: [] };
    draw([
      tool(1, { verb: "learner_week", view: { kind: "learner_week", data } }),
      tool(2, { verb: "learner_week", view: { kind: "learner_week", data: { weeks: 3 } } }),
    ]);
    const widget = screen.getByRole("region", { name: "Czytanie tygodnia dziecka" });
    expect(
      [...widget.querySelectorAll("[data-week]")].map((w) => w.getAttribute("data-week")),
    ).toEqual(["2026-10-26", "2026-11-02"]);
    expect(widget.querySelector("[data-lessons='2']")).not.toBeNull();
    // The malformed one draws no widget; each line keeps its raw details under Szczegóły.
    expect(document.querySelectorAll("[data-widget]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-card='plain']")).toHaveLength(2);
  });

  it("draws lesson_ideas as its list, why and skill count, and asks for one in the parent's words (dl-z5ja.129)", () => {
    const sent: string[] = [];
    const idea = (id: string, list: string, why: string, skills: string[]) => ({
      id,
      list,
      why,
      skill_codes: skills,
      goal_ids: [],
      citations: [{ kind: "skill", skill_code: skills[0] }],
    });
    const data = {
      learner: { id: SKILLS.learner.id, first_name: "Ola" },
      ideas: [
        idea("i1", "reteach", "needs_attention", ["math.add.within-10", "math.add.within-20"]),
        idea("i2", "new", "prerequisites_met", ["math.mul.equal-groups"]),
      ],
    };
    draw([tool(1, { verb: "lesson_ideas", view: { kind: "lesson_ideas", data } })], "pl", (t) =>
      sent.push(t),
    );
    const widget = screen.getByRole("region", { name: "Szukanie pomysłów na następną lekcję" });
    expect(widget.closest("details")).toBeNull();
    const rows = [...widget.querySelectorAll("[data-idea]")];
    expect(rows.map((r) => r.getAttribute("data-idea"))).toEqual(["i1", "i2"]);
    expect(rows[0]?.textContent).toContain("Do nauczenia jeszcze raz");
    expect(rows[0]?.textContent).toContain("Ostatnio sprawiało trudność");
    expect(rows[0]?.textContent).toContain("2 umiejętności");
    expect(rows[1]?.textContent).toContain("Coś nowego");
    expect(rows[1]?.textContent).toContain("1 umiejętność");
    // No skill code reaches the parent.
    expect(widget.textContent).not.toMatch(/math\./);
    within(rows[1] as HTMLElement)
      .getByRole("button", { name: "Ułóż tę lekcję" })
      .click();
    expect(sent).toEqual(["Ułóż lekcję z pomysłu 2: Coś nowego."]);
  });

  it("says when there are no ideas, and falls back to the plain card on a malformed view", () => {
    const learner = { id: SKILLS.learner.id, first_name: "Ola" };
    draw([
      tool(1, {
        verb: "lesson_ideas",
        view: { kind: "lesson_ideas", data: { learner, ideas: [] } },
      }),
      tool(2, {
        verb: "lesson_ideas",
        view: { kind: "lesson_ideas", data: { learner, ideas: 3 } },
      }),
    ]);
    const widgets = screen.getAllByRole("region", { name: "Szukanie pomysłów na następną lekcję" });
    expect(widgets).toHaveLength(1);
    expect(widgets[0]?.textContent).toContain("Na razie nie ma pomysłów na następną lekcję.");
    expect(
      [...document.querySelectorAll("[data-card='plain']")].map((c) => c.getAttribute("data-tool")),
    ).toContain("lesson_ideas");
  });

  it("draws learner_mistakes in the parent's words, with the child's answers as text (dl-z5ja.129)", () => {
    const attempt = "att_00000000000000000000000001";
    const data = {
      learner: { id: SKILLS.learner.id, first_name: "Ola" },
      mistakes: [
        {
          mistake_class: "off_by_small",
          times: 3,
          citations: [{ kind: "attempt", attempt_id: attempt }],
        },
        {
          mistake_class: "made_up_class",
          times: 1,
          citations: [{ kind: "attempt", attempt_id: attempt }],
        },
      ],
      questions: [
        {
          attempt_id: attempt,
          seq: 2,
          say: "Ile to jest 7 + 5?",
          mistake_classes: ["off_by_small"],
          tries: 2,
          skipped: false,
          answers: ["11", "<b>13</b>"],
        },
        {
          attempt_id: attempt,
          seq: 4,
          say: "Ile to jest 8 + 6?",
          mistake_classes: [],
          tries: 0,
          skipped: true,
          answers: [],
        },
      ],
    };
    draw([tool(1, { verb: "learner_mistakes", view: { kind: "learner_mistakes", data } })]);
    const widget = screen.getByRole("region", { name: "Czytanie, co sprawiło dziecku trudność" });
    const classes = [...widget.querySelectorAll("[data-mistake]")].map((m) => m.textContent);
    expect(classes).toEqual([
      "Bardzo blisko: różnica 1 lub 2" + "3 razy",
      "Inna odpowiedź niż ta, której szukaliśmy" + "1 raz",
    ]);
    const missed = [...widget.querySelectorAll("[data-missed]")];
    expect(missed[0]?.querySelector("[data-answers]")?.textContent).toBe(
      "Odpowiedzi dziecka: 11 · <b>13</b>",
    );
    // The child's words are text: no element is made from them.
    expect(missed[0]?.querySelector("b")).toBeNull();
    expect(missed[1]?.querySelector("[data-answers]")?.textContent).toBe("Pominięte");
    expect(widget.textContent).not.toMatch(/off_by_small|made_up_class/);
  });

  it("says when nothing was hard, and falls back to the plain card on a malformed mistakes view", () => {
    const learner = { id: SKILLS.learner.id, first_name: "Ola" };
    draw([
      tool(1, {
        verb: "learner_mistakes",
        view: { kind: "learner_mistakes", data: { learner, mistakes: [], questions: [] } },
      }),
      tool(2, {
        verb: "learner_mistakes",
        view: { kind: "learner_mistakes", data: { learner, mistakes: "many" } },
      }),
    ]);
    const widgets = screen.getAllByRole("region", {
      name: "Czytanie, co sprawiło dziecku trudność",
    });
    expect(widgets).toHaveLength(1);
    expect(widgets[0]?.textContent).toContain("Ostatnio nic nie sprawiało trudności.");
  });
});
