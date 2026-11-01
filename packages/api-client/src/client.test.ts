import {
  AssignmentId,
  AttemptId,
  ConversationId,
  type ConversationMessage,
  EventId,
  GoalId,
  LearnerId,
  PodId,
  ROUTES,
  RunId,
} from "@jadwigo/contracts";
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

const planned = {
  position: 1,
  lesson_question_id: question.lesson_question_id,
  question_type: question.question_type,
  say: question.say,
  question: question.question,
};

const snapshot = {
  attempt,
  language: "pl",
  plan: [planned],
  questions: [question],
  open_seq: 1,
  last_event_id: null,
};

const finished = { ...attempt, status: "finished", finished_at: AT };

const reviewed = {
  seq: 1,
  added: "planned",
  ended: "correct",
  help_used: 0,
  question_type: question.question_type,
  say: question.say,
  question: question.question,
  answer: { entered: "10" },
  parts: null,
  solution: { entered: "10" },
  reveal: { why: "2 razy 5 to 5 + 5." },
};

interface Sent {
  url: string;
  method: string | undefined;
  body: unknown;
  authorization?: string;
}

const authorizationOf = (init?: RequestInit): string | undefined =>
  (init?.headers as Record<string, string> | undefined)?.["authorization"];

/** A fetch that records what was sent and answers with `status` and `json`. */
function stub(status: number, json: unknown): { fetch: typeof fetch; sent: Sent[] } {
  const sent: Sent[] = [];
  const fake = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const authorization = authorizationOf(init);
    sent.push({
      url: String(url),
      method: init?.method,
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      ...(authorization === undefined ? {} : { authorization }),
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
      subject: "math",
      grade: null,
      question_count: 4,
      first_say: "Ile to jest 2 razy 5?",
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

  it("reads a language's playground examples and parses them", async () => {
    const { fetch, sent } = stub(200, { examples: [], questions: [] });
    const reply = await createClient({ base: "", fetch }).playgroundExamples("en");
    expect(sent).toEqual([
      { url: "/api/v1/playground-examples/en", method: "GET", body: undefined },
    ]);
    expect(reply).toEqual({ examples: [], questions: [] });
  });

  it("refuses a playground reply that is not the contract's", async () => {
    const { fetch } = stub(200, { examples: [{ slug: "no-question" }], questions: [] });
    await expect(createClient({ base: "", fetch }).playgroundExamples("pl")).rejects.toThrow();
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

  it("reads a finished attempt's review at the route's path, with no token", async () => {
    const { fetch, sent } = stub(200, { attempt: finished, questions: [reviewed] });
    const review = await createClient({
      base: "",
      fetch,
      token: async () => "header.payload.signature",
    }).getReview(ATTEMPT);
    expect(sent).toEqual([
      { url: `/api/v1/attempts/${ATTEMPT}/review`, method: "GET", body: undefined },
    ]);
    expect(review.questions[0]?.solution).toEqual({ entered: "10" });
  });

  it("names AttemptNotFinished on a review asked too early, without the attempt id", async () => {
    const { fetch } = stub(409, {
      error: { type: "AttemptNotFinished", message: "this lesson is not finished yet" },
    });
    const error = await createClient({ base: "", fetch })
      .getReview(ATTEMPT)
      .catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 409, type: "AttemptNotFinished" });
    expect(String((error as Error).message)).not.toContain(ATTEMPT);
  });

  it("refuses a review with an open question, which a finished attempt never has", async () => {
    const { fetch } = stub(200, { attempt: finished, questions: [{ ...reviewed, ended: null }] });
    await expect(createClient({ base: "", fetch }).getReview(ATTEMPT)).rejects.toThrow();
  });

  it("refuses a reply its schema does not accept", async () => {
    const { fetch } = stub(200, { attempt, questions: "not a list" });
    await expect(createClient({ base: "", fetch }).getAttempt(ATTEMPT)).rejects.toThrow();
  });
});

describe("the parent's calls", () => {
  const LEARNER = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
  const claim = {
    attempt_id: ATTEMPT,
    learner_id: LEARNER,
    claimed_by: "acc_7qre3atahx8cpak6xbjtz73var",
    claimed_at: AT,
  };
  const signedIn = async (): Promise<string> => "header.payload.signature";

  it("sends the token on a token route, at the route's path", async () => {
    const { fetch, sent } = stub(201, claim);
    const reply = await createClient({ base: "", fetch, token: signedIn }).claimAttempt(ATTEMPT, {
      learner_id: LEARNER,
    });
    expect(sent).toEqual([
      {
        url: `/api/v1/attempts/${ATTEMPT}/claims`,
        method: "POST",
        body: { learner_id: LEARNER },
        authorization: "Bearer header.payload.signature",
      },
    ]);
    expect(reply.learner_id).toBe(LEARNER);
  });

  it("gives the pod's AI consent with a PATCH on the pod", async () => {
    const pod = PodId.parse(attempt.pod_id);
    const { fetch, sent } = stub(200, {
      id: pod,
      name: "home",
      language: "pl",
      created_at: AT,
      ai_consent_at: AT,
    });
    const reply = await createClient({ base: "", fetch, token: signedIn }).patchPod(pod, {
      ai_consented: true,
    });
    expect(sent).toMatchObject([
      { url: `/api/v1/pods/${pod}`, method: "PATCH", body: { ai_consented: true } },
    ]);
    expect(reply.ai_consent_at).toBe(AT);
  });

  it("refuses a token route as NotSignedIn when nobody is signed in, sending nothing", async () => {
    const { fetch, sent } = stub(200, {});
    const refused = await createClient({ base: "", fetch })
      .getMe()
      .catch((e: unknown) => e);
    expect(refused).toBeInstanceOf(ApiError);
    expect((refused as ApiError).type).toBe("NotSignedIn");
    expect(sent).toEqual([]);
  });

  it("reads the parent's review of an attempt with the token, every try included", async () => {
    const result = {
      pod_id: attempt.pod_id,
      attempt_id: ATTEMPT,
      seq: 1,
      lesson_question_id: question.lesson_question_id,
      added: "planned",
      placed: null,
      added_for: null,
      say: question.say,
      family: "enter",
      question_type: question.question_type,
      tries: 2,
      first_try_correct: false,
      correct: true,
      mistake_classes: ["add_for_multiply"],
      help_used: 0,
      skip_reason: null,
      time_ms: 5200,
      ended: "correct",
    };
    const tries = [
      { entered: "7", correct: false, mistake_class: "add_for_multiply", latency_ms: 3100 },
      { entered: "10", correct: true, mistake_class: null, latency_ms: 2100 },
    ].map(({ entered, ...rest }, i) => ({
      try_no: i + 1,
      kind: "try",
      value: { entered },
      parts: null,
      help_used: 0,
      skip_reason: null,
      ...rest,
    }));
    const { fetch, sent } = stub(200, {
      attempt: { ...finished, learner_id: LEARNER },
      title: "Mnożenie przez 5",
      language: "pl",
      questions: [{ ...reviewed, tries, result }],
    });
    const review = await createClient({ base: "", fetch, token: signedIn }).getParentReview(
      LEARNER,
      ATTEMPT,
    );
    expect(sent).toEqual([
      {
        url: `/api/v1/learners/${LEARNER}/attempts/${ATTEMPT}/review`,
        method: "GET",
        body: undefined,
        authorization: "Bearer header.payload.signature",
      },
    ]);
    expect(review.questions[0]?.tries.map((t) => t.mistake_class)).toEqual([
      "add_for_multiply",
      null,
    ]);
  });

  it("lists one assignment's attempts with their rows, on the token route", async () => {
    const result = {
      pod_id: attempt.pod_id,
      attempt_id: ATTEMPT,
      seq: 1,
      lesson_question_id: question.lesson_question_id,
      added: "planned",
      placed: null,
      added_for: null,
      say: question.say,
      family: "enter",
      question_type: question.question_type,
      tries: 1,
      first_try_correct: true,
      correct: true,
      mistake_classes: [],
      help_used: 0,
      skip_reason: null,
      time_ms: 2100,
      ended: "correct",
    };
    const { fetch, sent } = stub(200, {
      assignment: {
        id: ASSIGNMENT,
        pod_id: attempt.pod_id,
        lesson_id: "les_7qre3atahx8cpak6xbjtz73var",
        lesson_version_id: attempt.lesson_version_id,
        audience: "anyone",
        identity: "none",
        after_not_sure: "next",
        hold_verdicts: false,
        opens_at: null,
        closes_at: null,
        created_at: AT,
      },
      title: "Mnożenie przez 5",
      language: "pl",
      attempts: [
        { attempt: { ...finished, learner_id: LEARNER }, name: "Wren", results: [result] },
      ],
    });
    const overview = await createClient({ base: "", fetch, token: signedIn }).getAssignmentAttempts(
      ASSIGNMENT,
    );
    expect(sent).toEqual([
      {
        url: `/api/v1/assignments/${ASSIGNMENT}/attempts`,
        method: "GET",
        body: undefined,
        authorization: "Bearer header.payload.signature",
      },
    ]);
    expect(overview.attempts.map((a) => [a.name, a.results[0]?.ended])).toEqual([
      ["Wren", "correct"],
    ]);
  });

  it("never sends the token on a login-free route", async () => {
    const { fetch, sent } = stub(200, snapshot);
    await createClient({ base: "", fetch, token: signedIn }).getAttempt(ATTEMPT);
    expect(sent[0]?.authorization).toBeUndefined();
  });
});

describe("the learner knowledge calls", () => {
  const LEARNER = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
  const GOAL = GoalId.parse("gol_2h4m8gyw0fb1cvz2nkqw0px8fq");
  const signedIn = async (): Promise<string> => "header.payload.signature";
  it("patches a goal at the route's path with the token, and parses the goals", async () => {
    const { fetch, sent } = stub(200, { goals: [] });
    const reply = await createClient({ base: "", fetch, token: signedIn }).patchGoal(
      LEARNER,
      GOAL,
      { status: "paused" },
    );
    expect(sent).toEqual([
      {
        url: `/api/v1/learners/${LEARNER}/goals/${GOAL}`,
        method: "PATCH",
        body: { status: "paused" },
        authorization: "Bearer header.payload.signature",
      },
    ]);
    expect(reply.goals).toEqual([]);
  });

  it("makes a report with an empty body, and refuses a reply its schema does not accept", async () => {
    const { fetch, sent } = stub(201, { id: "rpt_x" });
    const refused = await createClient({ base: "", fetch, token: signedIn })
      .createReport(LEARNER)
      .catch((e: unknown) => e);
    expect(sent).toMatchObject([{ url: `/api/v1/learners/${LEARNER}/reports`, body: {} }]);
    expect(refused).not.toBeInstanceOf(ApiError);
    expect(refused).toBeInstanceOf(Error);
  });
});

describe("the conversation calls", () => {
  const CONVERSATION = ConversationId.parse("cnv_2h4m8gyw0fb1cvz2nkqw0px8fq");
  const RUN = RunId.parse("run_7qre3atahx8cpak6xbjtz73var");
  const EVENT = EventId.parse("0b1f4c2e-7d3a-4e5b-9c6d-1a2b3c4d5e6f");
  const signedIn = async (): Promise<string> => "header.payload.signature";
  const run = {
    id: RUN,
    pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
    created_by: "acc_7qre3atahx8cpak6xbjtz73var",
    conversation_id: CONVERSATION,
    workflow: "jadwigo-lesson-compose",
    resumes: null,
    status: "queued",
    attempt: 1,
    cancel_requested_at: null,
    idle_deadline_at: AT,
    max_deadline_at: AT,
    cap_usd: 1,
    spent_usd: 0,
    created_at: AT,
    completed_at: null,
  };

  it("sends a message with the token at the route's path, and parses the run", async () => {
    const { fetch, sent } = stub(201, { run });
    const reply = await createClient({ base: "", fetch, token: signedIn }).postMessage(
      CONVERSATION,
      { event_id: EVENT, text: "A lesson on adding to 10" },
    );
    expect(sent).toEqual([
      {
        url: `/api/v1/conversations/${CONVERSATION}/messages`,
        method: "POST",
        body: { event_id: EVENT, text: "A lesson on adding to 10" },
        authorization: "Bearer header.payload.signature",
      },
    ]);
    expect(reply.run.id).toBe(RUN);
  });

  it("sends a lesson-pane edit as a steer on the message route", async () => {
    const { fetch, sent } = stub(201, { run });
    const body: ConversationMessage = {
      event_id: EVENT,
      kind: "steer",
      source: "lesson_edit",
      question_ids: ["q2"],
      text: "Smaller numbers here",
    };
    await createClient({ base: "", fetch, token: signedIn }).postMessage(CONVERSATION, body);
    expect(sent).toMatchObject([
      { url: `/api/v1/conversations/${CONVERSATION}/messages`, method: "POST", body },
    ]);
  });

  it("puts the events cursor in the query string, and leaves it out when none is given", async () => {
    const { fetch, sent } = stub(200, { events: [] });
    const client = createClient({ base: "", fetch, token: signedIn });
    await client.listRunEvents(RUN, 7);
    await client.listRunEvents(RUN);
    expect(sent.map((s) => s.url)).toEqual([
      `/api/v1/runs/${RUN}/events?after=7`,
      `/api/v1/runs/${RUN}/events`,
    ]);
  });

  it("lists the conversations and archives one with a PATCH", async () => {
    const conversation = {
      id: ConversationId.parse("cnv_6et2fhbnwvb45aw9atcfzs33zd"),
      pod_id: attempt.pod_id,
      created_by: "acc_6et2fhbnwvb45aw9atcfzs33zb",
      title: null,
      created_at: AT,
      archived_at: null,
    };
    const listed = stub(200, { conversations: [conversation] });
    const reply = await createClient({
      base: "",
      fetch: listed.fetch,
      token: signedIn,
    }).listConversations();
    expect(listed.sent).toMatchObject([{ url: "/api/v1/conversations", method: "GET" }]);
    expect(reply.conversations.map((c) => c.id)).toEqual([conversation.id]);

    const archived = stub(200, { ...conversation, archived_at: AT });
    const done = await createClient({
      base: "",
      fetch: archived.fetch,
      token: signedIn,
    }).patchConversation(conversation.id, { archived: true });
    expect(archived.sent).toMatchObject([
      {
        url: `/api/v1/conversations/${conversation.id}`,
        method: "PATCH",
        body: { archived: true },
      },
    ]);
    expect(done.archived_at).toBe(AT);
  });

  it("asks a run to stop at its cancellations path", async () => {
    const { fetch, sent } = stub(201, { run: { ...run, cancel_requested_at: AT } });
    const reply = await createClient({ base: "", fetch, token: signedIn }).cancelRun(RUN, {
      event_id: EVENT,
    });
    expect(sent).toMatchObject([
      { url: `/api/v1/runs/${RUN}/cancellations`, method: "POST", body: { event_id: EVENT } },
    ]);
    expect(reply.run.cancel_requested_at).toBe(AT);
  });
});

describe("pathOf", () => {
  it("fills every param of a route's path", () => {
    expect(pathOf(ROUTES.help, { id: ATTEMPT, seq: 3 })).toBe(
      `/api/v1/attempts/${ATTEMPT}/questions/3/help`,
    );
  });
});
