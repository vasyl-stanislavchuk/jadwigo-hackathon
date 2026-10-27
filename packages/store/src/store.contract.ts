import {
  AttemptId,
  EventId,
  ID_PREFIXES,
  type IdPrefix,
  idOf,
  type LessonQuestionId,
  PodId,
} from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import type { NewAttemptAnswer, NewLessonQuestion, Store } from "./store.ts";

/**
 * The behaviour every `Store` has, run against each one: `InMemoryStore` in `store.test.ts`, and
 * the Postgres store against a shared database. So each test makes its own store, seeds its own
 * pods under fresh random ids, and never assumes the database is empty. The rules are the ones
 * `Store`'s doc comments and the migration state. Made-up content, no learner data.
 */
export function storeContract(name: string, make: () => Promise<Store> | Store): void {
  describe(`${name} keeps the Store contract`, () => {
    describe("pods", () => {
      it("reads a record in another pod as NotFound", async () => {
        const store = await make();
        const a = await seed(store);
        const b = await newPod(store, "Pod of owls");
        const { attempt } = await store.startAttempt(a.pod, { assignment_id: a.assignment });

        await expect(store.getLessonVersion(b, a.version)).rejects.toMatchObject(NOT_FOUND);
        await expect(
          store.publishLessonVersion(b, {
            lesson_id: a.lesson,
            questions: [{ lesson_question_id: a.apples, role: "planned" }],
          }),
        ).rejects.toMatchObject(NOT_FOUND);
        await expect(store.getAssignment(b, a.assignment)).rejects.toMatchObject(NOT_FOUND);
        await expect(store.startAttempt(b, { assignment_id: a.assignment })).rejects.toMatchObject(
          NOT_FOUND,
        );
        await expect(store.getAttempt(b, attempt.id)).rejects.toMatchObject(NOT_FOUND);
        await expect(
          store.appendAttemptAnswer(b, answer(attempt.id, 1, 1, { entered: "6" }, true)),
        ).rejects.toMatchObject(NOT_FOUND);
        await expect(store.releaseHelp(b, attempt.id, 1, 0)).rejects.toMatchObject(NOT_FOUND);
        await expect(store.getAttemptResult(b, attempt.id)).rejects.toMatchObject(NOT_FOUND);
      });

      it("finds the pod behind an assignment or an attempt, and nothing for an unknown id", async () => {
        const store = await make();
        const a = await seed(store);
        const { attempt } = await store.startAttempt(a.pod, { assignment_id: a.assignment });

        expect(await store.findAssignmentPod(a.assignment)).toBe(a.pod);
        expect(await store.findAttemptPod(attempt.id)).toBe(a.pod);
        expect(
          await store.findAttemptPod(AttemptId.parse(fresh(ID_PREFIXES.attempt))),
        ).toBeUndefined();
      });
    });

    describe("lesson questions", () => {
      it("are written once: the same hash returns the stored row, another is WriteOnce", async () => {
        const store = await make();
        const pod = await newPod(store, "Pod of foxes");
        const written = await store.putLessonQuestion(pod, apples());

        const again = await store.putLessonQuestion(pod, { ...apples(), id: written.id });
        expect(again).toEqual(written);
        await expect(
          store.putLessonQuestion(pod, {
            ...apples(),
            id: written.id,
            say: "How many plums?",
            content_hash: "h1-edited",
          }),
        ).rejects.toMatchObject({ type: "WriteOnce" });
      });
    });

    describe("publishing", () => {
      it("numbers versions 1 then 2, each revising the latest, and marks the lesson published", async () => {
        const store = await make();
        const a = await seed(store);
        const first = await store.getLessonVersion(a.pod, a.version);
        expect(first.version).toMatchObject({ lesson_id: a.lesson, version: 1, revises: null });
        expect(first.version.published_at).not.toBeNull();

        const second = await store.publishLessonVersion(a.pod, {
          lesson_id: a.lesson,
          questions: [{ lesson_question_id: a.groups, role: "planned" }],
        });
        expect(second).toMatchObject({ lesson_id: a.lesson, version: 2, revises: a.version });
        expect(await store.getLatestLessonVersion(a.pod, a.lesson)).toEqual(second);

        const lesson = await store.putLesson(a.pod, { ...LESSON, id: a.lesson });
        expect(lesson.status).toBe("published");
      });

      it("gives 2 publishes at once 2 numbers, or refuses one", async () => {
        const store = await make();
        const a = await seed(store);
        const publish = () =>
          store.publishLessonVersion(a.pod, {
            lesson_id: a.lesson,
            questions: [{ lesson_question_id: a.apples, role: "planned" }],
          });
        const settled = await Promise.allSettled([publish(), publish()]);
        const published = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));

        expect(published.length).toBeGreaterThan(0);
        expect(new Set(published.map((v) => v.version)).size).toBe(published.length);
        const latest = await store.getLatestLessonVersion(a.pod, a.lesson);
        expect(latest?.version).toBe(1 + published.length);
      });

      it("lists the questions from position 1 in the order given, each joined to its question", async () => {
        const store = await make();
        const a = await seed(store);
        const { questions } = await store.getLessonVersion(a.pod, a.version);

        expect(
          questions.map((q) => [q.position, q.role, q.lesson_question_id, q.question.id]),
        ).toEqual([
          [1, "planned", a.apples, a.apples],
          [2, "planned", a.groups, a.groups],
          [3, "spare", a.pears, a.pears],
        ]);
        expect(questions[0]?.question.say).toBe("How many apples?");
      });

      it("has no latest version before the first is published", async () => {
        const store = await make();
        const pod = await newPod(store, "Pod of foxes");
        const lesson = await store.putLesson(pod, LESSON);
        expect(await store.getLatestLessonVersion(pod, lesson.id)).toBeUndefined();
        expect(lesson.status).toBe("draft");
      });

      it("refuses a list with none planned, or a planned question after a spare", async () => {
        const store = await make();
        const a = await seed(store);
        const publish = (questions: { lesson_question_id: LessonQuestionId; role: Role }[]) =>
          store.publishLessonVersion(a.pod, { lesson_id: a.lesson, questions });

        await expect(publish([])).rejects.toMatchObject(BAD_REQUEST);
        await expect(
          publish([{ lesson_question_id: a.pears, role: "spare" }]),
        ).rejects.toMatchObject(BAD_REQUEST);
        await expect(
          publish([
            { lesson_question_id: a.apples, role: "planned" },
            { lesson_question_id: a.pears, role: "spare" },
            { lesson_question_id: a.groups, role: "planned" },
          ]),
        ).rejects.toMatchObject(BAD_REQUEST);
        expect((await store.getLatestLessonVersion(a.pod, a.lesson))?.version).toBe(1);
      });
    });

    describe("starting an attempt", () => {
      it("writes the attempt and asks position 1 as seq 1", async () => {
        const store = await make();
        const a = await seed(store);
        const record = await store.startAttempt(a.pod, {
          assignment_id: a.assignment,
          player_name: "Hedgehog",
        });

        expect(record.attempt).toMatchObject({
          pod_id: a.pod,
          assignment_id: a.assignment,
          lesson_version_id: a.version,
          learner_id: null,
          player_name: "Hedgehog",
          mode: "real",
          status: "in_progress",
          resume_at: null,
          finished_at: null,
        });
        expect(record.questions).toHaveLength(1);
        expect(record.questions[0]).toMatchObject({
          attempt_id: record.attempt.id,
          seq: 1,
          lesson_question_id: a.apples,
          added: "planned",
          placed: null,
          added_for: null,
          help_released: 0,
          ended: null,
        });
        expect(record.answers).toEqual([]);
        expect(await store.getAttempt(a.pod, record.attempt.id)).toEqual(record);
      });

      it("starts one attempt when the same id is started twice at once", async () => {
        const store = await make();
        const a = await seed(store);
        const id = AttemptId.parse(fresh(ID_PREFIXES.attempt));
        const start = (player_name: string) =>
          store.startAttempt(a.pod, { id, assignment_id: a.assignment, player_name });
        const settled = await Promise.allSettled([start("Hedgehog"), start("Badger")]);
        const started = settled.flatMap((s) => (s.status === "fulfilled" ? [s.value] : []));

        expect(started.length).toBeGreaterThan(0);
        const stored = await store.getAttempt(a.pod, id);
        expect(stored.questions).toHaveLength(1);
        for (const record of started) expect(record.attempt).toEqual(stored.attempt);
      });

      it("plays the assignment's own version, and otherwise the latest published", async () => {
        const store = await make();
        const a = await seed(store);
        const pinned = await store.putAssignment(a.pod, {
          ...ASSIGNMENT,
          lesson_id: a.lesson,
          lesson_version_id: a.version,
        });
        const second = await store.publishLessonVersion(a.pod, {
          lesson_id: a.lesson,
          questions: [{ lesson_question_id: a.groups, role: "planned" }],
        });

        const old = await store.startAttempt(a.pod, { assignment_id: pinned.id });
        expect(old.attempt.lesson_version_id).toBe(a.version);
        expect(old.questions[0]?.lesson_question_id).toBe(a.apples);
        const latest = await store.startAttempt(a.pod, { assignment_id: a.assignment });
        expect(latest.attempt.lesson_version_id).toBe(second.id);
        expect(latest.questions[0]?.lesson_question_id).toBe(a.groups);
      });

      it("is refused with AssignmentClosed before opens_at and from closes_at", async () => {
        const store = await make();
        const a = await seed(store);
        const window = async (opens: number, closes: number) =>
          (
            await store.putAssignment(a.pod, {
              ...ASSIGNMENT,
              lesson_id: a.lesson,
              opens_at: hoursFromNow(opens),
              closes_at: hoursFromNow(closes),
            })
          ).id;

        const closed = { type: "AssignmentClosed" };
        await expect(
          store.startAttempt(a.pod, { assignment_id: await window(-2, -1) }),
        ).rejects.toMatchObject(closed);
        await expect(
          store.startAttempt(a.pod, { assignment_id: await window(1, 2) }),
        ).rejects.toMatchObject(closed);
        const open = await store.startAttempt(a.pod, { assignment_id: await window(-1, 1) });
        expect(open.attempt.status).toBe("in_progress");
      });

      it("is NotFound when the lesson has no published version", async () => {
        const store = await make();
        const pod = await newPod(store, "Pod of foxes");
        const lesson = await store.putLesson(pod, LESSON);
        const assignment = await store.putAssignment(pod, { ...ASSIGNMENT, lesson_id: lesson.id });
        await expect(
          store.startAttempt(pod, { assignment_id: assignment.id }),
        ).rejects.toMatchObject(NOT_FOUND);
      });
    });

    describe("asking a question", () => {
      it("is refused with QuestionNotOpen while another is open, then takes the next seq", async () => {
        const store = await make();
        const { a, attempt } = await started(store);

        await expect(store.askQuestion(a.pod, attempt, twinOf1(a.pears))).rejects.toMatchObject(
          NOT_OPEN,
        );
        await store.endAttemptQuestion(a.pod, attempt, 1, "skipped");

        const twin = await store.askQuestion(a.pod, attempt, twinOf1(a.pears));
        expect(twin).toMatchObject({
          attempt_id: attempt,
          seq: 2,
          lesson_question_id: a.pears,
          added: "twin",
          placed: "now",
          added_for: 1,
          help_released: 0,
          ended: null,
        });
        await store.endAttemptQuestion(a.pod, attempt, 2, "correct");
        const next = await store.askQuestion(a.pod, attempt, planned(a.groups));
        expect(next.seq).toBe(3);
        const { questions } = await store.getAttempt(a.pod, attempt);
        expect(questions.map((q) => q.seq)).toEqual([1, 2, 3]);
      });

      it("is refused with AttemptFinished once the attempt is finished", async () => {
        const store = await make();
        const { a, attempt } = await started(store);
        await store.endAttemptQuestion(a.pod, attempt, 1, "correct");
        await store.finishAttempt(a.pod, attempt);
        await expect(store.askQuestion(a.pod, attempt, planned(a.groups))).rejects.toMatchObject({
          type: "AttemptFinished",
        });
      });
    });

    describe("answers", () => {
      it("are idempotent by event_id: a replay returns the stored row, another body is EventIdMismatch", async () => {
        const store = await make();
        const { a, attempt } = await started(store);
        const first = answer(attempt, 1, 1, { entered: "5" }, false, {
          mistake_class: "value_off",
        });

        const stored = await store.appendAttemptAnswer(a.pod, first);
        expect(stored.replayed).toBe(false);
        expect(stored.answer).toMatchObject({ ...first, pod_id: a.pod, help_used: 0 });
        expect(await store.appendAttemptAnswer(a.pod, first)).toEqual({
          answer: stored.answer,
          replayed: true,
        });
        await expect(
          store.appendAttemptAnswer(a.pod, {
            ...first,
            value: { entered: "7" },
            body_hash: "other",
          }),
        ).rejects.toMatchObject({ type: "EventIdMismatch" });
        expect((await store.getAttempt(a.pod, attempt)).answers).toEqual([stored.answer]);
      });

      it("refuse a 2nd event for a stored try with AnswerConflict, and a skipped try_no with TryOutOfOrder", async () => {
        const store = await make();
        const { a, attempt } = await started(store);
        await store.appendAttemptAnswer(a.pod, answer(attempt, 1, 1, { entered: "5" }, false));

        await expect(
          store.appendAttemptAnswer(a.pod, answer(attempt, 1, 1, { entered: "4" }, false)),
        ).rejects.toMatchObject({ type: "AnswerConflict" });
        await expect(
          store.appendAttemptAnswer(a.pod, answer(attempt, 1, 3, { entered: "4" }, false)),
        ).rejects.toMatchObject({ type: "TryOutOfOrder" });
        const second = await store.appendAttemptAnswer(
          a.pod,
          answer(attempt, 1, 2, { entered: "6" }, true),
        );
        expect(second.answer.try_no).toBe(2);
      });

      it("are refused with QuestionNotOpen once the question ended", async () => {
        const store = await make();
        const { a, attempt } = await started(store);
        await store.endAttemptQuestion(a.pod, attempt, 1, "skipped");
        await expect(
          store.appendAttemptAnswer(a.pod, answer(attempt, 1, 1, { entered: "6" }, true)),
        ).rejects.toMatchObject(NOT_OPEN);
      });

      it("are refused with AttemptPaused while paused, and accepted after resuming", async () => {
        const store = await make();
        const { a, attempt } = await started(store);
        await store.setAttemptStatus(a.pod, attempt, "paused", 1);
        const try1 = answer(attempt, 1, 1, { entered: "6" }, true);

        await expect(store.appendAttemptAnswer(a.pod, try1)).rejects.toMatchObject({
          type: "AttemptPaused",
        });
        await store.setAttemptStatus(a.pod, attempt, "in_progress");
        expect((await store.appendAttemptAnswer(a.pod, try1)).replayed).toBe(false);
      });

      it("are refused with AttemptFinished once the attempt is finished", async () => {
        const store = await make();
        const { a, attempt } = await started(store);
        await store.endAttemptQuestion(a.pod, attempt, 1, "skipped");
        await store.finishAttempt(a.pod, attempt);
        await expect(
          store.appendAttemptAnswer(a.pod, answer(attempt, 1, 1, { entered: "6" }, true)),
        ).rejects.toMatchObject({ type: "AttemptFinished" });
      });

      it("carry help_used copied from the question's help_released", async () => {
        const store = await make();
        const { a, attempt } = await started(store);
        await store.releaseHelp(a.pod, attempt, 1, 0);
        await store.releaseHelp(a.pod, attempt, 1, 1);
        const { answer: stored } = await store.appendAttemptAnswer(
          a.pod,
          answer(attempt, 1, 1, { entered: "6" }, true),
        );
        expect(stored.help_used).toBe(2);
      });
    });

    describe("help", () => {
      it("releases a rung only while seen is current, up to 4", async () => {
        const store = await make();
        const { a, attempt } = await started(store);

        const first = await store.releaseHelp(a.pod, attempt, 1, 0);
        expect(first.released).toBe(true);
        expect(first.question.help_released).toBe(1);
        const stale = await store.releaseHelp(a.pod, attempt, 1, 0);
        expect(stale).toEqual({ question: first.question, released: false });

        for (const seen of [1, 2, 3]) {
          expect((await store.releaseHelp(a.pod, attempt, 1, seen)).released).toBe(true);
        }
        const top = await store.releaseHelp(a.pod, attempt, 1, 4);
        expect(top.released).toBe(false);
        expect(top.question.help_released).toBe(4);
      });

      it("is refused with QuestionNotOpen once the question ended", async () => {
        const store = await make();
        const { a, attempt } = await started(store);
        await store.endAttemptQuestion(a.pod, attempt, 1, "correct");
        await expect(store.releaseHelp(a.pod, attempt, 1, 0)).rejects.toMatchObject(NOT_OPEN);
      });
    });

    describe("ending a question", () => {
      it("ends it once: the same way again returns it, another way is QuestionNotOpen", async () => {
        const store = await make();
        const { a, attempt } = await started(store);
        const ended = await store.endAttemptQuestion(a.pod, attempt, 1, "skipped");
        expect(ended).toMatchObject({ seq: 1, ended: "skipped" });

        expect(await store.endAttemptQuestion(a.pod, attempt, 1, "skipped")).toEqual(ended);
        await expect(store.endAttemptQuestion(a.pod, attempt, 1, "correct")).rejects.toMatchObject(
          NOT_OPEN,
        );
      });
    });

    describe("pause, resume and finish", () => {
      it("pauses with the seq to come back to, and resumes", async () => {
        const store = await make();
        const { a, attempt } = await started(store);

        const paused = await store.setAttemptStatus(a.pod, attempt, "paused", 1);
        expect(paused).toMatchObject({ status: "paused", resume_at: 1 });
        const resumed = await store.setAttemptStatus(a.pod, attempt, "in_progress");
        expect(resumed.status).toBe("in_progress");
        expect((await store.getAttempt(a.pod, attempt)).attempt).toEqual(resumed);
      });

      it("finishes only once no question is open, and then refuses changes with AttemptFinished", async () => {
        const store = await make();
        const { a, attempt } = await started(store);

        await expect(store.finishAttempt(a.pod, attempt)).rejects.toMatchObject(NOT_OPEN);
        await store.endAttemptQuestion(a.pod, attempt, 1, "correct");
        const finished = await store.finishAttempt(a.pod, attempt);
        expect(finished.status).toBe("finished");
        expect(finished.finished_at).not.toBeNull();

        const refused = { type: "AttemptFinished" };
        await expect(store.finishAttempt(a.pod, attempt)).rejects.toMatchObject(refused);
        await expect(store.setAttemptStatus(a.pod, attempt, "paused", 1)).rejects.toMatchObject(
          refused,
        );
      });
    });

    describe("the attempt result", () => {
      it("reads a miss then Not sure yet, its twin asked now, then a first-try correct", async () => {
        const store = await make();
        const { a, attempt } = await started(store);
        // The worked example of supabase/tests/attempt_result.test.sql, played through the store.
        await store.appendAttemptAnswer(
          a.pod,
          answer(attempt, 1, 1, { entered: "5" }, false, {
            latency_ms: 4000,
            mistake_class: "value_off",
          }),
        );
        await store.releaseHelp(a.pod, attempt, 1, 0);
        const skip = await store.appendAttemptAnswer(a.pod, {
          ...answer(attempt, 1, 2, null, null, { latency_ms: 2000, judged_by: null }),
          kind: "skip",
          skip_reason: "dont_know",
        });
        expect(skip.answer.help_used).toBe(1);
        await store.endAttemptQuestion(a.pod, attempt, 1, "skipped");
        await store.askQuestion(a.pod, attempt, twinOf1(a.pears));
        await store.appendAttemptAnswer(
          a.pod,
          answer(attempt, 2, 1, { entered: "8" }, true, { latency_ms: 3000 }),
        );
        await store.endAttemptQuestion(a.pod, attempt, 2, "correct");
        await store.askQuestion(a.pod, attempt, planned(a.groups));
        await store.appendAttemptAnswer(
          a.pod,
          answer(attempt, 3, 1, { chosen: ["a"] }, true, { latency_ms: 1500 }),
        );
        await store.endAttemptQuestion(a.pod, attempt, 3, "correct");

        const row = {
          pod_id: a.pod,
          attempt_id: attempt,
          family: "enter",
          question_type: "production",
        } as const;
        expect(await store.getAttemptResult(a.pod, attempt)).toEqual([
          {
            ...row,
            seq: 1,
            lesson_question_id: a.apples,
            added: "planned",
            placed: null,
            added_for: null,
            say: "How many apples?",
            tries: 1,
            first_try_correct: false,
            correct: false,
            mistake_classes: ["value_off"],
            help_used: 1,
            skip_reason: "dont_know",
            time_ms: 6000,
            ended: "skipped",
          },
          {
            ...row,
            seq: 2,
            lesson_question_id: a.pears,
            added: "twin",
            placed: "now",
            added_for: 1,
            say: "How many pears?",
            tries: 1,
            first_try_correct: true,
            correct: true,
            mistake_classes: [],
            help_used: 0,
            skip_reason: null,
            time_ms: 3000,
            ended: "correct",
          },
          {
            ...row,
            seq: 3,
            lesson_question_id: a.groups,
            added: "planned",
            placed: null,
            added_for: null,
            say: "Which picture shows 3 groups of 2?",
            family: "choose",
            question_type: "recognition",
            tries: 1,
            first_try_correct: true,
            correct: true,
            mistake_classes: [],
            help_used: 0,
            skip_reason: null,
            time_ms: 1500,
            ended: "correct",
          },
        ]);
      });

      it("has a row with no tries for a question just asked", async () => {
        const store = await make();
        const { a, attempt } = await started(store);
        expect(await store.getAttemptResult(a.pod, attempt)).toEqual([
          expect.objectContaining({
            seq: 1,
            tries: 0,
            first_try_correct: false,
            correct: false,
            mistake_classes: [],
            help_used: 0,
            skip_reason: null,
            time_ms: 0,
            ended: null,
          }),
        ]);
      });
    });
  });
}

// Fixtures: the shape of supabase/tests/_fixture.sql, under fresh ids every time.

type Role = "planned" | "spare";

const NOT_FOUND = { type: "NotFound" };
const BAD_REQUEST = { type: "BadRequest" };
const NOT_OPEN = { type: "QuestionNotOpen" };

const LESSON = {
  title: "Equal groups",
  language: "pl",
  category: "child",
  subject: "math",
  grade: 2,
  skill_ids: ["math.mul.equal-groups"],
} satisfies Parameters<Store["putLesson"]>[1];

const ASSIGNMENT = { audience: "anyone", identity: "none" } as const;

/** A wire id over a fresh v4 uuid, still to be parsed by its record's schema. */
function fresh(prefix: IdPrefix): string {
  return idOf(prefix, crypto.randomUUID());
}

function hoursFromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

const QUESTION = {
  subject: "math",
  grade: 2,
  skill_ids: ["math.mul.equal-groups"],
  credit: null,
  based_on: null,
  twin_of: null,
} satisfies Partial<NewLessonQuestion>;

function apples(): NewLessonQuestion {
  return {
    ...QUESTION,
    family: "enter",
    question_type: "production",
    say: "How many apples?",
    data: { input: "number", entry: "keypad" },
    key: { accept: ["6"] },
    help: { look: { text: "Count the groups." } },
    content_hash: "h1",
  };
}

async function newPod(store: Store, name: string): Promise<PodId> {
  return (await store.putPod({ id: PodId.parse(fresh(ID_PREFIXES.pod)), name, language: "pl" })).id;
}

/** A pod with 2 planned questions and the twin of the first as a spare, published, and assigned. */
async function seed(store: Store) {
  const pod = await newPod(store, "Pod of foxes");
  const lesson = (await store.putLesson(pod, LESSON)).id;
  const first = (await store.putLessonQuestion(pod, apples())).id;
  const groups = (
    await store.putLessonQuestion(pod, {
      ...QUESTION,
      family: "choose",
      question_type: "recognition",
      say: "Which picture shows 3 groups of 2?",
      data: {
        options: [{ id: "a", content: { kind: "text", text: "3 x 2" } }],
        select: "one",
        layout: "list",
      },
      key: { correct: ["a"] },
      help: {},
      content_hash: "h2",
    })
  ).id;
  const pears = (
    await store.putLessonQuestion(pod, {
      ...QUESTION,
      family: "enter",
      question_type: "production",
      say: "How many pears?",
      data: { input: "number", entry: "keypad" },
      key: { accept: ["8"] },
      help: {},
      twin_of: first,
      content_hash: "h3",
    })
  ).id;
  const version = (
    await store.publishLessonVersion(pod, {
      lesson_id: lesson,
      questions: [
        { lesson_question_id: first, role: "planned" },
        { lesson_question_id: groups, role: "planned" },
        { lesson_question_id: pears, role: "spare" },
      ],
    })
  ).id;
  const assignment = (
    await store.putAssignment(pod, {
      ...ASSIGNMENT,
      lesson_id: lesson,
      after_not_sure: "twin_now",
    })
  ).id;
  return { pod, lesson, apples: first, groups, pears, version, assignment };
}

async function started(store: Store) {
  const a = await seed(store);
  const { attempt } = await store.startAttempt(a.pod, { assignment_id: a.assignment });
  return { a, attempt: attempt.id };
}

function planned(id: LessonQuestionId) {
  return { lesson_question_id: id, added: "planned", placed: null, added_for: null } as const;
}

function twinOf1(id: LessonQuestionId) {
  return { lesson_question_id: id, added: "twin", placed: "now", added_for: 1 } as const;
}

/** A try as the caller judged it, under a fresh event id. */
function answer(
  attempt: AttemptId,
  seq: number,
  try_no: number,
  value: NewAttemptAnswer["value"],
  correct: boolean | null,
  more: Partial<NewAttemptAnswer> = {},
): NewAttemptAnswer {
  return {
    event_id: EventId.parse(crypto.randomUUID()),
    attempt_id: attempt,
    seq,
    try_no,
    kind: "try",
    value,
    skip_reason: null,
    latency_ms: 1000,
    asked_at: "2026-09-01T08:00:00.000Z",
    answered_at: "2026-09-01T08:00:01.000Z",
    correct,
    mistake_class: null,
    parts: null,
    judged_by: "enter@1",
    body_hash: `body-${seq}-${try_no}-${crypto.randomUUID()}`,
    ...more,
  };
}
