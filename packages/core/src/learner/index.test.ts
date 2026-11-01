import {
  AssignmentId,
  type AttemptAnswer,
  type AttemptId,
  type AttemptResult,
  type Brief,
  type BriefEntry,
  EventId,
  ID_PREFIXES,
  idOf,
  type LearnerAttempt,
  LearnerId,
  LearnerMistakesView,
  type LearnerReport,
  LearnerReportId,
  LessonIdeasView,
  LessonQuestionId,
  LessonVersionId,
  PodId,
} from "@jadwigo/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { catalogue } from "../curriculum/index.ts";
import { attempt, goal } from "../mastery/golden.ts";
import {
  answerText,
  curriculumTopics,
  learnerMistakes,
  learnerWeeks,
  lessonIdeas,
  MAX_IDEAS,
  mondayOf,
} from "./index.ts";

// Made-up learners, ids and times only. 2026-11-04 is a Wednesday; Warsaw is UTC+1 then.
const NOW = new Date("2026-11-04T12:00:00.000Z");
const POD = PodId.parse("pod_6et2fhbnwvb45aw9atcfzs33za");
const LEARNER = LearnerId.parse(idOf(ID_PREFIXES.learner, "0f0e0d0c-0b0a-4908-8706-050403020100"));
const uuid = (n: number) => `00000000-0000-4000-a000-${n.toString(16).padStart(12, "0")}`;

function entry(skill_code: string, list: BriefEntry["list"], goals: number[] = [1]): BriefEntry {
  const why = {
    reteach: "needs_attention",
    review: "review_due",
    new: "prerequisites_met",
    recheck: "second_day_owed",
    school: "school_tag",
  } as const;
  return {
    skill_code,
    list,
    goal_ids: goals.map((n) => goal(n, []).goal.id),
    why: why[list],
  };
}

function briefOf(entries: BriefEntry[]): Brief {
  return { computed_at: NOW.toISOString(), entries, school: "nothing_recorded" };
}

function result(seq: number, more: Partial<AttemptResult> = {}): AttemptResult {
  return {
    pod_id: POD,
    attempt_id: attempt(1),
    seq,
    lesson_question_id: LessonQuestionId.parse(idOf(ID_PREFIXES.lesson_question, uuid(seq))),
    added: "planned",
    placed: null,
    added_for: null,
    say: `Ile to jest ${seq} + 2?`,
    family: "enter",
    question_type: "production",
    tries: 1,
    first_try_correct: true,
    correct: true,
    mistake_classes: [],
    help_used: 0,
    skip_reason: null,
    time_ms: 4000,
    ended: "correct",
    ...more,
  };
}

function played(
  n: number,
  started_at: string,
  results: AttemptResult[],
  mode: "real" | "preview" = "real",
): LearnerAttempt {
  const id = attempt(n);
  return {
    attempt: {
      id,
      pod_id: POD,
      assignment_id: AssignmentId.parse(idOf(ID_PREFIXES.assignment, uuid(100 + n))),
      lesson_version_id: LessonVersionId.parse(idOf(ID_PREFIXES.lesson_version, uuid(200 + n))),
      learner_id: LEARNER,
      player_name: null,
      mode,
      status: "finished",
      resume_at: null,
      started_at,
      finished_at: started_at,
    },
    title: `Made-up lesson ${n}`,
    language: "pl",
    results: results.map((r) => ({ ...r, attempt_id: id })),
  };
}

function answer(
  attempt_id: AttemptId,
  seq: number,
  try_no: number,
  entered: string | null,
): AttemptAnswer {
  return {
    event_id: EventId.parse(uuid(1000 + seq * 10 + try_no)),
    pod_id: POD,
    attempt_id,
    seq,
    try_no,
    kind: entered === null ? "skip" : "try",
    value: entered === null ? null : { entered },
    skip_reason: entered === null ? "dont_know" : null,
    latency_ms: 3000,
    help_used: 0,
    asked_at: "2026-11-03T08:00:00.000Z",
    answered_at: "2026-11-03T08:00:03.000Z",
    correct: false,
    mistake_class: null,
    parts: null,
  } as AttemptAnswer;
}

function report(ends: string, more: Partial<LearnerReport["digest"]> = {}): LearnerReport {
  return {
    id: LearnerReportId.parse(idOf(ID_PREFIXES.learner_report, uuid(300))),
    pod_id: POD,
    learner_id: LEARNER,
    period_starts_at: "2026-10-01T00:00:00.000Z",
    period_ends_at: ends,
    inputs_hash: "made-up",
    reused: false,
    digest: {
      shape: "digest/1",
      counts: { attempts: 0, questions: 0, days_played: 0 },
      skills_moved: [],
      needs_attention: [],
      mistakes: [],
      brief: briefOf([]),
      goals: [],
      standing: [],
      proposals: [],
      asks: [],
      ...more,
    },
    narrative: null,
    decisions: [],
    created_at: ends,
  };
}

describe("lessonIdeas", () => {
  it("offers one idea per list, teach again first, each cited by skill and goal", () => {
    const ideas = lessonIdeas(
      briefOf([
        entry("maths.add.within-10", "reteach"),
        entry("maths.sub.within-10", "recheck", [2]),
        entry("maths.add.within-20", "new", [1, 2]),
      ]),
    );
    expect(ideas.map((i) => [i.id, i.list, i.why, i.skill_codes])).toEqual([
      ["i1", "reteach", "needs_attention", ["maths.add.within-10"]],
      ["i2", "recheck", "second_day_owed", ["maths.sub.within-10"]],
      ["i3", "new", "prerequisites_met", ["maths.add.within-20"]],
    ]);
    expect(ideas[2]?.citations).toEqual([
      { kind: "skill", skill_code: "maths.add.within-20" },
      { kind: "goal", goal_id: goal(1, []).goal.id },
      { kind: "goal", goal_id: goal(2, []).goal.id },
    ]);
  });

  it("gives one idea per goal of a list, splits a long run into 3s, and none for an empty brief", () => {
    const codes = ["a", "b", "c", "d", "e"].map((c) => `maths.new.${c}`);
    const ideas = lessonIdeas(briefOf(codes.map((c) => entry(c, "new"))));
    expect(ideas.map((i) => i.skill_codes)).toEqual([codes.slice(0, 3), codes.slice(3)]);
    const two = lessonIdeas(
      briefOf([entry(codes[0] ?? "", "new", [1]), entry(codes[1] ?? "", "new", [2])]),
    );
    expect(two.map((i) => [i.skill_codes, i.goal_ids])).toEqual([
      [[codes[0]], [goal(1, []).goal.id]],
      [[codes[1]], [goal(2, []).goal.id]],
    ]);
    expect(lessonIdeas(briefOf([]))).toEqual([]);
  });

  it("never offers more than 3, every one a valid view row from the brief's own entries", () => {
    const list = fc.constantFrom<BriefEntry["list"]>("reteach", "review", "new", "recheck");
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.tuple(fc.stringMatching(/^[a-z]{1,6}$/), list), {
          selector: ([code]) => code,
          maxLength: 20,
        }),
        (rows) => {
          const made = briefOf(rows.map(([code, l]) => entry(`maths.p.${code}`, l)));
          const ideas = lessonIdeas(made);
          expect(ideas.length).toBeLessThanOrEqual(MAX_IDEAS);
          LessonIdeasView.parse({ learner: { id: LEARNER, first_name: "Ola" }, ideas });
          for (const idea of ideas) {
            for (const code of idea.skill_codes) {
              expect(made.entries.find((e) => e.skill_code === code)?.list).toBe(idea.list);
            }
          }
          if (made.entries.length > 0) expect(ideas.length).toBeGreaterThan(0);
        },
      ),
    );
  });
});

describe("learnerWeeks", () => {
  it("counts the lessons, the skills moved up and the attention of each Warsaw week", () => {
    const attempts = [
      played(1, "2026-11-03T09:00:00.000Z", [result(1), result(2)]),
      played(2, "2026-10-27T09:00:00.000Z", [result(1)]),
      played(3, "2026-11-02T09:00:00.000Z", [result(1)], "preview"),
    ];
    const reports = [
      report("2026-11-03T20:00:00.000Z", {
        skills_moved: [
          { skill_code: "maths.add.a", from: "attempted", to: "familiar", attempt_id: attempt(1) },
          { skill_code: "maths.add.b", from: "familiar", to: "attempted", attempt_id: attempt(1) },
        ],
        needs_attention: [{ skill_code: "maths.add.b", mistake_classes: [], citations: [] }],
      }),
    ];
    const { weeks, lessons } = learnerWeeks(attempts, reports, NOW, 2);
    expect(weeks).toEqual([
      { monday: "2026-10-26", lessons: 1, moved_up: 0, attention: null },
      { monday: "2026-11-02", lessons: 1, moved_up: 1, attention: 1 },
    ]);
    expect(lessons.map((l) => [l.attempt_id, l.questions, l.finished])).toEqual([
      [attempt(1), 2, true],
      [attempt(2), 1, true],
    ]);
  });

  it("puts a Sunday evening in Warsaw in its own week, and the midnight after in the next", () => {
    expect(mondayOf("2026-11-01T22:30:00.000Z")).toBe("2026-10-26");
    expect(mondayOf("2026-11-01T23:00:00.000Z")).toBe("2026-11-02");
  });
});

describe("learnerMistakes", () => {
  it("lists the missed and skipped questions with the child's answers, and counts each class", () => {
    const first = played(1, "2026-11-03T09:00:00.000Z", [
      result(1),
      result(2, { first_try_correct: false, tries: 2, mistake_classes: ["off_by_one"] }),
      result(3, { skip_reason: "dont_know", ended: "skipped", correct: false }),
    ]);
    const second = played(2, "2026-11-02T09:00:00.000Z", [
      result(1, { first_try_correct: false, mistake_classes: ["off_by_one", "swapped"] }),
    ]);
    const answers = new Map([
      [
        attempt(1),
        [
          answer(attempt(1), 2, 2, "8"),
          answer(attempt(1), 2, 1, "7"),
          answer(attempt(1), 3, 1, null),
        ],
      ],
    ]);
    const { mistakes, questions } = learnerMistakes([first, second], answers, 10);
    expect(questions.map((q) => [q.attempt_id, q.seq, q.skipped, q.answers])).toEqual([
      [attempt(1), 2, false, ["7", "8"]],
      [attempt(1), 3, true, []],
      [attempt(2), 1, false, []],
    ]);
    expect(mistakes).toEqual([
      {
        mistake_class: "off_by_one",
        times: 2,
        citations: [
          { kind: "attempt", attempt_id: attempt(1) },
          { kind: "attempt", attempt_id: attempt(2) },
        ],
      },
      {
        mistake_class: "swapped",
        times: 1,
        citations: [{ kind: "attempt", attempt_id: attempt(2) }],
      },
    ]);
    expect(learnerMistakes([first, second], answers, 1).questions).toHaveLength(1);
    expect(learnerMistakes([first, second], answers, 1).mistakes).toEqual(mistakes);
  });

  it("leaves out a question the child never answered, and one whose try no judge could mark", () => {
    // The steward's input on #558: no try, not skipped.
    const unanswered = played(1, "2026-11-03T09:00:00.000Z", [
      result(1),
      result(2, { tries: 0, first_try_correct: false, correct: false, ended: null, time_ms: 0 }),
    ]);
    expect(learnerMistakes([unanswered], new Map([[attempt(1), []]]), 10).questions).toEqual([]);
    const unjudged = played(2, "2026-11-03T09:00:00.000Z", [
      result(1, { tries: 1, first_try_correct: false, correct: false, ended: null }),
    ]);
    expect(learnerMistakes([unjudged], new Map(), 10)).toEqual({ mistakes: [], questions: [] });
  });

  it("drops an empty mistake class, so the view still parses", () => {
    const blank = played(1, "2026-11-03T09:00:00.000Z", [
      result(1, {
        first_try_correct: false,
        mistake_classes: ["", " ", "swapped"],
        ended: "missed",
      }),
      result(2, { tries: 1, first_try_correct: true, mistake_classes: [""] }),
    ]);
    const { mistakes, questions } = learnerMistakes([blank], new Map(), 10);
    expect(questions.map((q) => [q.seq, q.mistake_classes])).toEqual([[1, ["swapped"]]]);
    expect(mistakes.map((m) => m.mistake_class)).toEqual(["swapped"]);
    const learner = { id: LEARNER, first_name: "Ola" };
    expect(() => LearnerMistakesView.parse({ learner, mistakes, questions })).not.toThrow();
  });

  it("words an answer as the child gave it", () => {
    expect(answerText({ entered: "12" })).toBe("12");
    expect(answerText({ text: "bo dodałam" })).toBe("bo dodałam");
    expect(answerText({ chosen: ["a", "c"] })).toBe("a, c");
  });
});

describe("curriculumTopics, by Polish word forms", () => {
  it("finds the addition topics from 'dodawanie' through 'dodawania' and 'dodaje'", () => {
    const seed = catalogue();
    const codes = curriculumTopics(seed, ["dodawanie"], []).map((t) => t.code);
    for (const t of seed.topics) {
      const has = /\bdoda\p{L}*/u.test(t.text.toLowerCase());
      expect(codes.includes(t.code), `${t.code}`).toBe(has);
    }
    expect(codes.length).toBeGreaterThan(0);
  });

  it("meets a code only as itself, and short words alone meet no topic", () => {
    const seed = catalogue();
    const one = seed.topics[0];
    if (one === undefined) throw new Error("the seed has topics");
    expect(curriculumTopics(seed, [one.code], []).map((t) => t.code)).toEqual([one.code]);
    expect(curriculumTopics(seed, ["i do"], [])).toEqual([]);
    expect(curriculumTopics(seed, ["", "  "], [])).toHaveLength(seed.topics.length);
  });
});

describe("curriculumTopics", () => {
  it("finds topics by their words, with their skills and the goals that hold one", () => {
    const seed = catalogue();
    const topic = seed.topics.find((t) => seed.skills.some((s) => s.topic_code === t.code));
    if (topic === undefined) throw new Error("the seed has a topic with a skill");
    const skill = seed.skills.find((s) => s.topic_code === topic.code);
    if (skill === undefined) throw new Error("unreachable");
    const rows = curriculumTopics(
      seed,
      [topic.code],
      [goal(1, [skill.code]), goal(2, ["maths.x.y"])],
    );
    const row = rows.find((r) => r.code === topic.code);
    expect(row?.skill_codes).toContain(skill.code);
    expect(row?.goal_ids).toEqual([goal(1, []).goal.id]);
    expect(curriculumTopics(seed, [], [])).toHaveLength(seed.topics.length);
    expect(curriculumTopics(seed, ["no-such-words-anywhere"], [])).toEqual([]);
  });
});
