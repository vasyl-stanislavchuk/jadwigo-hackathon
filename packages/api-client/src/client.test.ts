import { AssignmentId, AttemptId, EventId, ROUTES } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { ApiError, createClient, pathOf, TransientError } from "./client.ts";

const ASSIGNMENT = AssignmentId.parse("asg_0ectzj2evqb95a3v1v6wewjzy3");
const ATTEMPT = AttemptId.parse("att_43007b83dp9w2tnfjxhha74cyq");
const AT = "2026-10-28T14:02:06.274Z";

const attempt = {
  id: ATTEMPT,
  pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
  assignment_id: ASSIGNMENT,
  lesson_version_id: "lesv_7qre3atahx8cpak6xbjtz73var",
  learner_id: null,
  player_name: null,
  mode: "real",
  status: "in_progress",
  resume_at: null,
  started_at: AT,
  finished_at: null,
};

const question = {
  seq: 1,
  lesson_question_id: "lq_2h4m8gyw0fb1cvz2nkqw0px8fq",
  question_type: "production",
  say: "Ile to jest dwa razy pięć?",
  question: {
    family: "enter",
    data: { input: "number", entry: "keypad", figure: { kind: "expression", text: "2 × 5 = ?" } },
  },
  added: "planned",
  placed: null,
  added_for: null,
  help_released: 0,
  help: [],
  tries: 0,
  ended: null,
  asked_at: AT,
};

const snapshot = { attempt, questions: [question], open_seq: 1, last_event_id: null };

interface Sent {
  url: string;
  method: string | undefined;
  body: unknown;
}

/** A fetch that records what was sent and answers with `status` and `json`. */
function stub(status: number, json: unknown): { fetch: typeof fetch; sent: Sent[] } {
  const sent: Sent[] = [];
  const fake = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    sent.push({
      url: String(url),
      method: init?.method,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
    });
    return new Response(JSON.stringify(json), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
  return { fetch: fake as typeof fetch, sent };
}

describe("createClient", () => {
  it("starts an attempt at the route's path and parses the snapshot", async () => {
    const { fetch, sent } = stub(201, snapshot);
    const reply = await createClient({ base: "", fetch }).startAttempt(ASSIGNMENT);
    expect(sent).toEqual([
      { url: `/api/v1/assignments/${ASSIGNMENT}/attempts`, method: "POST", body: {} },
    ]);
    expect(reply.attempt.id).toBe(ATTEMPT);
    expect(reply.questions[0]?.seq).toBe(1);
  });

  it("reads the featured lessons from the route's path and parses the list", async () => {
    const lesson = {
      assignment_id: ASSIGNMENT,
      lesson_id: "les_2h4m8gyw0fb1cvz2nkqw0px8fq",
      title: "Równe grupy",
      language: "pl",
    };
    const { fetch, sent } = stub(200, { lessons: [lesson] });
    const reply = await createClient({ base: "", fetch }).featuredLessons();
    expect(sent).toEqual([{ url: ROUTES.featuredLessons.path, method: "GET", body: undefined }]);
    expect(reply.lessons).toEqual([lesson]);
  });

  it("refuses a featured list it cannot trust", async () => {
    const { fetch } = stub(200, { lessons: [{ title: "" }] });
    await expect(createClient({ base: "", fetch }).featuredLessons()).rejects.toThrow();
  });

  it("joins a base URL in front of the path", async () => {
    const { fetch, sent } = stub(200, snapshot);
    await createClient({ base: "http://127.0.0.1:8787/", fetch }).getAttempt(ATTEMPT);
    expect(sent[0]).toMatchObject({
      url: `http://127.0.0.1:8787/api/v1/attempts/${ATTEMPT}`,
      method: "GET",
      body: undefined,
    });
  });

  it("sends a try, a help request, a pause and a results read where the routes say", async () => {
    const answer = {
      event_id: "0b6f3c1e-8f7a-4c1d-9e2b-1a2b3c4d5e6f",
      seq: 1,
      try_no: 1,
      latency_ms: 800,
      asked_at: AT,
      answered_at: AT,
      kind: "try" as const,
      value: { entered: "10" },
    };
    const reply = {
      event_id: answer.event_id,
      seq: 1,
      try_no: 1,
      replayed: false,
      correct: true,
      parts: null,
      reveal: {},
      ended: "correct",
      next: null,
      attempt_status: "finished",
    };
    const sent: Sent[] = [];
    const replies = [
      reply,
      { seq: 1, help_released: 1, released: null, more: true, ended: null, next: null },
      { ...snapshot, attempt: { ...attempt, status: "paused" } },
      { attempt, results: [] },
    ];
    const fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      sent.push({
        url: String(url),
        method: init?.method,
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      });
      return new Response(JSON.stringify(replies.shift()), { status: 200 });
    }) as typeof globalThis.fetch;
    const client = createClient({ base: "", fetch });
    await client.answer(ATTEMPT, { ...answer, event_id: EventId.parse(answer.event_id) });
    await client.help(ATTEMPT, 1, { help_released: 0 });
    await client.patchAttempt(ATTEMPT, { status: "paused" });
    await client.getResults(ATTEMPT);
    expect(sent.map((s) => `${s.method} ${s.url}`)).toEqual([
      `POST /api/v1/attempts/${ATTEMPT}/answers`,
      `POST /api/v1/attempts/${ATTEMPT}/questions/1/help`,
      `PATCH /api/v1/attempts/${ATTEMPT}`,
      `GET /api/v1/attempts/${ATTEMPT}/results`,
    ]);
    expect(sent[0]?.body).toEqual(answer);
    expect(sent[1]?.body).toEqual({ help_released: 0 });
    expect(sent[2]?.body).toEqual({ status: "paused" });
  });

  it("names the server's error type on a refusal, and never the attempt id", async () => {
    const { fetch } = stub(409, {
      error: { type: "AttemptPaused", message: "this attempt is paused" },
    });
    const error = await createClient({ base: "", fetch })
      .getAttempt(ATTEMPT)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, type: "AttemptPaused" });
    expect(String((error as Error).message)).not.toContain(ATTEMPT);
  });

  it("reads a 404 with no envelope as a refusal with no type", async () => {
    const { fetch } = stub(404, "not json at all");
    const error = await createClient({ base: "", fetch })
      .getResults(ATTEMPT)
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 404, type: null });
    expect(String((error as Error).message)).not.toContain(ATTEMPT);
  });

  it("calls a 5xx and a dropped connection transient, without the attempt id", async () => {
    const down = stub(503, {});
    const fivexx = await createClient({ base: "", fetch: down.fetch })
      .getAttempt(ATTEMPT)
      .catch((e: unknown) => e);
    expect(fivexx).toBeInstanceOf(TransientError);
    const offline = (async () => {
      throw new TypeError("Failed to fetch");
    }) as typeof fetch;
    const dropped = await createClient({ base: "", fetch: offline })
      .getAttempt(ATTEMPT)
      .catch((e: unknown) => e);
    expect(dropped).toBeInstanceOf(TransientError);
    expect(String((dropped as Error).message)).not.toContain(ATTEMPT);
  });

  it("refuses a reply its schema does not accept", async () => {
    const { fetch } = stub(200, { attempt, questions: "not a list" });
    await expect(createClient({ base: "", fetch }).getAttempt(ATTEMPT)).rejects.toThrow();
  });
});

describe("pathOf", () => {
  it("fills every param of a route's path", () => {
    expect(pathOf(ROUTES.help, { id: ATTEMPT, seq: 3 })).toBe(
      `/api/v1/attempts/${ATTEMPT}/questions/3/help`,
    );
  });
});
