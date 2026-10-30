import { describe, expect, it } from "vitest";
import { catalogueSkill, goal, masteryRow } from "./golden.ts";
import { brief, canDoLines, goalStatus, goalView } from "./index.ts";

const NOW = new Date("2026-10-30T12:00:00.000Z");
const row7 = "maths.multiplication.row-7";
const row8 = "maths.multiplication.row-8";
const row9 = "maths.multiplication.row-9";
const row3 = "maths.multiplication.row-3";
const row2 = "maths.multiplication.row-2";
const row6 = "maths.multiplication.row-6";

const SKILLS = [
  catalogueSkill(row2),
  catalogueSkill(row3, { prerequisites: [row2] }),
  catalogueSkill(row6),
  catalogueSkill(row7),
  catalogueSkill(row8),
  catalogueSkill(row9, { prerequisites: [row3] }),
];

function listsOf(goals: Parameters<typeof brief>[0], mastery: Parameters<typeof brief>[2]) {
  return brief(goals, SKILLS, mastery, NOW).entries.map((e) => [e.list, e.skill_code, e.why]);
}

describe("brief, a golden case per list", () => {
  it("reteach: a flagged skill, whatever its level", () => {
    expect(
      listsOf([goal(1, [row7])], [masteryRow(row7, "familiar", { needs_attention: true })]),
    ).toEqual([["reteach", row7, "needs_attention"]]);
  });

  it("review: proficient or mastered with its review due by now, and not before", () => {
    const due = { due_at: "2026-10-30T12:00:00.000Z" };
    const later = { due_at: "2026-10-30T12:00:00.001Z" };
    expect(
      listsOf(
        [goal(1, [row6, row7, row8])],
        [
          masteryRow(row7, "proficient", due),
          masteryRow(row8, "mastered", due),
          masteryRow(row6, "mastered", later),
        ],
      ),
    ).toEqual([
      ["review", row7, "review_due"],
      ["review", row8, "review_due"],
    ]);
  });

  it("new: not started with every prerequisite familiar or better, walking prerequisites down", () => {
    expect(listsOf([goal(1, [row9])], [])).toEqual([["new", row2, "prerequisites_met"]]);
    expect(
      listsOf([goal(1, [row9])], [masteryRow(row2, "proficient"), masteryRow(row3, "familiar")]),
    ).toEqual([
      ["new", row9, "prerequisites_met"],
      ["recheck", row3, "second_day_owed"],
    ]);
  });

  it("recheck: familiar, its second day owed", () => {
    expect(listsOf([goal(1, [row7])], [masteryRow(row7, "familiar")])).toEqual([
      ["recheck", row7, "second_day_owed"],
    ]);
  });

  it("school: nothing recorded until a parent records what school covers", () => {
    expect(brief([goal(1, [row7])], SKILLS, [], NOW).school).toBe("nothing_recorded");
  });

  it("is one brief over all active goals: an entry names every goal it serves, paused goals add none", () => {
    const made = brief(
      [goal(1, [row9]), goal(2, [row3, row7]), goal(3, [row8], "paused")],
      SKILLS,
      [masteryRow(row2, "familiar"), masteryRow(row7, "attempted")],
      NOW,
    );
    expect(made.computed_at).toBe(NOW.toISOString());
    expect(made.entries.map((e) => [e.list, e.skill_code, e.goal_ids])).toEqual([
      ["new", row3, [goal(1, []).goal.id, goal(2, []).goal.id]],
      ["recheck", row2, [goal(1, []).goal.id, goal(2, []).goal.id]],
    ]);
  });
});

describe("goalStatus, a golden case per status", () => {
  const g = goal(1, [row7, row8]);
  it("not started: no judged try on any skill", () => {
    expect(goalStatus(g, [])).toBe("not_started");
    expect(goalStatus(g, [masteryRow(row7, "not_started")])).toBe("not_started");
    expect(goalStatus(goal(2, []), [])).toBe("not_started");
  });
  it("needs attention: any skill flagged, even when the rest are good", () => {
    expect(
      goalStatus(g, [
        masteryRow(row7, "mastered"),
        masteryRow(row8, "proficient", { needs_attention: true }),
      ]),
    ).toBe("needs_attention");
  });
  it("on its way: tried, not every skill proficient", () => {
    expect(goalStatus(g, [masteryRow(row7, "proficient"), masteryRow(row8, "familiar")])).toBe(
      "on_its_way",
    );
    expect(goalStatus(g, [masteryRow(row7, "attempted")])).toBe("on_its_way");
  });
  it("good: every skill proficient or better", () => {
    expect(goalStatus(g, [masteryRow(row7, "proficient"), masteryRow(row8, "mastered")])).toBe(
      "good",
    );
  });
});

describe("goalView", () => {
  it("sorts the goal's skills into can do now, needs attention and next", () => {
    const g = goal(1, [row7, row8, row9]);
    const mastery = [
      masteryRow(row7, "proficient"),
      masteryRow(row8, "familiar", { needs_attention: true }),
      masteryRow(row2, "familiar"),
      masteryRow(row3, "familiar"),
    ];
    const made = brief([g], SKILLS, mastery, NOW);
    expect(goalView(g, mastery, made)).toEqual({
      goal: g.goal,
      skill_codes: [row7, row8, row9],
      status: "needs_attention",
      can_do_now: [row7],
      needs_attention: [row8],
      next: [row9, row2, row3],
    });
  });
});

describe("canDoLines", () => {
  const skills = [
    catalogueSkill(row7, {
      can_do: {
        pl: { child: "Umiem mnożyć przez 7", parent: "Mnoży przez 7", reviewed: true },
        en: { child: "I can multiply by 7", parent: "Multiplies by 7", reviewed: false },
      },
    }),
    catalogueSkill(row8, {
      can_do: { pl: { child: "Umiem mnożyć przez 8", parent: "Mnoży przez 8", reviewed: true } },
    }),
  ];
  it("gives reviewed lines in the language asked, for skills at familiar or better only", () => {
    const mastery = [masteryRow(row8, "attempted"), masteryRow(row7, "familiar")];
    expect(canDoLines(mastery, skills, "pl")).toEqual([
      {
        skill_code: row7,
        line: { child: "Umiem mnożyć przez 7", parent: "Mnoży przez 7", reviewed: true },
      },
    ]);
    expect(canDoLines(mastery, skills, "en")).toEqual([]);
    expect(
      canDoLines([masteryRow(row8, "mastered")], skills, "pl").map((l) => l.skill_code),
    ).toEqual([row8]);
  });
});
