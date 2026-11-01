import { describe, expect, it } from "vitest";
import { idOf } from "./ids.ts";
import { AttemptResult, ProposalId, ReportNarrative } from "./records.ts";
import { ROUTES } from "./routes.ts";
import {
  AccountCreate,
  AttemptAnswerRequest,
  AttemptClaim,
  GoalPatch,
  LearnerCreate,
  PageAttemptResult,
  ParentReviewQuestion,
  pageAttemptResult,
  pageEnded,
  ReportCreate,
  ReportPatch,
  ReviewQuestion,
  SentAt,
  verdictsHeld,
} from "./wire.ts";

const TRY = {
  event_id: "0190f3c4-5b6a-4c8d-9e0f-112233445566",
  seq: 1,
  try_no: 1,
  latency_ms: 1000,
  asked_at: "2026-09-01T08:00:00.000Z",
  answered_at: "2026-09-01T08:00:01.000Z",
  kind: "try",
  value: { entered: "6" },
};

const ROW = AttemptResult.parse({
  pod_id: idOf("pod_", "00000000-0000-4000-8000-00000000000a"),
  attempt_id: idOf("att_", "00000000-0000-4000-8000-0000000006a1"),
  seq: 1,
  lesson_question_id: idOf("lq_", "00000000-0000-4000-8000-0000000003a1"),
  added: "planned",
  placed: null,
  added_for: null,
  say: "How many apples?",
  family: "enter",
  question_type: "production",
  tries: 2,
  first_try_correct: false,
  correct: true,
  mistake_classes: ["value_off"],
  help_used: 1,
  skip_reason: null,
  time_ms: 4000,
  ended: "correct",
});

describe("the answer request's times", () => {
  it("takes a time with its offset, so a device on local time is not refused", () => {
    const local = {
      ...TRY,
      asked_at: "2026-09-01T10:00:00+02:00",
      answered_at: "2026-09-01T10:00:01+02:00",
    };
    expect(AttemptAnswerRequest.safeParse(local).success).toBe(true);
  });

  it("refuses a time finer than a millisecond, so both stores compare the same instants", () => {
    const fine = { ...TRY, asked_at: "2026-09-01T08:00:00.0005Z" };
    expect(AttemptAnswerRequest.safeParse(fine).success).toBe(false);
  });

  it("refuses a time outside the years 1 to 9999 in UTC", () => {
    for (const at of ["0000-01-01T00:00:00+14:00", "9999-12-31T23:59:59-12:00"]) {
      expect(SentAt.safeParse(at).success, at).toBe(false);
    }
    expect(SentAt.safeParse("9999-12-31T23:59:59Z").success).toBe(true);
  });

  it("refuses an answer given before its question was asked", () => {
    const early = { ...TRY, answered_at: "2026-09-01T07:59:59.000Z" };
    expect(AttemptAnswerRequest.safeParse(early).success).toBe(false);
  });
});

describe("held verdicts", () => {
  it("are held while the assignment holds them and the attempt is not finished", () => {
    expect(verdictsHeld({ hold_verdicts: true }, { status: "in_progress" })).toBe(true);
    expect(verdictsHeld({ hold_verdicts: true }, { status: "paused" })).toBe(true);
    expect(verdictsHeld({ hold_verdicts: true }, { status: "finished" })).toBe(false);
    expect(verdictsHeld({ hold_verdicts: false }, { status: "in_progress" })).toBe(false);
  });

  it("show an ended question as done, and an open one as open", () => {
    expect(pageEnded("correct", true)).toBe("done");
    expect(pageEnded("skipped", true)).toBe("done");
    expect(pageEnded("missed", true)).toBe("done");
    expect(pageEnded("missed", false)).toBe("missed");
    expect(pageEnded("correct", false)).toBe("correct");
    expect(pageEnded(null, true)).toBeNull();
  });
});

describe("the child's after-lesson list", () => {
  it("carries what was asked, how it ended and the help used: no score, no timer", () => {
    const row = pageAttemptResult(ROW, false);
    expect(PageAttemptResult.strict().parse(row)).toEqual({
      seq: 1,
      lesson_question_id: ROW.lesson_question_id,
      say: "How many apples?",
      added: "planned",
      ended: "correct",
      help_used: 1,
    });
    for (const field of ["tries", "first_try_correct", "correct", "mistake_classes", "time_ms"]) {
      expect(row, field).not.toHaveProperty(field);
    }
  });

  it("shows done while verdicts are held", () => {
    expect(pageAttemptResult(ROW, true).ended).toBe("done");
  });
});

describe("lesson review", () => {
  const REVIEWED = {
    seq: 1,
    added: "planned",
    ended: "missed",
    help_used: 0,
    question_type: "production",
    say: "How many apples?",
    question: { family: "enter", data: { input: "number", entry: "keypad" } },
    answer: { entered: "7" },
    parts: null,
    solution: { entered: "6" },
    reveal: {},
  };

  it("gives the child what was asked, the answer and the right one: no tries, time or class", () => {
    const fields = Object.keys(ReviewQuestion.shape);
    for (const field of ["tries", "latency_ms", "time_ms", "mistake_class", "result"]) {
      expect(fields, field).not.toContain(field);
    }
    expect(ReviewQuestion.parse(REVIEWED).solution).toEqual({ entered: "6" });
  });

  it("refuses an open question: a review is of a finished attempt", () => {
    expect(ReviewQuestion.safeParse({ ...REVIEWED, ended: null }).success).toBe(false);
    expect(ReviewQuestion.safeParse({ ...REVIEWED, ended: "done" }).success).toBe(false);
  });

  it("gives the parent every try with its time and mistake class, and the result row", () => {
    const parent = ParentReviewQuestion.parse({
      ...REVIEWED,
      tries: [
        {
          try_no: 1,
          kind: "try",
          value: { entered: "7" },
          correct: false,
          parts: null,
          mistake_class: "off_by_small",
          latency_ms: 4000,
          help_used: 0,
          skip_reason: null,
        },
      ],
      result: ROW,
    });
    expect(parent.tries[0]?.mistake_class).toBe("off_by_small");
    expect(parent.result.time_ms).toBe(ROW.time_ms);
  });

  it("reads a review only by GET, the child's open and the parent's behind a token", () => {
    expect(ROUTES.getReview).toMatchObject({ method: "GET", auth: "none", body: null });
    expect(ROUTES.getParentReview).toMatchObject({ method: "GET", auth: "token", body: null });
  });
});

describe("parent login", () => {
  it("needs a token on the 21 parent and conversation routes only; the login-free routes stay open", () => {
    const token = Object.entries(ROUTES)
      .filter(([, route]) => route.auth === "token")
      .map(([, route]) => `${route.method} ${route.path}`)
      .sort();
    expect(token).toEqual([
      "GET /api/v1/assignments/{id}/attempts",
      "GET /api/v1/conversations/{id}/runs",
      "GET /api/v1/learners/{id}/attempts",
      "GET /api/v1/learners/{id}/attempts/{attempt}/review",
      "GET /api/v1/learners/{id}/goals",
      "GET /api/v1/learners/{id}/reports",
      "GET /api/v1/learners/{id}/skills",
      "GET /api/v1/me",
      "GET /api/v1/runs/{id}/events",
      "GET /api/v1/skills",
      "PATCH /api/v1/learners/{id}/goals/{goal}",
      "PATCH /api/v1/learners/{id}/reports/{report}",
      "POST /api/v1/accounts",
      "POST /api/v1/attempts/{id}/claims",
      "POST /api/v1/conversations",
      "POST /api/v1/conversations/{id}/messages",
      "POST /api/v1/learners",
      "POST /api/v1/learners/{id}/goals",
      "POST /api/v1/learners/{id}/reports",
      "POST /api/v1/runs/{id}/cancellations",
      "POST /api/v1/runs/{id}/ratings",
    ]);
  });

  it("adds a child with a first name and up to 5 named goals, and refuses what the server owns", () => {
    const child = { first_name: " Ala ", age_group: "7-8", goals: [{ name: "Tables of 7" }] };
    expect(LearnerCreate.parse(child).first_name).toBe("Ala");
    expect(LearnerCreate.safeParse({ first_name: "Ala" }).success).toBe(true);
    for (const owned of ["handle", "pod_id", "id"]) {
      expect(LearnerCreate.safeParse({ ...child, [owned]: "x" }).success, owned).toBe(false);
    }
    expect(LearnerCreate.safeParse({ first_name: " " }).success).toBe(false);
    const six = Array.from({ length: 6 }, (_, i) => ({ name: `Goal ${i}` }));
    expect(LearnerCreate.safeParse({ first_name: "Ala", goals: six }).success).toBe(false);
    expect(
      LearnerCreate.safeParse({ first_name: "Ala", goals: [{ name: "x", skill_ids: [] }] }).success,
    ).toBe(false);
  });

  it("claims with a learner id only: the account is the token's, the attempt the path's", () => {
    const learner_id = idOf("lrn_", "00000000-0000-4000-8000-0000000001a1");
    expect(AttemptClaim.safeParse({ learner_id }).success).toBe(true);
    const account = idOf("acc_", "00000000-0000-4000-8000-0000000009a1");
    expect(AttemptClaim.safeParse({ learner_id, claimed_by: account }).success).toBe(false);
    expect(AttemptClaim.safeParse({ learner_id: account }).success).toBe(false);
  });

  it("makes an account from the page's language and nothing else", () => {
    expect(AccountCreate.safeParse({ language: "pl" }).success).toBe(true);
    expect(AccountCreate.safeParse({ language: "pl", sub: "x" }).success).toBe(false);
  });
});

describe("the learner knowledge base", () => {
  const narrative = {
    language: "pl",
    headline: "Tabliczka mnożenia przez 7 idzie dobrze.",
    direction_now: "Utrwalamy mnożenie przez 7.",
    answers: [
      {
        question: "next_focus",
        answer: "Mnożenie przez 7.",
        citations: [{ kind: "skill", skill_code: "maths.multiplication.row-7" }],
      },
    ],
    proposals: [],
    asks: [],
    made_by: "jadwigo-report-write",
  };

  it("patches a goal or a report only with at least one field, and refuses what the server owns", () => {
    expect(GoalPatch.safeParse({}).success).toBe(false);
    expect(GoalPatch.safeParse({ status: "paused" }).success).toBe(true);
    expect(GoalPatch.safeParse({ skill_codes: [] }).success).toBe(true);
    expect(GoalPatch.safeParse({ name: "x" }).success).toBe(false);
    expect(GoalPatch.safeParse({ status: "paused", pod_id: "x" }).success).toBe(false);
    expect(ReportPatch.safeParse({}).success).toBe(false);
    expect(ReportPatch.safeParse({ narrative }).success).toBe(true);
    const decision = { proposal_id: "p1", decision: "accepted" };
    expect(ReportPatch.safeParse({ decisions: [decision] }).success).toBe(true);
    expect(
      ReportPatch.safeParse({ decisions: [{ ...decision, decided_at: "2026-10-30T08:00:00Z" }] })
        .success,
    ).toBe(false);
    expect(ReportCreate.safeParse({ digest: {} }).success).toBe(false);
  });

  it("keeps a narrative short and cited, with at most 2 asks", () => {
    expect(ReportNarrative.safeParse(narrative).success).toBe(true);
    expect(ReportNarrative.safeParse({ ...narrative, headline: "x".repeat(141) }).success).toBe(
      false,
    );
    const uncited = [{ ...narrative.answers[0], citations: [] }];
    expect(ReportNarrative.safeParse({ ...narrative, answers: uncited }).success).toBe(false);
    const asks = Array.from({ length: 3 }, () => ({ ask: "?", why: "!" }));
    expect(ReportNarrative.safeParse({ ...narrative, asks }).success).toBe(false);
  });

  it("names a proposal p1 to p9", () => {
    expect(ProposalId.safeParse("p1").success).toBe(true);
    for (const id of ["p0", "p10", "P1", "1"])
      expect(ProposalId.safeParse(id).success, id).toBe(false);
  });
});
