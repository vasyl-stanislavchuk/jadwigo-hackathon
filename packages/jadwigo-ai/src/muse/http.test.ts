import { FIXED_NOW } from "@jadwigo/testing";
import { describe, expect, it } from "vitest";
import { requestFor, runId } from "../testing/context.ts";
import { MuseFailed, type MuseRequest } from "./client.ts";
import { GuardedMuse, InMemoryMuseLedger, laneBudget, MuseRefused } from "./guarded.ts";
import { CONTRIBUTOR_MODEL, HttpMuse, type HttpMuseOptions, type LiveText } from "./http.ts";
import {
  callAnswer,
  failedAnswer,
  type Reply,
  scriptedFetch,
  textAnswer,
} from "./recorded.test-helpers.ts";

const KEY = "test-key-not-a-real-one";
const PRIVATE_MODEL = "muse-private-test-model";
const PRICES = {
  [CONTRIBUTOR_MODEL]: { input: 0.1, cached: 0.002, output: 0.2 },
  [PRIVATE_MODEL]: { input: 0.3, cached: 0.01, output: 0.6 },
};
// 1000 fresh + 200 cached in, 300 out, at the contributor's price.
const TEXT_USD = Math.round(((1000 * 0.1 + 200 * 0.002 + 300 * 0.2) / 1e6) * 1e6) / 1e6;

function muse(replies: Reply[], overrides: Partial<HttpMuseOptions> = {}) {
  const { fetch, sent } = scriptedFetch(replies);
  const sleeps: number[] = [];
  const budgets: number[] = [];
  const live: LiveText[] = [];
  let clock = FIXED_NOW.getTime();
  const http = new HttpMuse({
    fetch,
    api_key: KEY,
    models: { contributor: CONTRIBUTOR_MODEL, private: PRIVATE_MODEL },
    prices: PRICES,
    budget: (_tag, pending) => {
      budgets.push(pending);
      return Promise.resolve();
    },
    sleep: (ms) => {
      sleeps.push(ms);
      return Promise.resolve();
    },
    // Each read of the clock moves it 100 ms, so batching by time is visible.
    now: () => {
      clock += 100;
      return new Date(clock);
    },
    live: (t) => live.push(t),
    ...overrides,
  });
  return { http, sent, sleeps, budgets, live };
}

function contributor(run = runId()): MuseRequest {
  return { ...requestFor(run, 1, "bank:explain"), tier: "contributor" };
}

describe("HttpMuse speaks /v1/responses", () => {
  it("sends the measured body, with the key only in the header", async () => {
    const { http, sent } = muse([{ status: 200, body: textAnswer(["Do", "dawanie", " do 20."]) }]);
    const run = runId();
    await http.respond({
      ...requestFor(run, 1),
      input: [
        { type: "message", role: "user", text: "Adding within 20." },
        { type: "function_call", call_id: "c1", verb: "lesson_draft", arguments: { topic: "add" } },
        { type: "function_call_output", call_id: "c1", output: { ok: true } },
      ],
      tools: [
        { name: "lesson_draft", description: "Drafts a lesson.", parameters: { type: "object" } },
      ],
    });
    const [call] = sent;
    expect(call?.url).toBe("https://api.meta.ai/v1/responses");
    expect(call?.headers).toEqual({
      authorization: `Bearer ${KEY}`,
      "content-type": "application/json",
      accept: "text/event-stream",
    });
    expect(call?.raw).not.toContain(KEY);
    expect(call?.body).toEqual({
      model: PRIVATE_MODEL,
      instructions: "Draft a lesson from the parent's words.",
      input: [
        { type: "message", role: "user", content: "Adding within 20." },
        {
          type: "function_call",
          call_id: "c1",
          name: "lesson_draft",
          arguments: '{"topic":"add"}',
        },
        { type: "function_call_output", call_id: "c1", output: '{"ok":true}' },
      ],
      tools: [
        {
          type: "function",
          name: "lesson_draft",
          description: "Drafts a lesson.",
          parameters: { type: "object" },
        },
      ],
      stream: true,
      store: false,
      prompt_cache_key: "jadwigo-lesson-compose:v1",
      reasoning: { effort: "low" },
      max_output_tokens: 4000,
    });
  });

  it("sends a message's image parts as they are, and guards only their words (dl-z5ja.11.4)", async () => {
    const IMAGE = "data:image/jpeg;base64,c3ludGhldGljIHdvcmtzaGVldA==";
    const parts = [
      { type: "input_text" as const, text: "Kasia sent this worksheet." },
      { type: "input_image" as const, image_url: IMAGE },
    ];
    const learner = muse([{ status: 200, body: textAnswer(["ok"]) }]);
    await learner.http.respond({
      ...requestFor(runId(), 1),
      input: [{ type: "message", role: "user", text: parts }],
    });
    expect(learner.sent[0]?.body["input"]).toEqual([
      { type: "message", role: "user", content: parts },
    ]);

    // A bank call passes the name guard: the words are guarded, the image is not touched.
    const bank = muse([{ status: 200, body: textAnswer(["ok"]) }]);
    await bank.http.respond({
      ...contributor(),
      names: ["Kasia"],
      input: [{ type: "message", role: "user", text: parts }],
    });
    expect(bank.sent[0]?.body["input"]).toEqual([
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: "[NAME_1] sent this worksheet." },
          { type: "input_image", image_url: IMAGE },
        ],
      },
    ]);
  });

  it("routes by tier: contributor to the contributor model, private to the private one", async () => {
    const { http, sent } = muse([
      { status: 200, body: textAnswer(["a"]) },
      { status: 200, body: textAnswer(["b"]) },
    ]);
    const answers = [await http.respond(contributor()), await http.respond(requestFor(runId(), 1))];
    expect(sent.map((s) => s.body["model"])).toEqual([CONTRIBUTOR_MODEL, PRIVATE_MODEL]);
    expect(answers.map((r) => r.tier)).toEqual(["contributor", "private"]);
  });

  it("reads the text, the usage and the cost from the stream, split at any byte", async () => {
    for (const chunk of [1, 3, 64, 10_000]) {
      const { http } = muse([{ status: 200, body: textAnswer(["Brawo", ", ", "ząbki!"]), chunk }]);
      const r = await http.respond(contributor());
      expect(r).toEqual({
        response_id: "resp_rec_1",
        model: CONTRIBUTOR_MODEL,
        tier: "contributor",
        text: "Brawo, ząbki!",
        tool_calls: [],
        usage: { input_tokens: 1200, output_tokens: 300, cached_tokens: 200 },
        cost_usd: TEXT_USD,
      });
    }
  });

  it("reads a function call as a verb with its arguments", async () => {
    const { http } = muse([
      { status: 200, body: callAnswer("lesson_draft", { topic: "dodawanie", grade: 1 }) },
    ]);
    const r = await http.respond(requestFor(runId(), 1));
    expect(r.text).toBeNull();
    expect(r.tool_calls).toEqual([
      { call_id: "call_rec_1", verb: "lesson_draft", input: { topic: "dodawanie", grade: 1 } },
    ]);
  });

  it("batches the text deltas for the live channel", async () => {
    const deltas = ["Do", "da", "wa", "nie", " do", " 20", "."];
    const { http, live } = muse([{ status: 200, body: textAnswer(deltas) }], { batch_ms: 250 });
    const run = runId();
    const r = await http.respond({ ...requestFor(run, 4) });
    expect(live.map((l) => l.text).join("")).toBe(r.text);
    expect(live.length).toBeGreaterThan(1);
    expect(live.length).toBeLessThan(deltas.length);
    expect(live.every((l) => l.run_id === run && l.call_no === 4)).toBe(true);
  });
});

describe("HttpMuse retries as jw.muse.ask does", () => {
  it("backs off 15 s on a 429 and 2 s on a 5xx, re-checking the budget each time", async () => {
    const { http, sleeps, budgets, sent } = muse([
      { status: 429, body: "Too Many Requests" },
      { status: 503, body: "unavailable" },
      { status: 200, body: textAnswer(["ok"]) },
    ]);
    const r = await http.respond(contributor());
    expect(r.text).toBe("ok");
    expect(sent).toHaveLength(3);
    expect(sleeps).toEqual([15_000, 4_000]);
    expect(budgets).toEqual([0, 0, 0]);
  });

  it("carries what a failed stream cost into the next budget check and the answer", async () => {
    const failedUsd = (1000 * 0.1) / 1e6;
    const { http, budgets } = muse([
      { status: 200, body: failedAnswer() },
      { status: 200, body: textAnswer(["ok"]) },
    ]);
    const r = await http.respond(contributor());
    expect(budgets).toEqual([0, failedUsd]);
    expect(r.cost_usd).toBeCloseTo(failedUsd + TEXT_USD, 9);
    expect(r.usage.input_tokens).toBe(2200);
  });

  it("stops after 3 attempts with MuseFailed and what they spent", async () => {
    const { http, sent, sleeps } = muse([
      { status: 200, body: failedAnswer() },
      new Error("socket hang up"),
      { status: 500, body: "boom" },
    ]);
    const error = await http.respond(contributor()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MuseFailed);
    expect(error).toMatchObject({ message: "http 500: boom", spent_usd: 0.0001 });
    expect(sent).toHaveLength(3);
    expect(sleeps).toEqual([2_000, 4_000]);
  });

  it("does not retry a request the endpoint refused", async () => {
    const { http, sent } = muse([
      { status: 400, body: "'stop_sequences' is not supported" },
      { status: 200, body: textAnswer(["never"]) },
    ]);
    await expect(http.respond(contributor())).rejects.toMatchObject({
      message: "http 400: 'stop_sequences' is not supported",
    });
    expect(sent).toHaveLength(1);
  });

  it("does not retry once text reached the live channel", async () => {
    const half = textAnswer(["Do", "da", "wa", "nie"]).split("event: response.completed")[0] ?? "";
    const { http, sent, live } = muse(
      [
        { status: 200, body: half },
        { status: 200, body: textAnswer(["again"]) },
      ],
      { batch_ms: 0 },
    );
    await expect(http.respond(contributor())).rejects.toBeInstanceOf(MuseFailed);
    expect(sent).toHaveLength(1);
    expect(live.map((l) => l.text).join("")).toBe("Dodawanie");
  });

  it("stops when the budget refuses a retry", async () => {
    let checks = 0;
    const { http, sent } = muse(
      [
        { status: 503, body: "x" },
        { status: 200, body: textAnswer(["y"]) },
      ],
      {
        budget: () =>
          checks++ === 0 ? Promise.resolve() : Promise.reject(new MuseRefused("budget", "cap")),
      },
    );
    await expect(http.respond(contributor())).rejects.toMatchObject({ type: "budget" });
    expect(sent).toHaveLength(1);
  });

  it("fails without retry when the model calls a tool that is not a verb, and keeps its cost", async () => {
    const { http, sent } = muse([
      { status: 200, body: callAnswer("rm_rf", {}) },
      { status: 200, body: textAnswer(["never"]) },
    ]);
    const error = await http.respond(contributor()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(MuseFailed);
    expect((error as MuseFailed).spent_usd).toBeGreaterThan(0);
    expect(sent).toHaveLength(1);
  });
});

describe("HttpMuse routes the private tier and refuses what it cannot cap", () => {
  it("serves a private-tier call on the contributor model while no private model is named", async () => {
    const { http, sent } = muse([{ status: 200, body: textAnswer(["x"]) }], {
      models: { contributor: CONTRIBUTOR_MODEL, private: null },
    });
    const r = await http.respond(requestFor(runId(), 1));
    expect(sent[0]?.body["model"]).toBe(CONTRIBUTOR_MODEL);
    expect(r.model).toBe(CONTRIBUTOR_MODEL);
    expect(r.tier).toBe("contributor"); // the tier that answered, not the one asked for
  });

  it("does not use a private model it has no price for", async () => {
    const { http, sent } = muse([{ status: 200, body: textAnswer(["x"]) }], {
      models: { contributor: CONTRIBUTOR_MODEL, private: "muse-unpriced" },
    });
    await http.respond(requestFor(runId(), 1));
    expect(sent[0]?.body["model"]).toBe(CONTRIBUTOR_MODEL);
  });

  it("names the tier a failed call went to (dl-z5ja.103)", async () => {
    const down = muse([{ status: 400, body: "no" }], {
      models: { contributor: CONTRIBUTOR_MODEL, private: "muse-unpriced" },
    });
    const downError = await down.http.respond(requestFor(runId(), 1)).catch((e: unknown) => e);
    expect(downError).toBeInstanceOf(MuseFailed);
    expect((downError as MuseFailed).tier).toBe("contributor");

    const kept = muse([{ status: 400, body: "no" }]);
    const keptError = await kept.http.respond(requestFor(runId(), 1)).catch((e: unknown) => e);
    expect(kept.sent[0]?.body["model"]).toBe(PRIVATE_MODEL);
    expect((keptError as MuseFailed).tier).toBe("private");
  });

  it("refuses a contributor model it has no price for, and an empty key", () => {
    const base = muse([]).http;
    expect(base).toBeInstanceOf(HttpMuse);
    expect(() => muse([], { prices: {} })).toThrow(/no price for muse-spark-1.3-contributor/);
    expect(() => muse([], { api_key: "" })).toThrow(/needs the Meta API key/);
  });
});

describe("GuardedMuse around HttpMuse", () => {
  it("writes one ledger row for an answer, and one for a call that failed after it spent", async () => {
    const ledger = new InMemoryMuseLedger();
    const { http } = muse(
      [
        { status: 200, body: textAnswer(["ok"]) },
        { status: 200, body: failedAnswer() },
        { status: 400, body: "no" },
      ],
      { budget: laneBudget(ledger, 1), attempts: 2 },
    );
    const guarded = new GuardedMuse(http, { ledger, lane_cap_usd: 1, now: () => FIXED_NOW });
    const run = runId();
    await guarded.respond(contributor(run));
    await expect(guarded.respond({ ...contributor(run), call_no: 2 })).rejects.toBeInstanceOf(
      MuseFailed,
    );
    expect(ledger.rows.map((r) => [r.run_id, r.call_no, r.response_id, r.cost_usd])).toEqual([
      [run, 1, "resp_rec_1", TEXT_USD],
      [run, 2, "", 0.0001],
    ]);
  });
});
