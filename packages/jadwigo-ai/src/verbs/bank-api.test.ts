import {
  type QuestionBody,
  type QuestionSetPage,
  ROUTES,
  type SearchEnvelope,
} from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { contextFor, runId } from "../testing/context.ts";
import {
  apiBank,
  type BankReads,
  BODY_BATCH,
  httpBankReads,
  MAX_LESSON_QUESTIONS,
  maxBodyReads,
} from "./bank-api.ts";
import { createVerbs } from "./index.ts";

// Made-up sets and questions only: no bank content, no Khan item (fence 8).

function body(id: string, a: number, b: number, extra: Partial<QuestionBody> = {}): QuestionBody {
  const variant = {
    family: "enter",
    question_type: "production" as const,
    say: `Ile to jest ${a} + ${b}?`,
    data: {
      input: "number",
      entry: "keypad",
      figure: { kind: "expression", text: `${a} + ${b} = ?` },
    },
    key: { accept: [String(a + b)] },
    help: { look: { text: "Spójrz jeszcze raz na obie liczby." } },
  };
  return { id, credit: { source: "khan", licence: "CC BY-NC-SA 4.0" }, pl: variant, ...extra };
}

function page(id: string, ready: string[], ids = ready): QuestionSetPage {
  return {
    id,
    titles: { pl: `Zestaw ${id}`, en: `Set ${id}` },
    grade: "1",
    skill_ids: ["math.add.within-20"],
    items: { ids, ready_ids: { pl: ready, en: [] } },
  };
}

function row(id: string, rank: number): SearchEnvelope["rows"][number] {
  return {
    id,
    rank,
    score: 1 / rank,
    arm: "C",
    titles: { pl: `Zestaw ${id}` },
    grade: "1",
    items: 3,
  };
}

/** A bank of 2 sets: the first has no ready question in pl, the second has 25 made-up ones. */
function fakeReads(bodies: Record<string, QuestionBody | undefined>, pages: QuestionSetPage[]) {
  const asked = {
    search: [] as unknown[],
    set: [] as string[],
    body: [] as string[],
    types: [] as unknown[],
    /** The most body reads in flight at once. */
    peak: 0,
  };
  let inFlight = 0;
  const reads: BankReads = {
    search: async (need) => {
      asked.search.push(need);
      return { version: 1, rows: pages.map((p, i) => row(p.id, i + 1)), state: [] };
    },
    set: async (id) => {
      asked.set.push(id);
      return pages.find((p) => p.id === id);
    },
    body: async (id) => {
      asked.body.push(id);
      inFlight += 1;
      asked.peak = Math.max(asked.peak, inFlight);
      await Promise.resolve();
      inFlight -= 1;
      return bodies[id];
    },
    types: async (typesAsked) => {
      asked.types.push(typesAsked);
      return { version: 1, types: [] };
    },
  };
  return { reads, asked };
}

const IDS = Array.from({ length: 25 }, (_, i) => `xmade${String(i).padStart(3, "0")}`);
const BODIES = Object.fromEntries(IDS.map((id, i) => [id, body(id, i % 9, (i % 7) + 1)]));
const PAGES = [page("set_empty", [], ["xother1"]), page("set_add", IDS)];
const QUERY = { grade: "1", words: "dodawanie", language: "pl" as const, skills: [], limit: 5 };

describe("apiBank", () => {
  it("searches with the query's need and maps each row to a set", async () => {
    const { reads, asked } = fakeReads(BODIES, PAGES);
    const { sets } = await apiBank(reads).search(QUERY);
    expect(asked.search).toEqual([{ language: "pl", grade: "1", words: "dodawanie", limit: 5 }]);
    expect(sets.map((s) => s.set_id)).toEqual(["set_empty", "set_add"]);
    expect(sets[1]).toMatchObject({ title: "Zestaw set_add", grades: ["1"], questions: 3 });
  });

  it("draws from the first set with ready questions, by its ready ids only, in set order", async () => {
    const { reads, asked } = fakeReads(BODIES, PAGES);
    const questions = await apiBank(reads).sources(QUERY);
    expect(asked.set).toEqual(["set_empty", "set_add"]);
    expect(questions.map((q) => q.source)).toEqual(IDS.slice(0, 5).map((id) => `bank:${id}`));
    expect(asked.body).toEqual(IDS.slice(0, 5));
    expect(questions[0]).toMatchObject({
      set_id: "set_add",
      question_type: "production",
      skill_ids: ["math.add.within-20"],
      say: "Ile to jest 0 + 1?",
    });
  });

  it("holds a lesson to 20 questions whatever the query asks", async () => {
    const { reads } = fakeReads(BODIES, PAGES);
    const questions = await apiBank(reads).sources({ ...QUERY, limit: 50 });
    expect(questions).toHaveLength(MAX_LESSON_QUESTIONS);
  });

  it("passes over a body that is missing, has no variant in the language, or names no type", async () => {
    const { pl: plVariant, ...english } = body("xmade001", 1, 1);
    const untyped = body("xmade002", 1, 2);
    const { question_type: __, ...variant } = untyped.pl ?? { family: "enter", data: {}, key: {} };
    const bodies = {
      ...BODIES,
      xmade000: undefined,
      xmade001: { ...english, en: plVariant },
      xmade002: { ...untyped, pl: variant },
    };
    const { reads } = fakeReads(bodies, PAGES);
    const questions = await apiBank(reads).sources({ ...QUERY, limit: 3 });
    expect(questions.map((q) => q.source)).toEqual([
      "bank:xmade003",
      "bank:xmade004",
      "bank:xmade005",
    ]);
  });

  it("reads a bounded number of bodies, in small batches, when every body lacks a type, and says why", async () => {
    const untyped = (id: string): QuestionBody => {
      const whole = body(id, 1, 1);
      const { question_type: _, ...variant } = whole.pl ?? { family: "enter", data: {}, key: {} };
      return { ...whole, pl: variant };
    };
    const more = IDS.map((id) => id.replace("xmade", "xmore"));
    const bodies = Object.fromEntries([...IDS, ...more].map((id) => [id, untyped(id)]));
    const { reads, asked } = fakeReads(bodies, [page("set_add", IDS), page("set_more", more)]);
    const failure = apiBank(reads).sources(QUERY);
    await expect(failure).rejects.toMatchObject({ type: "no-questions" });
    await expect(failure).rejects.toThrow(
      `read ${maxBodyReads(QUERY.limit)} lesson-ready questions and passed over all of them (${maxBodyReads(QUERY.limit)} no question_type)`,
    );
    expect(asked.body).toHaveLength(maxBodyReads(QUERY.limit));
    expect(asked.peak).toBeLessThanOrEqual(BODY_BATCH);
  });

  it("bounds the reads at 40 however many questions are asked", () => {
    expect(maxBodyReads(1)).toBe(BODY_BATCH);
    expect(maxBodyReads(5)).toBe(15);
    expect(maxBodyReads(MAX_LESSON_QUESTIONS)).toBe(40);
  });

  it("takes a body's own question type when its variant names none (an Alfik task)", async () => {
    const { question_type: _, ...variant } = body("xmade000", 1, 1).pl ?? {
      family: "",
      data: {},
      key: {},
    };
    const bodies = {
      xmade000: { ...body("xmade000", 1, 1), pl: variant, question_type: "production" as const },
    };
    const { reads } = fakeReads(bodies, [page("set_add", ["xmade000"])]);
    const [question] = await apiBank(reads).sources({ ...QUERY, limit: 1 });
    expect(question?.question_type).toBe("production");
  });

  it("asks nothing for Ukrainian, which the bank does not hold, or a need with no words or skills", async () => {
    const { reads, asked } = fakeReads(BODIES, PAGES);
    expect(await apiBank(reads).sources({ ...QUERY, language: "uk" })).toEqual([]);
    expect(await apiBank(reads).search({ ...QUERY, words: " " })).toEqual({ sets: [] });
    expect(asked.search).toEqual([]);
  });
});

describe("lesson_draft on the real bank's shapes", () => {
  it("drafts a lesson whose every step is a bank question with based_on", async () => {
    const { reads } = fakeReads(BODIES, PAGES);
    const verbs = createVerbs({ bank: apiBank(reads) });
    const effect = await verbs.lesson_draft.run(contextFor(runId(), "call_1"), {
      request: "a short lesson",
      grade: "1",
      names: [],
      topic: "dodawanie",
      count: 4,
    });
    const script = effect.lesson_file?.["script"] as
      | { parts: { steps: { based_on: unknown }[] }[] }
      | undefined;
    const steps = script?.parts[0]?.steps;
    expect(steps?.map((s) => s.based_on)).toEqual(
      IDS.slice(0, 4).map((id) => ({ question: `bank:${id}`, changes: [] })),
    );
  });
});

describe("httpBankReads", () => {
  function fakeFetch(replies: Record<string, { status: number; body?: unknown }>) {
    const sent: {
      url: string;
      search: string;
      method: string;
      auth: string | null;
      body: unknown;
    }[] = [];
    const send = (async (url: URL, init: RequestInit) => {
      const headers = new Headers(init.headers);
      sent.push({
        url: url.pathname,
        search: url.search,
        method: init.method ?? "GET",
        auth: headers.get("authorization"),
        body: init.body === undefined ? undefined : JSON.parse(String(init.body)),
      });
      const reply = replies[url.pathname] ?? { status: 404 };
      return new Response(reply.body === undefined ? null : JSON.stringify(reply.body), {
        status: reply.status,
      });
    }) as unknown as typeof fetch;
    return { send, sent };
  }

  const setPath = ROUTES.questionSet.path.replace("{id}", "set_add");
  const bodyPath = ROUTES.questionBody.path.replace("{id}", "xmade000");

  it("reads the 3 routes with the read token and parses each answer", async () => {
    const envelope = { version: 1, rows: [row("set_add", 1)], state: [] };
    const { send, sent } = fakeFetch({
      [ROUTES.questionSearches.path]: { status: 200, body: envelope },
      [setPath]: { status: 200, body: PAGES[1] },
      [bodyPath]: { status: 200, body: BODIES["xmade000"] },
    });
    const reads = httpBankReads({ base: "https://api.example.test", token: "t0ken", fetch: send });
    const need = { language: "pl" as const, grade: "1", words: "dodawanie" };
    expect((await reads.search(need)).rows[0]?.id).toBe("set_add");
    expect((await reads.set("set_add"))?.items.ready_ids["pl"]).toHaveLength(25);
    expect((await reads.body("xmade000"))?.pl?.question_type).toBe("production");
    expect(sent.map((s) => [s.method, s.url, s.auth])).toEqual([
      ["POST", ROUTES.questionSearches.path, "Bearer t0ken"],
      ["GET", setPath, "Bearer t0ken"],
      ["GET", bodyPath, "Bearer t0ken"],
    ]);
    expect(sent[0]?.body).toEqual(need);
  });

  it("names the throttle when a route answers 429", async () => {
    const { send } = fakeFetch({
      [bodyPath]: { status: 429, body: { message: "Too Many Requests" } },
    });
    const reads = httpBankReads({ base: "https://api.example.test", token: "t0ken", fetch: send });
    await expect(reads.body("xmade000")).rejects.toThrow("was throttled (429)");
  });

  it("lists the bank's question types for a grade and language", async () => {
    const counts = {
      version: 1,
      types: [
        {
          grade: "1",
          language: "pl",
          question_type: "recognition",
          family: "choose",
          sets: 2,
          ready: 9,
        },
      ],
    };
    const { send, sent } = fakeFetch({
      [ROUTES.questionTypes.path]: { status: 200, body: counts },
    });
    const reads = httpBankReads({ base: "https://api.example.test", token: "t0ken", fetch: send });
    expect(await reads.types({ grade: "1", language: "pl" })).toEqual(counts);
    expect(sent.map((s) => [s.method, s.url, s.search, s.auth])).toEqual([
      ["GET", ROUTES.questionTypes.path, "?grade=1&language=pl", "Bearer t0ken"],
    ]);
  });

  it("answers undefined for a 404 and rejects any other failure without the token", async () => {
    const { send } = fakeFetch({ [bodyPath]: { status: 502, body: { error: {} } } });
    const reads = httpBankReads({ base: "https://api.example.test", token: "t0ken", fetch: send });
    expect(await reads.set("set_add")).toBeUndefined();
    const failure = reads.body("xmade000");
    await expect(failure).rejects.toThrow("answered 502");
    await expect(failure).rejects.not.toThrow("t0ken");
  });
});
