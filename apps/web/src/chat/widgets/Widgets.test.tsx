import { copy } from "@jadwigo/copy";
import type { ChatItem } from "@jadwigo/core";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SKILLS } from "../../parent/learner/fixtures.ts";
import type { ObjectRef } from "../objects/ref.ts";
import { type ToolResult, toolResult } from "./Widgets.tsx";

afterEach(cleanup);

type ToolItem = Extract<ChatItem, { kind: "tool" }>;

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

/** What one finished tool line gives the turn, drawn when it is an element. */
function draw(
  item: ToolItem,
  language: "pl" | "en" = "pl",
  onAsk: (text: string) => void = () => {},
  onOpen?: (object: ObjectRef) => void,
): ToolResult {
  const result = toolResult(item, language, { onAsk, onOpen });
  if (result !== null) render(result.element);
  return result;
}

const OLA = { id: SKILLS.learner.id, first_name: "Ola" };
const SKILLS_VIEW = {
  learner: OLA,
  goals: SKILLS.goals,
  brief: SKILLS.brief,
  skills: SKILLS.catalogue,
};

/** A lesson played in the week, under a made-up attempt: no learner's data. */
function lesson(n: number, started_at: string, title: string, questions = 8) {
  return {
    attempt_id: `att_0000000000000000000000000${n}`,
    title,
    language: "pl",
    started_at,
    finished: true,
    questions,
  };
}

describe("the verb → widget registry (dl-z5ja.24)", () => {
  it("draws lesson_check's findings in plain words, folded with its line (S1: the card shows a failed check)", () => {
    const result = draw(tool(1, { view: { kind: "lesson_check", data: FINDINGS } }));
    expect(result?.kind).toBe("widget");
    expect(result?.kind === "widget" && result.keepVisible).toBe(false);
    const widget = screen.getByRole("region", { name: "Sprawdzanie lekcji" });
    expect(widget.getAttribute("data-widget")).toBe("lesson_check");
    expect(within(widget).getByText("1 uwaga do poprawy")).toBeTruthy();
    const rows = widget.querySelectorAll("li[data-level]");
    expect([...rows].map((r) => r.getAttribute("data-level"))).toEqual(["error", "warn"]);
    expect(rows[0]?.textContent).toContain("Do poprawy · Krok s02 · the question has no key");
    expect(rows[1]?.textContent).toContain("Warto spojrzeć · the title is long");
    expect(widget.textContent).not.toMatch(/\berror\b|\bwarn\b/);
  });

  it("says a clean check passed, and keeps it out of view", () => {
    const result = draw(
      tool(1, { view: { kind: "lesson_check", data: { publishable: true, findings: [] } } }),
      "en",
    );
    expect(result?.kind === "widget" && result.keepVisible).toBe(false);
    const widget = screen.getByRole("region", { name: "Checking the lesson" });
    expect(widget.textContent).toContain("The lesson passed its checks.");
  });

  it("gives question_search, lesson_edit and lesson_show no element in view (S1, S14)", () => {
    const search = {
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
    };
    const items = [
      tool(1, { verb: "question_search", view: { kind: "question_search", data: search } }),
      tool(2, { verb: "question_search", view: { kind: "question_search", data: { sets: [] } } }),
      tool(3, {
        verb: "lesson_edit",
        view: { kind: "lesson_edit", data: { changed_step_ids: ["s01"] } },
      }),
      tool(4, {
        verb: "lesson_show",
        view: { kind: "lesson_show", data: { title: "Dodawanie", steps: [] } },
      }),
    ];
    for (const item of items) {
      const result = toolResult(item, "pl");
      // The plain card, which lives folded inside the line: never a widget in view.
      expect(result?.kind).toBe("plain");
    }
    for (const item of items) draw(item);
    expect(document.querySelector("[data-widget]")).toBeNull();
    // No "Zestawy zadań" card: the sets are tags on the search line (S14).
    expect(screen.queryByRole("region", { name: "Zestawy zadań" })).toBeNull();
  });

  it("falls back to the plain card on a malformed view, and on a view naming another verb", () => {
    const malformed = draw(
      tool(1, { view: { kind: "lesson_check", data: { publishable: "yes", findings: [] } } }),
    );
    const borrowed = draw(
      tool(2, { verb: "learner_week", view: { kind: "lesson_check", data: FINDINGS } }),
    );
    expect([malformed?.kind, borrowed?.kind]).toEqual(["plain", "plain"]);
    expect(document.querySelector("[data-widget]")).toBeNull();
  });

  it("draws nothing until the call is done, and nothing for a call with nothing to show", () => {
    expect(
      toolResult(
        tool(1, { state: "running", view: { kind: "lesson_check", data: FINDINGS } }),
        "pl",
      ),
    ).toBeNull();
    expect(
      toolResult(
        tool(2, { state: "failed", view: { kind: "lesson_check", data: FINDINGS } }),
        "pl",
      ),
    ).toBeNull();
    expect(toolResult(tool(3, { state: "rejected" }), "pl")).toBeNull();
    expect(toolResult(tool(4, { verb: "lesson_draft" }), "pl")).toBeNull();
  });

  it("gives a verb with no widget the plain card when it sent or got something (dl-z5ja.68)", () => {
    const result = toolResult(
      tool(1, {
        verb: "lesson_draft",
        input: { topic: "dodawanie do 20", grade: "1" },
        output: { draft_id: "run_1", title: "Dodawanie" },
      }),
      "pl",
    );
    expect(result?.kind).toBe("plain");
  });

  it("draws learner_skills in the frame with the learner page's goal lists, in the parent's words", () => {
    const result = draw(
      tool(1, { verb: "learner_skills", view: { kind: "learner_skills", data: SKILLS_VIEW } }),
    );
    expect(result?.kind === "widget" && result.keepVisible).toBe(true);
    const widget = screen.getByRole("region", { name: "Czytanie celów dziecka" });
    expect(widget.querySelector("[data-title]")?.textContent).toBe("Czytanie celów dziecka");
    expect(widget.querySelector("[data-body] [data-goals]")).not.toBeNull();
    expect(widget.querySelectorAll("[data-goal]")).toHaveLength(2);
    expect(widget.textContent).toContain("Dodaje w zakresie 10.");
    expect(widget.textContent).not.toMatch(/familiar|attempted|mastered|proficient/);
  });

  it("opens the child beside the chat from a learner widget, and offers nothing where the page can't (dl-uukj.47.59)", () => {
    const item = tool(1, {
      verb: "learner_skills",
      view: { kind: "learner_skills", data: SKILLS_VIEW },
    });
    const onOpen = vi.fn();
    draw(item, "pl", () => {}, onOpen);
    const widget = screen.getByRole("region", { name: "Czytanie celów dziecka" });
    within(widget).getByRole("button", { name: "Szczegóły: Ola" }).click();
    expect(onOpen).toHaveBeenCalledWith({ kind: "learner", id: SKILLS.learner.id });
    cleanup();
    draw(item);
    expect(document.querySelector("[data-open-learner]")).toBeNull();
  });

  it("draws learner_week in the frame: its title and range, a row per lesson, newest first (§4.3, s08)", () => {
    const data = {
      learner: OLA,
      weeks: [{ monday: "2026-10-26", lessons: 2, moved_up: 1, attention: 1 }],
      lessons: [
        lesson(2, "2026-10-29T15:00:00Z", "Ó czy u", 5),
        lesson(1, "2026-10-27T15:00:00Z", "Mnożenie przez 2 i 5"),
      ],
    };
    const result = draw(tool(1, { verb: "learner_week", view: { kind: "learner_week", data } }));
    expect(result?.kind === "widget" && result.keepVisible).toBe(true);
    const title = copy("pl", "chat_week_title", { name: "Ola" }, "adult");
    const widget = screen.getByRole("region", { name: title });
    expect(widget.getAttribute("data-widget")).toBe("learner_week");
    expect(widget.querySelector("[data-title]")?.textContent).toBe(title);
    expect(widget.querySelector("[data-meta]")?.textContent).toBe("26 paź – 1 lis · 2 lekcje");
    const rows = [...widget.querySelectorAll("[data-week-lesson]")];
    expect(rows.map((r) => r.querySelector("[data-day]")?.textContent)).toEqual([
      "czw 29",
      "wt 27",
    ]);
    expect(rows.map((r) => r.querySelector("[data-topic]")?.textContent)).toEqual([
      "Ó czy u",
      "Mnożenie przez 2 i 5",
    ]);
    expect(rows.map((r) => r.querySelector("[data-count]")?.textContent)).toEqual([
      "5 zadań",
      "8 zadań",
    ]);
    // The bar waits on each lesson's right / help / miss (dl-uukj.47.71.11): none drawn yet, and
    // no verdict hue outside it.
    expect(widget.querySelector("[data-slot='result-bar']")).toBeNull();
    expect(widget.querySelector("[data-show-all]")).toBeNull();
  });

  it("shows 6 week rows, then 'Pokaż wszystkie ({n})' opens the rest in place (§4.3)", () => {
    const days = ["26", "27", "28", "29", "30", "31"];
    const lessons = [
      ...days.map((d, i) => lesson(i + 1, `2026-10-${d}T15:00:00Z`, `Lekcja ${i + 1}`)),
      lesson(7, "2026-11-01T15:00:00Z", "Lekcja 7"),
    ];
    const data = {
      learner: OLA,
      weeks: [{ monday: "2026-10-26", lessons: 7, moved_up: 0, attention: null }],
      lessons,
    };
    draw(tool(1, { verb: "learner_week", view: { kind: "learner_week", data } }));
    expect(document.querySelectorAll("[data-week-lesson]")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Pokaż wszystkie (7)" }));
    expect(document.querySelectorAll("[data-week-lesson]")).toHaveLength(7);
    expect(document.querySelector("[data-show-all]")).toBeNull();
  });

  it("draws a malformed learner_week as the plain card", () => {
    const result = draw(
      tool(1, { verb: "learner_week", view: { kind: "learner_week", data: { weeks: 3 } } }),
    );
    expect(result?.kind).toBe("plain");
    expect(document.querySelector("[data-widget]")).toBeNull();
  });

  it("draws lesson_ideas in the frame, its list, why and skill count, and asks for one in the parent's words (dl-z5ja.129)", () => {
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
      learner: OLA,
      ideas: [
        idea("i1", "reteach", "needs_attention", ["math.add.within-10", "math.add.within-20"]),
        idea("i2", "new", "prerequisites_met", ["math.mul.equal-groups"]),
      ],
    };
    const result = draw(
      tool(1, { verb: "lesson_ideas", view: { kind: "lesson_ideas", data } }),
      "pl",
      (t) => sent.push(t),
    );
    expect(result?.kind === "widget" && result.keepVisible).toBe(true);
    const widget = screen.getByRole("region", { name: "Szukanie pomysłów na następną lekcję" });
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
    const empty = draw(
      tool(1, {
        verb: "lesson_ideas",
        view: { kind: "lesson_ideas", data: { learner: OLA, ideas: [] } },
      }),
    );
    const malformed = draw(
      tool(2, {
        verb: "lesson_ideas",
        view: { kind: "lesson_ideas", data: { learner: OLA, ideas: 3 } },
      }),
    );
    expect([empty?.kind, malformed?.kind]).toEqual(["widget", "plain"]);
    const widgets = screen.getAllByRole("region", { name: "Szukanie pomysłów na następną lekcję" });
    expect(widgets).toHaveLength(1);
    expect(widgets[0]?.textContent).toContain("Na razie nie ma pomysłów na następną lekcję.");
  });

  it("draws learner_mistakes in the frame in the parent's words, with the child's answers as text (dl-z5ja.129)", () => {
    const attempt = "att_00000000000000000000000001";
    const data = {
      learner: OLA,
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
    draw(tool(1, { verb: "learner_mistakes", view: { kind: "learner_mistakes", data } }));
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
    const empty = draw(
      tool(1, {
        verb: "learner_mistakes",
        view: { kind: "learner_mistakes", data: { learner: OLA, mistakes: [], questions: [] } },
      }),
    );
    const malformed = draw(
      tool(2, {
        verb: "learner_mistakes",
        view: { kind: "learner_mistakes", data: { learner: OLA, mistakes: "many" } },
      }),
    );
    expect([empty?.kind, malformed?.kind]).toEqual(["widget", "plain"]);
    const widgets = screen.getAllByRole("region", {
      name: "Czytanie, co sprawiło dziecku trudność",
    });
    expect(widgets).toHaveLength(1);
    expect(widgets[0]?.textContent).toContain("Ostatnio nic nie sprawiało trudności.");
  });
});
