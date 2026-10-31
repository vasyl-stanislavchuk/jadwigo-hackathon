import {
  type AccountId,
  type AssignmentId,
  AttemptId,
  EventId,
  FEATURED_POD_ID,
  ID_PREFIXES,
  idOf,
  LearnerId,
  type LessonQuestionId,
  type PodId,
  type ReportDigest,
  type ReportNarrative,
  type SkillId,
  Uuid,
} from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import type { NewAttemptAnswer, NewLessonQuestion, NewSkill, Store } from "./store.ts";

/**
 * The learner knowledge base's part of the Store contract (wave 1 of epic dl-e8ov.5), run against
 * each store: InMemoryStore in `store.test.ts`, and PostgresStore once the store-api lane builds
 * its methods. Like `store.contract.ts`, each test seeds its own pods under fresh ids and fresh
 * skill codes, and never assumes the database is empty: the shared pod is a real one there.
 * Made-up content, no learner data.
 */
export function learnerKnowledgeContract(name: string, make: () => Promise<Store> | Store): void {
  describe(`${name} keeps the learner knowledge contract`, () => {
    it("finds the pod behind a learner, and nothing for an unknown id", async () => {
      const store = await make();
      const a = await family(store);

      expect(await store.findLearnerPod(a.learner)).toBe(a.pod);
      expect(
        await store.findLearnerPod(LearnerId.parse(idOf(ID_PREFIXES.learner, crypto.randomUUID()))),
      ).toBeUndefined();
    });

    it("lists the shared catalogue and the pod's own skills, never another pod's", async () => {
      const store = await make();
      const codes = freshCodes();
      await sharedSkills(store, [codes.shared, codes.overridden]);
      const a = await family(store);
      const b = await family(store);
      await store.putSkills(b.pod, [skill(codes.own, "draft")]);
      await store.putSkills(b.pod, [skill(codes.overridden, "draft")]);

      const forA = await store.listSkills(a.pod);
      const mine = forA.filter((s) => Object.values(codes).includes(s.code));
      expect(mine.map((s) => [s.code, s.pod_id])).toEqual(
        [
          [codes.overridden, FEATURED_POD_ID],
          [codes.shared, FEATURED_POD_ID],
        ].sort(),
      );
      const forB = (await store.listSkills(b.pod)).filter((s) =>
        Object.values(codes).includes(s.code),
      );
      expect(forB.map((s) => [s.code, s.pod_id, s.status])).toEqual(
        [
          [codes.own, b.pod, "draft"],
          [codes.overridden, b.pod, "draft"],
          [codes.shared, FEATURED_POD_ID, "reviewed"],
        ].sort(),
      );
      const codesOf = (rows: readonly { code: string }[]) => rows.map((s) => s.code);
      expect(codesOf(forA)).toEqual([...codesOf(forA)].sort());
    });

    it("copies a shared skill into a pod once, and makes an unknown code a draft", async () => {
      const store = await make();
      const codes = freshCodes();
      await sharedSkills(store, [codes.shared]);
      const a = await family(store);

      const first = await store.ensureSkills(a.pod, [codes.shared, codes.own]);
      expect(first.map((s) => [s.code, s.pod_id, s.status])).toEqual([
        [codes.shared, a.pod, "reviewed"],
        [codes.own, a.pod, "draft"],
      ]);
      expect(first[0]).toMatchObject({
        kind: "speed",
        can_do: CAN_DO,
        aliases: [],
        source: "bank",
      });
      const again = await store.ensureSkills(a.pod, [codes.own, codes.shared]);
      expect(again).toEqual([first[1], first[0]]);
      const listed = (await store.listSkills(a.pod)).filter((s) =>
        [codes.shared, codes.own].includes(s.code),
      );
      expect(listed.map((s) => s.pod_id)).toEqual([a.pod, a.pod]);
    });

    it("reads a learner's evidence: one row per answer and code, real and judged only, in order", async () => {
      const store = await make();
      const codes = freshCodes();
      const a = await family(store);
      const lesson = await lessonOf(store, a.pod, [[codes.shared, codes.own], [codes.overridden]]);

      // Seq 1 right on the first try, seq 2 skipped: 2 codes, then 1.
      const played = (await store.startAttempt(a.pod, { ...lesson.start, learner_id: a.learner }))
        .attempt.id;
      await store.appendAttemptAnswer(a.pod, tryAt(played, 1, 1, true, "08:00:01"), {
        end: "correct",
      });
      await store.askQuestion(a.pod, played, planned(lesson.questions[1]));
      await store.appendAttemptAnswer(a.pod, skipAt(played, 2, 1, "08:00:05"), { end: "skipped" });
      await store.finishAttempt(a.pod, played);
      // A try no judge marked, a preview attempt and an anonymous one give no evidence.
      const unmarked = (await store.startAttempt(a.pod, { ...lesson.start, learner_id: a.learner }))
        .attempt.id;
      await store.appendAttemptAnswer(a.pod, tryAt(unmarked, 1, 1, null, "08:01:00"));
      const preview = (
        await store.startAttempt(a.pod, { ...lesson.start, learner_id: a.learner, mode: "preview" })
      ).attempt.id;
      await store.appendAttemptAnswer(a.pod, tryAt(preview, 1, 1, true, "08:02:00"));
      const anonymous = (await store.startAttempt(a.pod, lesson.start)).attempt.id;
      await store.appendAttemptAnswer(a.pod, tryAt(anonymous, 1, 1, true, "08:03:00"));

      const evidence = await store.getLearnerEvidence(a.pod, a.learner);
      expect(
        evidence.map((e) => [e.attempt_id, e.seq, e.try_no, e.kind, e.skill_code, e.correct]),
      ).toEqual([
        [played, 1, 1, "try", [codes.shared, codes.own].sort()[0], true],
        [played, 1, 1, "try", [codes.shared, codes.own].sort()[1], true],
        [played, 2, 1, "skip", codes.overridden, null],
      ]);
      expect(evidence[0]).toMatchObject({
        pod_id: a.pod,
        learner_id: a.learner,
        answered_at: "2026-09-01T08:00:01.000Z",
        help_used: 0,
        latency_ms: 1000,
        mistake_class: null,
        added: "planned",
        lesson_kind: "practice",
        hold_verdicts: false,
      });
      const other = await family(store);
      await expect(store.getLearnerEvidence(other.pod, a.learner)).rejects.toMatchObject(NOT_FOUND);
    });

    it("reads a claimed attempt's evidence under the learner's pod, and a 3rd pod reads none", async () => {
      const store = await make();
      const codes = freshCodes();
      const played = await family(store);
      const lesson = await lessonOf(store, played.pod, [[codes.shared]], "none");
      const attempt = (await store.startAttempt(played.pod, lesson.start)).attempt.id;
      await store.appendAttemptAnswer(played.pod, tryAt(attempt, 1, 1, false, "08:00:01"));
      const claimer = await family(store);
      await store.claimAttempt(claimer.pod, {
        attempt,
        learner: claimer.learner,
        account: claimer.account,
      });

      const evidence = await store.getLearnerEvidence(claimer.pod, claimer.learner);
      expect(evidence.map((e) => [e.pod_id, e.learner_id, e.skill_code, e.correct])).toEqual([
        [played.pod, claimer.learner, codes.shared, false],
      ]);
      const third = await family(store);
      await expect(store.getLearnerEvidence(third.pod, claimer.learner)).rejects.toMatchObject(
        NOT_FOUND,
      );
    });

    it("replaces a learner's mastery rows whole and reads them by code", async () => {
      const store = await make();
      const codes = freshCodes();
      const a = await family(store);

      const written = await store.replaceMastery(a.pod, a.learner, [
        mastery(codes.shared, "familiar"),
        mastery(codes.own, "attempted"),
      ]);
      expect(written.map((m) => [m.skill_code, m.level, m.pod_id, m.learner_id])).toEqual(
        [
          [codes.shared, "familiar", a.pod, a.learner],
          [codes.own, "attempted", a.pod, a.learner],
        ].sort(),
      );
      expect(await store.getMastery(a.pod, a.learner)).toEqual(written);
      const replaced = await store.replaceMastery(a.pod, a.learner, [
        { ...mastery(codes.own, "proficient"), card: CARD, due_at: CARD.due },
      ]);
      expect(await store.getMastery(a.pod, a.learner)).toEqual(replaced);
      expect(replaced).toMatchObject([{ skill_code: codes.own, level: "proficient", card: CARD }]);
      const other = await family(store);
      await expect(store.getMastery(other.pod, a.learner)).rejects.toMatchObject(NOT_FOUND);
      await expect(store.replaceMastery(other.pod, a.learner, [])).rejects.toMatchObject(NOT_FOUND);
    });

    it("adds and changes a learner's goals, with their skills made sure of in the pod", async () => {
      const store = await make();
      const codes = freshCodes();
      await sharedSkills(store, [codes.shared]);
      const a = await family(store, ["Times tables"]);

      const me = await store.getMe(a.pod, a.account);
      expect(me.learners[0]?.goals).toMatchObject([
        { name: "Times tables", words: null, lesson_language: "pl", status: "active" },
      ]);
      const added = await store.addGoal(a.pod, a.learner, {
        name: "Row of 7",
        words: "She wants the 7s by Christmas.",
        skill_codes: [codes.shared, codes.own, codes.shared],
      });
      expect(added.goal).toMatchObject({
        name: "Row of 7",
        status: "active",
        learner_id: a.learner,
      });
      expect(added.skill_codes).toEqual([codes.shared, codes.own].sort());
      const pods = (await store.listSkills(a.pod))
        .filter((s) => added.skill_codes.includes(s.code))
        .map((s) => [s.code, s.pod_id, s.status]);
      expect(pods).toEqual(
        [
          [codes.shared, a.pod, "reviewed"],
          [codes.own, a.pod, "draft"],
        ].sort(),
      );

      const changed = await store.updateGoal(a.pod, a.learner, added.goal.id, {
        status: "paused",
        skill_codes: [codes.overridden],
      });
      expect(changed).toEqual({
        goal: { ...added.goal, status: "paused" },
        skill_codes: [codes.overridden],
      });
      const listed = await store.listGoals(a.pod, a.learner);
      expect(listed.map((g) => g.goal.name)).toEqual(["Times tables", "Row of 7"]);
      expect(listed[1]).toEqual(changed);

      const other = await family(store);
      await expect(store.listGoals(other.pod, a.learner)).rejects.toMatchObject(NOT_FOUND);
      await expect(
        store.updateGoal(other.pod, other.learner, added.goal.id, { status: "dropped" }),
      ).rejects.toMatchObject(NOT_FOUND);
      await expect(
        store.addGoal(other.pod, a.learner, { name: "x", skill_codes: [] }),
      ).rejects.toMatchObject(NOT_FOUND);
    });

    it("keeps reports newest first, a narrative written once, and decisions on known proposals", async () => {
      const store = await make();
      const a = await family(store);
      const older = await store.putReport(a.pod, report(a.learner));
      const newer = await store.putReport(a.pod, { ...report(a.learner), reused: true });
      expect(older).toMatchObject({ narrative: null, decisions: [], pod_id: a.pod });

      const listed = await store.listReports(a.pod, a.learner);
      expect(listed.map((r) => r.id)).toEqual([newer.id, older.id]);

      const written = await store.updateReport(a.pod, a.learner, newer.id, {
        narrative: NARRATIVE,
      });
      expect(written.narrative).toEqual(NARRATIVE);
      expect(
        await store.updateReport(a.pod, a.learner, newer.id, { narrative: NARRATIVE }),
      ).toEqual(written);
      await expect(
        store.updateReport(a.pod, a.learner, newer.id, {
          narrative: { ...NARRATIVE, headline: "Another headline." },
        }),
      ).rejects.toMatchObject({ type: "WriteOnce" });

      await expect(
        store.updateReport(a.pod, a.learner, newer.id, {
          decisions: [{ proposal_id: "p2", decision: "accepted", decided_by: a.account }],
        }),
      ).rejects.toMatchObject({ type: "BadRequest" });
      const decided = await store.updateReport(a.pod, a.learner, newer.id, {
        decisions: [{ proposal_id: "p1", decision: "dismissed", decided_by: a.account }],
      });
      const again = await store.updateReport(a.pod, a.learner, newer.id, {
        decisions: [{ proposal_id: "p1", decision: "accepted", decided_by: a.account }],
      });
      expect(decided.decisions).toHaveLength(1);
      expect(again.decisions.map((d) => [d.proposal_id, d.decision, d.decided_by])).toEqual([
        ["p1", "dismissed", a.account],
        ["p1", "accepted", a.account],
      ]);
      expect(again.narrative).toEqual(NARRATIVE);

      const other = await family(store);
      await expect(store.listReports(other.pod, a.learner)).rejects.toMatchObject(NOT_FOUND);
      await expect(
        store.updateReport(other.pod, other.learner, newer.id, { narrative: NARRATIVE }),
      ).rejects.toMatchObject(NOT_FOUND);
      await expect(store.putReport(other.pod, report(a.learner))).rejects.toMatchObject(NOT_FOUND);
    });

    it("writes a curriculum once per code and version, each pod its own", async () => {
      const store = await make();
      const a = await family(store);
      const b = await family(store);
      const curriculum = curriculumOf(crypto.randomUUID().slice(0, 8));

      const written = await store.putCurriculum(a.pod, curriculum);
      expect(written).toMatchObject({ ...curriculum, pod_id: a.pod });
      expect(await store.putCurriculum(a.pod, curriculum)).toEqual(written);
      const next = await store.putCurriculum(a.pod, { ...curriculum, version: "2024" });
      expect(next.id).not.toBe(written.id);
      const theirs = await store.putCurriculum(b.pod, curriculum);
      expect([theirs.pod_id, theirs.id === written.id]).toEqual([b.pod, false]);
    });

    it("writes a curriculum's topics once each, in order, and refuses another pod's curriculum", async () => {
      const store = await make();
      const a = await family(store);
      const curriculum = await store.putCurriculum(
        a.pod,
        curriculumOf(crypto.randomUUID().slice(0, 8)),
      );
      const topics = [
        {
          curriculum_id: curriculum.id,
          code: "II.3.3",
          area: "II.3",
          text: "Mnoży w zakresie 100.",
        },
        { curriculum_id: curriculum.id, code: "II.4.1", area: "II.4", text: "Mierzy długość." },
      ];

      const written = await store.putTopics(a.pod, topics);
      expect(written.map((t) => [t.code, t.pod_id, t.curriculum_id])).toEqual([
        ["II.3.3", a.pod, curriculum.id],
        ["II.4.1", a.pod, curriculum.id],
      ]);
      expect(
        await store.putTopics(
          a.pod,
          [topics[1], topics[0]].flatMap((t) => (t ? [t] : [])),
        ),
      ).toEqual([written[1], written[0]]);
      const other = await family(store);
      await expect(store.putTopics(other.pod, topics)).rejects.toMatchObject(NOT_FOUND);
    });

    it("holds a learner of the pod, and refuses another pod's", async () => {
      const store = await make();
      const a = await family(store);
      const other = await family(store);

      await expect(store.unit(() => store.lockLearner(a.pod, a.learner))).resolves.toBeUndefined();
      await expect(store.lockLearner(other.pod, a.learner)).rejects.toMatchObject(NOT_FOUND);
    });
  });
}

const NOT_FOUND = { type: "NotFound" };

/** A made-up curriculum under a code no other run holds. */
function curriculumOf(run: string) {
  return {
    code: `test-podstawa-${run}`,
    name: "Podstawa programowa, klasy 1-3",
    country: "PL",
    version: "2017",
    language: "pl" as const,
    source_url: null,
  };
}

const CAN_DO = {
  pl: { child: "Umiem mnożyć przez 7.", parent: "Mnoży przez 7.", reviewed: false },
};

const CARD = {
  state: 2,
  step: null,
  stability: 4.2,
  difficulty: 5.1,
  due: "2026-09-08T08:00:00.000Z",
  last_review: "2026-09-01T08:00:00.000Z",
};

/** Skill codes no other test or run holds. */
function freshCodes() {
  const run = crypto.randomUUID().slice(0, 8);
  return {
    shared: `test.lk${run}.shared`,
    own: `test.lk${run}.own`,
    overridden: `test.lk${run}.overridden`,
  } satisfies Record<string, SkillId>;
}

function skill(code: SkillId, status: NewSkill["status"]): NewSkill {
  return {
    code,
    topic_id: null,
    kind: status === "reviewed" ? "speed" : "accuracy",
    status,
    can_do: status === "reviewed" ? CAN_DO : null,
    aliases: [],
    prerequisites: [],
    source: status === "reviewed" ? "bank" : "pod",
  };
}

/** Reviewed skills in the shared pod, which is a real pod: putPod returns it when it is there. */
async function sharedSkills(store: Store, codes: readonly SkillId[]): Promise<void> {
  await store.putPod({ id: FEATURED_POD_ID, name: "Jadwigo", language: "pl" });
  await store.putSkills(
    FEATURED_POD_ID,
    codes.map((code) => skill(code, "reviewed")),
  );
}

/** A signed-in parent's pod, its account and one learner. */
async function family(
  store: Store,
  goals: string[] = [],
): Promise<{ pod: PodId; account: AccountId; learner: LearnerId }> {
  const { pod, account } = await store.createAccount(Uuid.parse(crypto.randomUUID()), "pl");
  const { learner } = await store.addLearner(pod, { first_name: "Fox", goals });
  return { pod, account, learner: learner.id };
}

/** A published lesson whose questions carry the skill codes given, and an assignment on it. */
async function lessonOf(
  store: Store,
  pod: PodId,
  skillSets: readonly SkillId[][],
  identity: "pick" | "none" = "pick",
): Promise<{
  questions: LessonQuestionId[];
  start: { readonly assignment_id: AssignmentId };
}> {
  const lesson = await store.putLesson(pod, {
    title: "Rows",
    language: "pl",
    category: "child",
    subject: "math",
    grade: 2,
    skill_ids: [],
  });
  const questions: LessonQuestionId[] = [];
  for (const [n, skill_ids] of skillSets.entries()) {
    const question: NewLessonQuestion = {
      family: "enter",
      question_type: "production",
      say: `How many apples in row ${n + 1}?`,
      data: { input: "number", entry: "keypad" },
      key: { accept: ["6"] },
      help: {},
      subject: "math",
      grade: 2,
      skill_ids: [...skill_ids],
      credit: null,
      based_on: null,
      twin_of: null,
      content_hash: `lk-${n}-${crypto.randomUUID()}`,
    };
    questions.push((await store.putLessonQuestion(pod, question)).id);
  }
  await store.publishLessonVersion(pod, {
    lesson_id: lesson.id,
    questions: questions.map((id) => ({ lesson_question_id: id, role: "planned" as const })),
  });
  const assignment = await store.putAssignment(pod, {
    audience: "anyone",
    identity,
    lesson_id: lesson.id,
  });
  return { questions, start: { assignment_id: assignment.id } };
}

function planned(id: LessonQuestionId | undefined) {
  if (id === undefined) throw new Error("the lesson has no such question");
  return { lesson_question_id: id, added: "planned", placed: null, added_for: null } as const;
}

const ANSWER = {
  latency_ms: 1000,
  asked_at: "2026-09-01T08:00:00.000Z",
  mistake_class: null,
  parts: null,
};

function tryAt(
  attempt: AttemptId,
  seq: number,
  try_no: number,
  correct: boolean | null,
  at: string,
): NewAttemptAnswer {
  return {
    ...ANSWER,
    event_id: EventId.parse(crypto.randomUUID()),
    attempt_id: attempt,
    seq,
    try_no,
    kind: "try",
    value: { entered: correct === false ? "7" : "6" },
    skip_reason: null,
    answered_at: `2026-09-01T${at}.000Z`,
    correct,
    judged_by: correct === null ? null : "enter@1",
    body_hash: `lk-${crypto.randomUUID()}`,
  };
}

function skipAt(attempt: AttemptId, seq: number, try_no: number, at: string): NewAttemptAnswer {
  return {
    ...ANSWER,
    event_id: EventId.parse(crypto.randomUUID()),
    attempt_id: attempt,
    seq,
    try_no,
    kind: "skip",
    value: null,
    skip_reason: "dont_know",
    answered_at: `2026-09-01T${at}.000Z`,
    correct: null,
    judged_by: null,
    body_hash: `lk-${crypto.randomUUID()}`,
  };
}

function mastery(skill_code: SkillId, level: "attempted" | "familiar" | "proficient") {
  return {
    skill_code,
    level,
    needs_attention: false,
    tries: 2,
    last_answered_at: "2026-09-01T08:00:01.000Z",
    due_at: null,
    card: null,
  };
}

const DIGEST: ReportDigest = {
  shape: "digest/1",
  counts: { attempts: 1, questions: 2, days_played: 1 },
  skills_moved: [
    {
      skill_code: "maths.multiplication.row-7",
      from: "attempted",
      to: "familiar",
      attempt_id: AttemptId.parse(
        idOf(ID_PREFIXES.attempt, "00000000-0000-4000-8000-0000000000a1"),
      ),
    },
  ],
  needs_attention: [],
  mistakes: [],
  brief: {
    computed_at: "2026-09-01T09:00:00.000Z",
    entries: [
      { skill_code: "maths.multiplication.row-7", list: "review", goal_ids: [], why: "review_due" },
    ],
    school: "nothing_recorded",
  },
  goals: [],
  standing: [{ question: "next_focus", verdict: "on_track", citations: [] }],
  proposals: [
    {
      id: "p1",
      kind: "focus",
      list: "review",
      skill_codes: ["maths.multiplication.row-7"],
      citations: [{ kind: "skill", skill_code: "maths.multiplication.row-7" }],
    },
  ],
  asks: [],
};

const NARRATIVE: ReportNarrative = {
  language: "pl",
  headline: "Mnożenie przez 7 idzie do przodu.",
  direction_now: "Powtarzamy mnożenie przez 7.",
  answers: [
    {
      question: "next_focus",
      answer: "Powtórka mnożenia przez 7.",
      citations: [{ kind: "skill", skill_code: "maths.multiplication.row-7" }],
    },
  ],
  proposals: [
    {
      proposal_id: "p1",
      claim: "Powtórzyć mnożenie przez 7.",
      rationale: "Poszło dobrze raz.",
      citations: [{ kind: "skill", skill_code: "maths.multiplication.row-7" }],
    },
  ],
  asks: [],
  made_by: "jadwigo-report-write",
};

function report(learner: LearnerId) {
  return {
    learner_id: learner,
    period_starts_at: "2026-09-01T00:00:00.000Z",
    period_ends_at: "2026-09-02T00:00:00.000Z",
    inputs_hash: `h-${crypto.randomUUID()}`,
    reused: false,
    digest: DIGEST,
  };
}
