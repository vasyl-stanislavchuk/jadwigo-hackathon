// dl-z5ja.99: every write-once insert on a table with both a primary key `id` and
// `unique (pod_id, id)` names no conflict target. With `on conflict (id)`, a racing insert can trip
// the (pod_id, id) key first, which the clause does not arbitrate, so Postgres raises instead of
// doing nothing and the request's unit aborts. 20 races of 3 racers each make it show.
import {
  AssignmentId,
  AttemptId,
  ID_PREFIXES,
  idOf,
  LessonId,
  LessonQuestionId,
  Uuid,
} from "@jadwigo/contracts";
import { ConversationId } from "@jadwigo/contracts/run";
import { afterAll, describe, expect, it } from "vitest";
import { databaseUrl } from "./config.ts";
import { createPostgresStore } from "./postgres.ts";
import { seed } from "./store.contract.ts";

const store = createPostgresStore(databaseUrl());
afterAll(() => store.close());

const RACES = 20;
const RACERS = 3;

/** Runs `write` RACERS times at once, RACES times over, and expects every racer to land the same row. */
async function race<T>(
  setup: () => Promise<() => Promise<T>>,
  key: (row: T) => unknown,
): Promise<void> {
  for (let i = 0; i < RACES; i++) {
    const write = await setup();
    const rows = await Promise.all(Array.from({ length: RACERS }, () => write()));
    expect(new Set(rows.map((row) => JSON.stringify(key(row)))).size).toBe(1);
  }
}

const fresh = () => crypto.randomUUID();

describe("PostgresStore's write-once inserts under a race (dl-z5ja.99)", () => {
  it("createConversation lands one conversation", async () => {
    await race(
      async () => {
        const member = await store.createAccount(Uuid.parse(fresh()), "pl");
        const id = ConversationId.parse(idOf(ID_PREFIXES.conversation, fresh()));
        return () =>
          store.createConversation(member.pod, { id, created_by: member.account, title: null });
      },
      (row) => row,
    );
  });

  it("putLesson lands one lesson", async () => {
    await race(
      async () => {
        const { pod } = await seed(store);
        const id = LessonId.parse(idOf(ID_PREFIXES.lesson, fresh()));
        return () =>
          store.putLesson(pod, {
            id,
            title: "Equal groups",
            language: "pl",
            category: "child",
            subject: "math",
            grade: 2,
            skill_ids: ["math.mul.equal-groups"],
          });
      },
      (row) => row,
    );
  });

  it("putLessonQuestion lands one question", async () => {
    await race(
      async () => {
        const { pod } = await seed(store);
        const id = LessonQuestionId.parse(idOf(ID_PREFIXES.lesson_question, fresh()));
        return () =>
          store.putLessonQuestion(pod, {
            id,
            subject: "math",
            grade: 2,
            skill_ids: ["math.mul.equal-groups"],
            credit: null,
            based_on: null,
            twin_of: null,
            family: "enter",
            question_type: "production",
            say: "How many apples?",
            data: { input: "number", entry: "keypad" },
            key: { accept: ["6"] },
            help: {},
            content_hash: `race-${id}`,
          });
      },
      (row) => row,
    );
  });

  it("putAssignment lands one assignment", async () => {
    await race(
      async () => {
        const { pod, lesson } = await seed(store);
        const id = AssignmentId.parse(idOf(ID_PREFIXES.assignment, fresh()));
        return () =>
          store.putAssignment(pod, { id, lesson_id: lesson, audience: "anyone", identity: "none" });
      },
      (row) => row,
    );
  });

  it("startAttempt lands one attempt", async () => {
    await race(
      async () => {
        const { pod, assignment } = await seed(store);
        const id = AttemptId.parse(idOf(ID_PREFIXES.attempt, fresh()));
        return () => store.startAttempt(pod, { id, assignment_id: assignment });
      },
      (row) => row.attempt.id,
    );
  });
});
