// What the route tests drive the router with: a request as API Gateway (HTTP API, payload 2.0)
// sends it, and the reply's status and parsed body.
import { randomUUID } from "node:crypto";
import {
  type AttemptAnswerResult,
  type AttemptSnapshot,
  type LessonQuestion,
  type PageAttemptQuestion,
  ROUTES,
  type RouteName,
} from "@jadwigo/contracts";
import { solutionOf } from "@jadwigo/core";
import { importLessonFile } from "@jadwigo/lesson-import";
import type { NewAssignment, NewPod, Store } from "@jadwigo/store";
import { LESSON_FILES } from "@jadwigo/testing";
import { createApp } from "../app.ts";

/** A route's path with its parameters filled in. */
export function pathOf(name: RouteName, params: Record<string, string | number>): string {
  return ROUTES[name].path.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k]));
}

export interface Reply<T = unknown> {
  readonly status: number;
  readonly body: T;
}

type Call = <T = unknown>(method: string, path: string, body?: unknown) => Promise<Reply<T>>;

function client(store: Store): Call {
  const app = createApp(store);
  const context = {} as Parameters<typeof app.resolve>[1];
  return async <T>(method: string, path: string, body?: unknown): Promise<Reply<T>> => {
    const reply = (await app.resolve(
      {
        version: "2.0",
        routeKey: "$default",
        rawPath: path,
        rawQueryString: "",
        headers: { "content-type": "application/json" },
        requestContext: { http: { method, path }, stage: "$default" },
        body: body === undefined ? undefined : JSON.stringify(body),
        isBase64Encoded: false,
      },
      context,
    )) as { statusCode: number; body?: string };
    return { status: reply.statusCode, body: (reply.body ? JSON.parse(reply.body) : null) as T };
  };
}

/** The fixture lessons by file id, imported into a pod: the first is equal-groups (4 planned, 4 twins). */
const LESSONS = { equalGroups: 0, timesFour: 1 } as const;

export interface Seeded {
  readonly store: Store;
  readonly call: Call;
  /** An assignment of the lesson with these growth settings, in the pod the lesson was imported to. */
  assign(
    lesson: keyof typeof LESSONS,
    settings?: Partial<Pick<NewAssignment, "after_not_sure" | "hold_verdicts" | "audience">>,
    pod?: NewPod,
  ): Promise<string>;
  /** The lesson question behind a page question, key and all, for the test to answer it. */
  questionOf(page: PageAttemptQuestion): Promise<LessonQuestion>;
}

export function seeded(store: Store): Seeded {
  const call = client(store);
  const known = new Map<string, LessonQuestion>();
  return {
    store,
    call,
    async assign(lesson, settings = {}, pod) {
      const imported = await importLessonFile(store, LESSON_FILES[LESSONS[lesson]], pod);
      const version = await store.getLessonVersion(imported.lesson.pod_id, imported.version.id);
      for (const v of version.questions) known.set(v.lesson_question_id, v.question);
      const assignment = await store.putAssignment(imported.lesson.pod_id, {
        lesson_id: imported.lesson.id,
        audience: "anyone",
        identity: "none",
        ...settings,
      });
      return assignment.id;
    },
    async questionOf(page) {
      const found = known.get(page.lesson_question_id);
      if (found === undefined)
        throw new Error(`unknown lesson question ${page.lesson_question_id}`);
      return found;
    },
  };
}

/** A try at the page question: the key's own answer when `right`, else a value judged wrong. */
export async function tryAt(
  s: Seeded,
  attempt: string,
  page: PageAttemptQuestion,
  right: boolean,
  extra: Record<string, unknown> = {},
): Promise<Reply<AttemptAnswerResult>> {
  const question = await s.questionOf(page);
  const value = right ? solutionOf(question) : wrongValue(question);
  return s.call("POST", pathOf("answer", { id: attempt }), {
    ...answerFields(page),
    kind: "try",
    value,
    ...extra,
  });
}

export function skipAt(
  s: Seeded,
  attempt: string,
  page: PageAttemptQuestion,
  skip_reason: "dont_know" | "asked_to_skip" = "dont_know",
): Promise<Reply<AttemptAnswerResult>> {
  return s.call("POST", pathOf("answer", { id: attempt }), {
    ...answerFields(page),
    kind: "skip",
    skip_reason,
  });
}

export function answerFields(page: PageAttemptQuestion) {
  return {
    event_id: randomUUID(),
    seq: page.seq,
    try_no: page.tries + 1,
    latency_ms: 1200,
    asked_at: page.asked_at,
    answered_at: page.asked_at,
  };
}

function wrongValue(question: LessonQuestion): unknown {
  switch (question.family) {
    case "enter":
      return { entered: "9999" };
    case "choose": {
      const wrong = question.data.options.find((o) => !question.key.correct.includes(o.id));
      return { chosen: wrong ? [wrong.id] : [] };
    }
    case "sequence":
      return [...(solutionOf(question) as string[])].reverse();
    default:
      throw new Error(`no wrong value written for ${question.family}`);
  }
}

/** Starts an attempt and returns its id and snapshot. */
export async function start(
  s: Seeded,
  assignment: string,
  body: unknown = {},
): Promise<{ id: string; snapshot: AttemptSnapshot }> {
  const reply = await s.call<AttemptSnapshot>(
    "POST",
    pathOf("startAttempt", { id: assignment }),
    body,
  );
  if (reply.status !== 201) throw new Error(`start: ${reply.status} ${JSON.stringify(reply.body)}`);
  return { id: reply.body.attempt.id, snapshot: reply.body };
}

/** The open question of an attempt now. */
export async function openQuestion(s: Seeded, attempt: string): Promise<PageAttemptQuestion> {
  const { body } = await s.call<AttemptSnapshot>("GET", pathOf("getAttempt", { id: attempt }));
  const open = body.questions.find((q) => q.seq === body.open_seq);
  if (open === undefined) throw new Error(`attempt ${attempt} has no open question`);
  return open;
}
