import type { InvokeCommand } from "@aws-sdk/client-lambda";
import {
  ERROR_STATUS,
  type ErrorEnvelope,
  ErrorType,
  ROUTES,
  SearchEnvelope,
} from "@jadwigo/contracts";
import { InMemoryStore } from "@jadwigo/store";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import { type BankDeps, type BankInvokeReply, lambdaBank } from "./questions.ts";

/**
 * The fixture envelope from david-learns `tests/fixtures/bank/envelope.json` at commit `dc8412cd`,
 * the one its bank client and packages/contracts are tested against. Copied, not read, so this
 * test runs where only this repo is checked out.
 */
const ENVELOPE = {
  version: 1,
  need: { words: "dodawanie do 100", language: "pl", grade: "3", limit: 20 },
  arm: "B1",
  stage: "final",
  timing_ms: { embed: 41.2, vectors: 18.5, rows: 6.1, keyword: 9.4, rerank: 212.0, total: 290.3 },
  cache: "miss",
  rows: [
    {
      id: "set_khan_xd4e5f6",
      rank: 1,
      score: 0.912,
      arm: "B1",
      vector_score: 0.781,
      bm25_score: 7.42,
      rerank_score: 0.912,
      best_view: "meaning_pl",
      view_scores: { title: 0.702, meaning_pl: 0.781, meaning_en: 0.744 },
      grade: "2",
      titles: { pl: "Dodawanie w zakresie 100", en: "Add within 100" },
      languages: ["pl", "en"],
      skill_ids: ["maths.add.within100"],
      curriculum_tags: ["pl-2017:II.3.2", "ccss:2.NBT.B.5"],
      problem_types: ["add-two-digit"],
      question_types: ["numeric-input"],
      views: ["title", "samples", "meaning_pl", "meaning_en", "needs"],
      source: "khan",
      credit:
        "Khan Academy, CC BY-NC-SA 4.0, https://www.khanacademy.org/math/cc-2nd-grade-math/x3184e0ec:add-and-subtract-within-100/e/adding-within-100",
      enrichment: {
        summary: "Two-digit addition within 100, with and without regrouping.",
        can_do: "I can add two numbers within 100.",
        mistake_classes: ["regrouping"],
        contexts: ["shopping"],
      },
      content_hash: "3f1c8a0e5b7d2f94c6a1e0b8d7f3a2c95e4b6d1a0f8c7e2b9d3a5f6c1e0b7d48",
      media: [],
      items: 12,
    },
    {
      id: "set_khan_xj1k2l3",
      rank: 2,
      score: 0.734,
      arm: "B1",
      vector_score: 0.702,
      bm25_score: null,
      rerank_score: 0.734,
      best_view: "meaning_en",
      view_scores: { title: 0.655, meaning_en: 0.702 },
      grade: "3",
      titles: { en: "Add and subtract within 1000" },
      languages: ["en"],
      skill_ids: ["maths.add.within1000"],
      curriculum_tags: ["ccss:3.NBT.A.2"],
      problem_types: ["add-three-digit"],
      question_types: ["numeric-input"],
      views: ["title", "samples", "meaning_en", "needs"],
      source: "khan",
      credit:
        "Khan Academy, CC BY-NC-SA 4.0, https://www.khanacademy.org/math/cc-third-grade-math/addition-and-subtraction-3/e/add-within-1000",
      content_hash: "a9e2d47b1c0f6e8d3b5a7c2e9f1d4b6a8c0e3f5d7b9a1c2e4f6d8b0a3c5e7f91",
      media: [],
      items: 10,
    },
  ],
  state: [
    { arm: "A", state: "not_asked" },
    { arm: "A1", state: "not_asked" },
    { arm: "B", state: "not_asked" },
    { arm: "B1", state: "ok" },
    { arm: "C", state: "not_asked" },
    { arm: "C2", state: "not_asked" },
  ],
};

const TOKEN = "read-token-for-tests";
const NEED = { words: "dodawanie do 100", language: "pl", grade: "3", limit: 20 };

/** The bank Lambda's answer to a direct invoke, as service/handler.py `_response` writes it. */
function answered(status: number, body: unknown): BankInvokeReply {
  return {
    payload: JSON.stringify({
      statusCode: status,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  };
}

/** A fake bank: no network, the token fixed, every payload it was sent kept. */
function fakeBank(reply: () => Promise<BankInvokeReply>) {
  const sent: unknown[] = [];
  const bank: BankDeps = {
    invoke: async (payload) => {
      sent.push(JSON.parse(payload));
      return reply();
    },
    readToken: async () => TOKEN,
  };
  return { bank, sent };
}

async function search(
  bank: BankDeps | undefined,
  body: unknown,
  headers: Record<string, string> = { authorization: `Bearer ${TOKEN}` },
): Promise<{ status: number; body: unknown }> {
  const app = createApp(new InMemoryStore(), bank);
  const path = ROUTES.questionSearches.path;
  const reply = (await app.resolve(
    {
      version: "2.0",
      routeKey: "$default",
      rawPath: path,
      rawQueryString: "",
      headers: { "content-type": "application/json", ...headers },
      requestContext: { http: { method: "POST", path }, stage: "$default" },
      body: JSON.stringify(body),
      isBase64Encoded: false,
    },
    {} as Parameters<typeof app.resolve>[1],
  )) as { statusCode: number; body?: string };
  return { status: reply.statusCode, body: reply.body ? JSON.parse(reply.body) : null };
}

function refusedWith(reply: { status: number; body: unknown }, type: ErrorType): void {
  expect(reply.status).toBe(ERROR_STATUS[type]);
  expect((reply.body as ErrorEnvelope).error.type).toBe(type);
  expect(typeof (reply.body as ErrorEnvelope).error.message).toBe("string");
}

describe("POST /api/v1/question-searches", () => {
  describe("authorization runs first", () => {
    it.each([
      ["no authorization header", {}],
      ["a wrong token", { authorization: "Bearer not-the-token" }],
      ["another scheme", { authorization: `Basic ${TOKEN}` }],
    ])("refuses %s with the error envelope and never invokes the bank", async (_, headers) => {
      const { bank, sent } = fakeBank(async () => answered(200, ENVELOPE));
      const reply = await search(bank, NEED, headers);
      refusedWith(reply, ErrorType.enum.Unauthorized);
      expect(JSON.stringify(reply.body)).not.toContain(TOKEN);
      expect(sent).toEqual([]);
    });

    it("refuses every caller while no read token is set, so an unset parameter never opens the route", async () => {
      const { bank, sent } = fakeBank(async () => answered(200, ENVELOPE));
      const unset: BankDeps = { ...bank, readToken: async () => undefined };
      refusedWith(await search(unset, NEED), ErrorType.enum.Unauthorized);
      expect(sent).toEqual([]);
    });

    it("refuses before reading the body: a bad need without a token is 401, not 400", async () => {
      const { bank } = fakeBank(async () => answered(200, ENVELOPE));
      refusedWith(await search(bank, { grade: "3" }, {}), ErrorType.enum.Unauthorized);
    });

    it("answers 502 when a read of the token fails, never letting the caller through", async () => {
      const { bank, sent } = fakeBank(async () => answered(200, ENVELOPE));
      const broken: BankDeps = { ...bank, readToken: () => Promise.reject(new Error("ssm down")) };
      refusedWith(await search(broken, NEED), ErrorType.enum.BankUnavailable);
      expect(sent).toEqual([]);
    });
  });

  it("answers 502 when no bank is wired, as on the local server", async () => {
    refusedWith(await search(undefined, NEED), ErrorType.enum.BankUnavailable);
  });

  it("returns the fixture envelope from the bank, parsed by SearchEnvelope", async () => {
    const { bank, sent } = fakeBank(async () => answered(200, ENVELOPE));
    const reply = await search(bank, NEED);
    expect(reply.status).toBe(200);
    expect(reply.body).toEqual(SearchEnvelope.parse(ENVELOPE));
    expect(sent).toEqual([{ need: NEED, stage: "final" }]);
  });

  it("strips a field the envelope does not name from a row, and drops a row carrying a private body", async () => {
    const [first, second] = ENVELOPE.rows;
    const leaky = {
      ...ENVELOPE,
      secret_rev: "x",
      rows: [
        { ...first, answer_key: { solution: 42 } },
        { ...second, body: "the private question body" },
      ],
    };
    const { bank } = fakeBank(async () => answered(200, leaky));
    const reply = await search(bank, NEED);
    expect(reply.status).toBe(200);
    const body = SearchEnvelope.parse(reply.body);
    expect(body.rows.map((row) => row.id)).toEqual([first?.id]);
    const text = JSON.stringify(reply.body);
    for (const leak of ["answer_key", "private question body", "secret_rev"])
      expect(text).not.toContain(leak);
  });

  it("refuses a need the contract rejects as 400 without invoking the bank", async () => {
    const { bank, sent } = fakeBank(async () => answered(200, ENVELOPE));
    refusedWith(await search(bank, { language: "pl", grade: "3" }), ErrorType.enum.BadRequest);
    expect(sent).toEqual([]);
  });

  it("maps the bank's 400 to a BadRequest with its detail", async () => {
    const { bank } = fakeBank(async () =>
      answered(400, { error: "invalid need", detail: "grade: '13' is not valid" }),
    );
    const reply = await search(bank, NEED);
    refusedWith(reply, ErrorType.enum.BadRequest);
    expect((reply.body as ErrorEnvelope).error.message).toBe("grade: '13' is not valid");
  });

  it.each([
    ["the invoke throws", async () => Promise.reject(new Error("socket hang up"))],
    [
      "the function errors",
      async () => ({ payload: '{"errorMessage":"boom"}', functionError: "Unhandled" }),
    ],
    ["the bank answers 403", async () => answered(403, { error: "forbidden" })],
    ["the bank answers 500", async () => answered(500, { error: "search failed" })],
    ["the payload is not JSON", async () => ({ payload: "not json" })],
    ["the payload is null (a handler that returned None)", async () => ({ payload: "null" })],
    ["the payload is a bare number", async () => ({ payload: "42" })],
    ["the body is no envelope", async () => answered(200, { version: 2, rows: "none" })],
  ])("returns the 502 error envelope when %s", async (_, reply) => {
    const { bank } = fakeBank(reply as () => Promise<BankInvokeReply>);
    const answer = await search(bank, NEED);
    refusedWith(answer, ErrorType.enum.BankUnavailable);
    expect(answer.status).toBe(502);
    expect(JSON.stringify(answer.body)).not.toMatch(/boom|socket|forbidden/);
  });
});

describe("lambdaBank", () => {
  const ARN = "arn:aws:lambda:eu-central-1:000000000000:function:bank-search:live";

  it("is no bank while the alias or the token parameter is unset", () => {
    expect(lambdaBank(undefined, "/p")).toBeUndefined();
    expect(lambdaBank(ARN, undefined)).toBeUndefined();
  });

  it("invokes the alias with the payload and hands back the bank's answer", async () => {
    const commands: InvokeCommand[] = [];
    const bank = lambdaBank(ARN, "/jadwigo/test/bank-read-token", async () => TOKEN, {
      send: async (command) => {
        commands.push(command);
        return {
          Payload: new TextEncoder().encode('{"statusCode":200}'),
          FunctionError: undefined,
        };
      },
    });
    const reply = await bank?.invoke('{"need":{}}');
    expect(reply).toEqual({ payload: '{"statusCode":200}', functionError: undefined });
    expect(commands[0]?.input.FunctionName).toBe(ARN);
    expect(new TextDecoder().decode(commands[0]?.input.Payload as Uint8Array)).toBe('{"need":{}}');
  });

  it("reads the token once per cold start, and again after a failed read", async () => {
    const names: string[] = [];
    let fail = true;
    const bank = lambdaBank(
      ARN,
      "/jadwigo/test/bank-read-token",
      async (name) => {
        names.push(name);
        if (fail) throw new Error("ssm down");
        return TOKEN;
      },
      { send: async () => ({}) },
    );
    await expect(bank?.readToken()).rejects.toThrow("ssm down");
    fail = false;
    expect(await bank?.readToken()).toBe(TOKEN);
    expect(await bank?.readToken()).toBe(TOKEN);
    expect(names).toEqual(["/jadwigo/test/bank-read-token", "/jadwigo/test/bank-read-token"]);
  });
});
