import type { InvokeCommand } from "@aws-sdk/client-lambda";
import type { GetObjectCommand } from "@aws-sdk/client-s3";
import {
  ERROR_STATUS,
  type ErrorEnvelope,
  ErrorType,
  QuestionBody,
  ROUTES,
  SearchEnvelope,
} from "@jadwigo/contracts";
import { InMemoryStore } from "@jadwigo/store";
import { describe, expect, it } from "vitest";
import { createApp } from "./app.ts";
import {
  type BankDeps,
  type BankInvokeReply,
  type BucketDeps,
  lambdaBank,
  lambdaBucket,
} from "./questions.ts";

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
        summary: {
          pl: "Dodawanie dwucyfrowe w zakresie 100, z przekroczeniem progu i bez.",
          en: "Two-digit addition within 100, with and without regrouping.",
        },
        can_do: { pl: "Umiem dodać dwie liczby do 100.", en: "I can add two numbers within 100." },
        mistake_classes: [
          {
            id: "regrouping",
            pl: "gubi przeniesienie dziesiątki",
            en: "drops the carried ten",
            spot: "47 + 25 answered 62",
          },
        ],
        contexts: { pl: ["zakupy"], en: ["shopping"] },
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
  const app = createApp(new InMemoryStore(), { bank });
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
    // The live shape: enrichment values by language survive the parse (dl-n9fr.37).
    const [first] = (reply.body as SearchEnvelope).rows;
    expect(first?.enrichment?.summary?.["pl"]).toContain("Dodawanie");
    expect(first?.enrichment?.mistake_classes?.[0]?.id).toBe("regrouping");
  });

  it("says degraded on the answering arm when every row the bank sent fails the row schema", async () => {
    // The shape the contract typed before 2026-10-29: flat strings the bank never sent. A bank
    // that drifts again must not come through as an empty ok.
    const flat = { summary: "Two-digit addition.", contexts: ["shopping"] };
    const drifted = {
      ...ENVELOPE,
      rows: ENVELOPE.rows.map((row) => ({ ...row, enrichment: flat })),
    };
    const { bank } = fakeBank(async () => answered(200, drifted));
    const reply = await search(bank, NEED);
    expect(reply.status).toBe(200);
    const body = SearchEnvelope.parse(reply.body);
    expect(body.rows).toEqual([]);
    const answering = body.state.find((s) => s.arm === "B1");
    expect(answering?.state).toBe("degraded");
    expect(answering?.detail).toContain("row schema");
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

/**
 * An invented question body in the shape the bank's derive step writes to
 * `questions/khan/<id>.json`: no Khan text, a made-up id, sha and credit URL.
 */
const BODY = {
  id: "xfeed0001",
  source: "khan",
  pl: {
    family: "enter",
    data: { prompt: "Ile to jest 2 + 3?" },
    key: { accept: ["5"] },
    help: { worked: ["2 + 3 = 5"] },
    say: "Ile to jest dwa plus trzy?",
  },
  problem_type: "invented-addition",
  credit: {
    source: "khan",
    url: "https://example.org/invented/xfeed0001",
    licence: "CC BY-NC-SA 4.0",
  },
  pictures: [{ ref: `${"ab".repeat(32)}.png`, decorative: true }],
};

/** A fake bucket: no network, the objects by key, every key it was asked for kept. */
function fakeBucket(objects: Record<string, string>, fail?: Error) {
  const asked: string[] = [];
  const bucket: BucketDeps = {
    get: async (key) => {
      asked.push(key);
      if (fail) throw fail;
      return objects[key];
    },
  };
  return { bucket, asked };
}

const STORED = { "questions/khan/xfeed0001.json": JSON.stringify(BODY) };

async function getBody(
  bucket: BucketDeps | undefined,
  id: string,
  headers: Record<string, string> = { authorization: `Bearer ${TOKEN}` },
  wired: { bank: BankDeps | undefined } = {
    bank: fakeBank(async () => answered(200, ENVELOPE)).bank,
  },
): Promise<{ status: number; body: unknown }> {
  const app = createApp(new InMemoryStore(), { bank: wired.bank, bucket });
  const path = ROUTES.questionBody.path.replace("{id}", id);
  const reply = (await app.resolve(
    {
      version: "2.0",
      routeKey: "$default",
      rawPath: path,
      rawQueryString: "",
      headers,
      requestContext: { http: { method: "GET", path }, stage: "$default" },
      isBase64Encoded: false,
    },
    {} as Parameters<typeof app.resolve>[1],
  )) as { statusCode: number; body?: string };
  return { status: reply.statusCode, body: reply.body ? JSON.parse(reply.body) : null };
}

describe("GET /api/v1/questions/{id}", () => {
  it.each([
    ["no authorization header", {}],
    ["a wrong token", { authorization: "Bearer not-the-token" }],
  ])("refuses %s as 401 and never reads the bucket", async (_, headers) => {
    const { bucket, asked } = fakeBucket(STORED);
    refusedWith(await getBody(bucket, "xfeed0001", headers), ErrorType.enum.Unauthorized);
    expect(asked).toEqual([]);
  });

  it("refuses a bad id without a token as 401 too, so the token comes before the id", async () => {
    const { bucket, asked } = fakeBucket(STORED);
    refusedWith(await getBody(bucket, "..%2Fsecret", {}), ErrorType.enum.Unauthorized);
    expect(asked).toEqual([]);
  });

  it("returns the body with its key from questions/khan/<id>.json", async () => {
    const { bucket, asked } = fakeBucket(STORED);
    const reply = await getBody(bucket, "xfeed0001");
    expect(reply.status).toBe(200);
    expect(reply.body).toEqual(QuestionBody.parse(BODY));
    expect((reply.body as QuestionBody).pl?.key).toEqual({ accept: ["5"] });
    expect((reply.body as QuestionBody).pictures).toHaveLength(1);
    expect(asked).toEqual(["questions/khan/xfeed0001.json"]);
  });

  it("drops a field the body schema does not name", async () => {
    const { bucket } = fakeBucket({
      "questions/khan/xfeed0001.json": JSON.stringify({ ...BODY, raw_item: { secret: 1 } }),
    });
    const reply = await getBody(bucket, "xfeed0001");
    expect(reply.status).toBe(200);
    expect(reply.body).not.toHaveProperty("raw_item");
  });

  it("answers 404 when the bucket holds no such object", async () => {
    const { bucket, asked } = fakeBucket(STORED);
    const reply = await getBody(bucket, "xnothere");
    refusedWith(reply, ErrorType.enum.NotFound);
    expect((reply.body as ErrorEnvelope).error.message).toBe("no such question");
    expect(asked).toEqual(["questions/khan/xnothere.json"]);
  });

  it.each([
    ["a dot segment", "..%2F..%2Findex"],
    ["a dot", "x.json"],
    ["one past 64 characters", "x".repeat(65)],
    ["a space", "x%20y"],
  ])("answers 404 for an id with %s and never builds a key from it", async (_, id) => {
    const { bucket, asked } = fakeBucket(STORED);
    refusedWith(await getBody(bucket, id), ErrorType.enum.NotFound);
    expect(asked).toEqual([]);
  });

  it("answers 502 when the bucket read fails, naming nothing of the failure", async () => {
    const { bucket } = fakeBucket(STORED, new Error("AccessDenied: arn:aws:s3:::bucket"));
    const reply = await getBody(bucket, "xfeed0001");
    refusedWith(reply, ErrorType.enum.BankUnavailable);
    expect(JSON.stringify(reply.body)).not.toMatch(/AccessDenied|arn:/);
  });

  it.each([
    ["is not JSON", "not json"],
    ["is not a question body", JSON.stringify({ id: "xfeed0001", source: "khan" })],
    ["names another id", JSON.stringify({ ...BODY, id: "xother" })],
  ])("answers 502 when the stored object %s", async (_, text) => {
    const { bucket } = fakeBucket({ "questions/khan/xfeed0001.json": text });
    refusedWith(await getBody(bucket, "xfeed0001"), ErrorType.enum.BankUnavailable);
  });

  it("answers 502 when no bank or no bucket is wired, as on the local server", async () => {
    refusedWith(
      await getBody(fakeBucket(STORED).bucket, "xfeed0001", undefined, { bank: undefined }),
      ErrorType.enum.BankUnavailable,
    );
    refusedWith(await getBody(undefined, "xfeed0001"), ErrorType.enum.BankUnavailable);
  });
});

describe("lambdaBucket", () => {
  const object = (text: string) => ({ Body: { transformToString: async () => text } });

  it("reads the object from the bucket CONTENT_BUCKET names, without touching SSM", async () => {
    const commands: GetObjectCommand[] = [];
    const names: string[] = [];
    const bucket = lambdaBucket(
      "jadwigo-bank-content-test",
      async (name) => {
        names.push(name);
        return "unused";
      },
      {
        send: async (command) => {
          commands.push(command);
          return object('{"id":"x1"}');
        },
      },
    );
    expect(await bucket.get("questions/khan/x1.json")).toBe('{"id":"x1"}');
    expect(commands[0]?.input).toEqual({
      Bucket: "jadwigo-bank-content-test",
      Key: "questions/khan/x1.json",
    });
    expect(names).toEqual([]);
  });

  it("falls back to the SSM parameter, read once per cold start and again after a failed read", async () => {
    const names: string[] = [];
    let fail = true;
    const buckets: (string | undefined)[] = [];
    const bucket = lambdaBucket(
      undefined,
      async (name) => {
        names.push(name);
        if (fail) throw new Error("ssm down");
        return " jadwigo-bank-content-ssm \n";
      },
      {
        send: async (command) => {
          buckets.push(command.input.Bucket);
          return object("{}");
        },
      },
    );
    await expect(bucket.get("k")).rejects.toThrow("ssm down");
    fail = false;
    await bucket.get("k");
    await bucket.get("k");
    expect(names).toEqual(["/jadwigo/bank/content-bucket", "/jadwigo/bank/content-bucket"]);
    expect(buckets).toEqual(["jadwigo-bank-content-ssm", "jadwigo-bank-content-ssm"]);
  });

  it("throws when the parameter holds no name", async () => {
    const bucket = lambdaBucket(undefined, async () => " ", { send: async () => object("{}") });
    await expect(bucket.get("k")).rejects.toThrow("no content bucket");
  });

  it.each([
    ["NoSuchKey", Object.assign(new Error("gone"), { name: "NoSuchKey" })],
    ["a 404", Object.assign(new Error("gone"), { $metadata: { httpStatusCode: 404 } })],
  ])("is undefined for a missing object (%s), and throws on any other failure", async (_, err) => {
    const gone = lambdaBucket("b", undefined, { send: () => Promise.reject(err) });
    expect(await gone.get("k")).toBeUndefined();
    const denied = Object.assign(new Error("AccessDenied"), { $metadata: { httpStatusCode: 403 } });
    const broken = lambdaBucket("b", undefined, { send: () => Promise.reject(denied) });
    await expect(broken.get("k")).rejects.toThrow("AccessDenied");
  });
});
