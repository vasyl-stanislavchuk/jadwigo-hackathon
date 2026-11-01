import { describe, expect, it } from "vitest";
import { ToolView, VerbName } from "./run.ts";
import { TOOL_VIEW_DATA, toolView, toolViewData } from "./tool-views.ts";

const FINDING = {
  step_id: "s01",
  path: "script.parts[0].steps[0].question.help.boost",
  level: "error",
  rule: "empty-rung",
  text: "the boost is empty",
  fix: "write the boost",
} as const;

const SET = {
  set_id: "add-10",
  title: "Adding within 10",
  grades: ["1"],
  skills: ["add-10"],
  questions: 6,
  why_found: "words: dodawanie",
};

describe("TOOL_VIEW_DATA", () => {
  it("has one schema for every verb, and none for a name that is not a verb", () => {
    expect(Object.keys(TOOL_VIEW_DATA).sort()).toEqual([...VerbName.options].sort());
  });

  it("reads each verb's view as the verb writes it", () => {
    expect(toolViewData("lesson_draft", { changed_step_ids: ["s01", "s02"] })).toEqual({
      changed_step_ids: ["s01", "s02"],
    });
    expect(toolViewData("lesson_edit", { changed_step_ids: [] })).toEqual({ changed_step_ids: [] });
    expect(toolViewData("lesson_show", { lesson: { id: "draft-1" } })).toEqual({
      lesson: { id: "draft-1" },
    });
    expect(toolViewData("lesson_check", { publishable: false, findings: [FINDING] })).toEqual({
      publishable: false,
      findings: [FINDING],
    });
    expect(toolViewData("question_search", { sets: [SET] })).toEqual({ sets: [SET] });
  });

  it("answers null for data that does not fit its verb, never half a view", () => {
    expect(toolViewData("lesson_check", { publishable: "yes", findings: [] })).toBeNull();
    expect(
      toolViewData("lesson_check", { publishable: true, findings: [{ ...FINDING, level: "x" }] }),
    ).toBeNull();
    expect(toolViewData("lesson_edit", { changed_step_ids: [3] })).toBeNull();
    expect(toolViewData("question_search", { sets: [{ set_id: "a" }] })).toBeNull();
    expect(toolViewData("lesson_show", null)).toBeNull();
  });

  it("builds a view that parses as ToolView, and throws on a shape that drifted", () => {
    const view = toolView("lesson_edit", { changed_step_ids: ["s03"] });
    expect(ToolView.parse(view)).toEqual({
      kind: "lesson_edit",
      data: { changed_step_ids: ["s03"] },
    });
    // A verb whose data drifted from its schema, past the type: the parse throws before a write.
    expect(() => toolView("lesson_check", { publishable: true } as never)).toThrow();
  });

  it("holds a learner view to its shape: at most 3 ideas, each cited, and no level field", () => {
    const learner = { id: "lrn_2h4m8gyw0fb1cvz2nkqw0px8fq", first_name: "Ola" };
    const idea = (n: number) => ({
      id: `i${n}`,
      list: "new",
      why: "prerequisites_met",
      skill_codes: ["math.add.within-10"],
      goal_ids: [],
      citations: [{ kind: "skill", skill_code: "math.add.within-10" }],
    });
    expect(
      toolViewData("lesson_ideas", { learner, ideas: [idea(1), idea(2), idea(3)] }),
    ).not.toBeNull();
    expect(toolViewData("lesson_ideas", { learner, ideas: [1, 2, 3, 3].map(idea) })).toBeNull();
    expect(
      toolViewData("lesson_ideas", { learner, ideas: [{ ...idea(1), citations: [] }] }),
    ).toBeNull();
    const week = { monday: "2026-11-02", lessons: 1, moved_up: 0, attention: null };
    const parsed = toolViewData("learner_week", {
      learner,
      weeks: [{ ...week, level: "mastered" }],
      lessons: [],
    });
    expect(parsed?.weeks).toEqual([week]);
  });
});
