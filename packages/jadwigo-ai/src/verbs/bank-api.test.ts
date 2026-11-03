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
  creditOf,
  httpBankReads,
  MAX_LESSON_QUESTIONS,
  maxBodyReads,
} from "./bank-api.ts";
import { createVerbs } from "./index.ts";
import { VerbError } from "./types.ts";

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

describe("apiBank with question types (dl-hin8.24)", () => {
  /** Every third made-up body is a choose question: recognition, the rest production. */
  function mixed(): Record<string, QuestionBody> {
    return Object.fromEntries(
      IDS.map((id, i) => {
        const whole = body(id, i % 9, (i % 7) + 1);
        if (i % 3 !== 0 || whole.pl === undefined) return [id, whole];
        const pl = {
          ...whole.pl,
          family: "choose",
          question_type: "recognition" as const,
          data: { stem: { text: "1 + 1 = ?" }, options: [], select: "one", layout: "grid" },
          key: { correct: ["o1"] },
        };
        return [id, { ...whole, pl }];
      }),
    );
  }

  it("sends the kept types in the need and draws only questions of them", async () => {
    const { reads, asked } = fakeReads(mixed(), PAGES);
    const questions = await apiBank(reads).sources({ ...QUERY, question_types: ["choose"] });
    expect(asked.search[0]).toMatchObject({ question_types: ["choose"] });
    expect(questions.map((q) => q.question_type)).toEqual(Array(5).fill("recognition"));
    expect(questions.map((q) => q.source)).toEqual(
      ["xmade000", "xmade003", "xmade006", "xmade009", "xmade012"].map((id) => `bank:${id}`),
    );
  });

  it("skips a set whose page names none of the kept types without reading its bodies", async () => {
    const typed = { ...page("set_add", IDS), question_types: ["production"] };
    const { reads, asked } = fakeReads(mixed(), [typed]);
    expect(await apiBank(reads).sources({ ...QUERY, question_types: ["true_false"] })).toEqual([]);
    expect(asked.body).toEqual([]);
  });

  it("says which types it was asked for when every body read was another type", async () => {
    const { reads } = fakeReads(BODIES, PAGES);
    await expect(
      apiBank(reads).sources({ ...QUERY, question_types: ["recognition"] }),
    ).rejects.toThrow("of the types recognition in pl: read 15");
  });

  it("draws from pinned sets in their order with no search, and refuses a set it lacks", async () => {
    const { reads, asked } = fakeReads(BODIES, PAGES);
    const questions = await apiBank(reads).sources({ ...QUERY, sets: ["set_empty", "set_add"] });
    expect(asked.search).toEqual([]);
    expect(questions).toHaveLength(5);
    await expect(apiBank(reads).sources({ ...QUERY, sets: ["set_nope"] })).rejects.toMatchObject({
      type: "input",
    });
  });

  it("passes over a pinned set naming none of the kept types without reading it, and draws the next", async () => {
    const more = IDS.map((id) => id.replace("xmade", "xmore"));
    const choose = mixed();
    const bodies: Record<string, QuestionBody | undefined> = { ...BODIES };
    more.forEach((id, i) => {
      const twin = choose[IDS[i] ?? ""];
      if (twin !== undefined) bodies[id] = { ...twin, id };
    });
    const allProduction = { ...page("set_a", IDS.slice(0, 30)), question_types: ["production"] };
    const holdsChoose = { ...page("set_b", more), question_types: ["production", "recognition"] };
    const { reads, asked } = fakeReads(bodies, [allProduction, holdsChoose]);
    const questions = await apiBank(reads).sources({
      ...QUERY,
      limit: 5,
      sets: ["set_a", "set_b"],
      question_types: ["choose"],
    });
    expect(asked.set).toEqual(["set_a", "set_b"]);
    expect(asked.body.every((id) => id.startsWith("xmore"))).toBe(true);
    expect(questions.map((q) => q.question_type)).toEqual(Array(5).fill("recognition"));
    expect(questions.every((q) => q.set_id === "set_b")).toBe(true);
  });

  it("maps a search row's question types onto its set", async () => {
    const { reads } = fakeReads(BODIES, PAGES);
    const plain = reads.search;
    reads.search = async (need) => {
      const envelope = await plain(need);
      return {
        ...envelope,
        rows: envelope.rows.map((r) => ({ ...r, question_types: ["fill_gaps"] })),
      };
    };
    const { sets } = await apiBank(reads).search(QUERY);
    expect(sets[0]?.question_types).toEqual(["fill_gaps"]);
  });

  it("lists the bank's types for one grade and language, most questions first", async () => {
    const { reads, asked } = fakeReads(BODIES, PAGES);
    reads.types = async (typesAsked) => {
      asked.types.push(typesAsked);
      return {
        version: 1,
        types: [
          {
            grade: "1",
            language: "pl",
            question_type: "fill_gaps",
            family: "slots",
            sets: 1,
            ready: 4,
          },
          {
            grade: "1",
            language: "pl",
            question_type: "recognition",
            family: "choose",
            sets: 2,
            ready: 9,
          },
          {
            grade: "2",
            language: "pl",
            question_type: "match",
            family: "group",
            sets: 1,
            ready: 3,
          },
        ],
      };
    };
    expect(await apiBank(reads).types("1", "pl")).toEqual([
      { question_type: "recognition", family: "choose", sets: 2, ready: 9 },
      { question_type: "fill_gaps", family: "slots", sets: 1, ready: 4 },
    ]);
    expect(asked.types).toEqual([{ grade: "1", language: "pl" }]);
  });
});

// dl-1eieq.6.1: a borrowed question keeps its credit from the body into the lesson file.
describe("creditOf", () => {
  it("reads a Khan body's credit as the lesson question's, the licence as its id", () => {
    const khan = body("xmade001", 1, 2, {
      source: "khan",
      credit: {
        source: "Khan Academy",
        licence: "CC BY-NC-SA 4.0",
        url: "https://example.org/e/1",
      },
    });
    expect(creditOf(khan, "pl", "2026-11-03")).toEqual({
      source: "khan",
      ref: "xmade001",
      url: "https://example.org/e/1",
      licence: "cc-by-nc-sa-4.0",
      original_lang: "en",
      checked: "2026-11-03",
    });
  });

  it("names the source from the credit when the body names none, and keeps a licence it cannot read", () => {
    const old = body("xmade002", 1, 2);
    expect(creditOf(old, "pl", "2026-11-03")).toMatchObject({ source: "khan", ref: "xmade002" });
    const alfik = body("alfik_made_q01", 1, 2, {
      source: "alfik",
      credit: { source: "alfik", licence: "© made-up organiser" },
    });
    expect(creditOf(alfik, "pl", "2026-11-03")).toMatchObject({
      source: "alfik",
      licence: "© made-up organiser",
      original_lang: "pl",
    });
    const unknown = body("xmade003", 1, 2, { credit: { source: "elsewhere", licence: "x" } });
    expect(creditOf(unknown, "pl", "2026-11-03")).toBeUndefined();
  });
});

describe("lesson_draft on the real bank's shapes", () => {
  it("keeps each drawn question's credit on its step", async () => {
    const { reads } = fakeReads(BODIES, PAGES);
    const verbs = createVerbs({ bank: apiBank(reads) });
    const effect = await verbs.lesson_draft.run(contextFor(runId(), "call_1"), {
      request: "a short lesson",
      grade: "1",
      names: [],
      topic: "dodawanie",
      count: 2,
    });
    const script = effect.lesson_file?.["script"] as
      | { parts: { steps: { credit?: unknown }[] }[] }
      | undefined;
    expect(script?.parts[0]?.steps.map((s) => s.credit)).toEqual(
      IDS.slice(0, 2).map((id) => expect.objectContaining({ source: "khan", ref: id })),
    );
  });

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

  it("tells the model the bank cannot list its types when the route is not deployed (dl-hin8.27)", async () => {
    const { send } = fakeFetch({ [ROUTES.questionTypes.path]: { status: 404, body: {} } });
    const reads = httpBankReads({ base: "https://api.example.test", token: "t0ken", fetch: send });
    const refused = reads.types({ grade: "1", language: "pl" });
    await expect(refused).rejects.toBeInstanceOf(VerbError);
    await expect(refused).rejects.toMatchObject({ type: "unavailable" });
    await expect(refused).rejects.toThrow(/draw without question_types/);
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

describe("addition-within-10 gap over the HTTP bank seam (dl-n9fr.76)", () => {
  it.each(["abstained", "empty"])("%s reads no set or body and drafts no lesson", async (state) => {
    const paths: string[] = [];
    const send = (async (url: URL) => {
      paths.push(url.pathname);
      return new Response(
        JSON.stringify({ version: 1, arm: "C", rows: [], state: [{ arm: "C", state }] }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const bank = apiBank(
      httpBankReads({ base: "https://bank.example.test", token: "test", fetch: send }),
    );
    const verbs = createVerbs({ bank });
    await expect(
      verbs.lesson_draft.run(contextFor(runId(), "gap"), {
        request: "Lekcja: dodawanie do 10, 5 pytań, dla pierwszej klasy",
        grade: "1",
        names: [],
        topic: "dodawanie do 10",
        count: 5,
      }),
    ).rejects.toMatchObject({ type: "no-questions" });
    expect(paths).toEqual([ROUTES.questionSearches.path]);
  });

  it("copies a verified arithmetic fixture through HTTP without changing data or keys", async () => {
    const ids = IDS.slice(0, 5);
    const bodies = Object.fromEntries(ids.map((id, i) => [id, body(id, i, 1)]));
    const send = (async (url: URL) => {
      const value =
        url.pathname === ROUTES.questionSearches.path
          ? { version: 1, rows: [row("set_add", 1)], state: [{ arm: "C", state: "ok" }] }
          : url.pathname === ROUTES.questionSet.path.replace("{id}", "set_add")
            ? page("set_add", ids)
            : bodies[url.pathname.split("/").at(-1) ?? ""];
      return new Response(JSON.stringify(value), { status: value === undefined ? 404 : 200 });
    }) as unknown as typeof fetch;
    const bank = apiBank(
      httpBankReads({ base: "https://bank.example.test", token: "test", fetch: send }),
    );
    const effect = await createVerbs({ bank }).lesson_draft.run(contextFor(runId(), "arithmetic"), {
      request: "Lekcja: dodawanie do 10, 5 pytań, dla pierwszej klasy",
      grade: "1",
      names: [],
      topic: "dodawanie do 10",
      count: 5,
    });
    const script = effect.lesson_file?.["script"] as
      | { parts: { steps: { based_on: unknown; question: { data: unknown; key: unknown } }[] }[] }
      | undefined;
    const drawn = script?.parts[0]?.steps ?? [];
    expect(drawn).toHaveLength(5);
    for (const [i, question] of drawn.entries()) {
      expect(question.based_on).toEqual({ question: `bank:${ids[i]}`, changes: [] });
      expect(question.question.data).toEqual(bodies[ids[i] ?? ""]?.pl?.data);
      expect(question.question.key).toEqual(bodies[ids[i] ?? ""]?.pl?.key);
    }
  });
});

describe("nearby source choice and adaptation (dl-n9fr.76)", () => {
  it("shows source descriptions in the model's search output and view", async () => {
    const { reads } = fakeReads(BODIES, PAGES);
    reads.search = async () => ({
      version: 1,
      rows: [
        {
          ...row("set_near", 1),
          enrichment: {
            summary: {
              pl: "Dodawanie 1 do liczb dwucyfrowych, np. 36 + 1.",
              en: "Two-digit addition.",
            },
            can_do: { en: "Add one to a two-digit number." },
          },
        },
      ],
      state: [],
    });
    const verbs = createVerbs({ bank: apiBank(reads) });
    const effect = await verbs.question_search.run(contextFor(runId(), "near"), QUERY);
    for (const data of [effect.output, effect.view?.data]) {
      expect(data).toMatchObject({ sets: [{ why_found: expect.stringContaining("36 + 1") }] });
      expect(data).toMatchObject({
        sets: [{ why_found: expect.stringContaining("Add one to a two-digit number") }],
      });
      expect(data).toMatchObject({
        sets: [{ why_found: expect.stringContaining("not verified") }],
      });
    }
  });

  it("lets the model adapt a nearby question while retaining its source and reason", async () => {
    const source = body("xmade000", 36, 1);
    const { reads } = fakeReads({ xmade000: source }, [page("set_near", ["xmade000"])]);
    const verbs = createVerbs({ bank: apiBank(reads) });
    const run = runId();
    const draft = await verbs.lesson_draft.run(contextFor(run, "draft"), {
      request: "dodawanie do 10",
      topic: "dodawanie do 10",
      grade: "1",
      names: [],
      count: 1,
    });
    if (draft.lesson_file === undefined) throw new Error("expected a draft");
    const effect = await verbs.lesson_edit.run(
      contextFor(run, "adapt", { revision: 1, lesson_file: draft.lesson_file }),
      {
        draft_id: run,
        step_id: "s01",
        names: [],
        change: "numbers",
        why: "The parent asked for sums at most 10; adapt the nearby source.",
        patch: {
          say: "Ile to jest 3 + 1?",
          question: {
            data: { figure: { text: "3 + 1 = ?" } },
            key: { accept: ["4"] },
            help: { worked: ["3 + 1 = 4"] },
          },
        },
      },
    );
    expect(effect.lesson_file).toMatchObject({
      script: {
        parts: [
          {
            steps: [
              {
                based_on: {
                  question: "bank:xmade000",
                  changes: [{ change: "numbers", why: expect.stringContaining("at most 10") }],
                },
                question: { data: { figure: { text: "3 + 1 = ?" } }, key: { accept: ["4"] } },
              },
            ],
          },
        ],
      },
    });
    expect(source.pl?.key).toEqual({ accept: ["37"] });
  });
});

describe("adaptation edits preserve the family contract (dl-hin8.30)", () => {
  it("refuses malformed help without writing a revision and accepts the repaired shape", async () => {
    const { reads } = fakeReads({ xmade000: body("xmade000", 36, 1) }, [
      page("set_near", ["xmade000"]),
    ]);
    const verbs = createVerbs({ bank: apiBank(reads) });
    const run = runId();
    const draft = await verbs.lesson_draft.run(contextFor(run, "draft"), {
      request: "addition within 10",
      grade: "1",
      topic: "addition within 10",
      names: [],
      count: 1,
    });
    if (draft.lesson_file === undefined) throw new Error("expected draft");
    const lesson = { revision: 1, lesson_file: draft.lesson_file };
    const patch = {
      say: "Ile to jest 3 + 1?",
      question: {
        data: { figure: { text: "3 + 1 = ?" } },
        key: { accept: ["4"] },
        help: { look: "Policz obie liczby.", worked: ["3 + 1 = 4"] },
      },
    };
    await expect(
      verbs.lesson_edit.run(contextFor(run, "bad", lesson), {
        draft_id: run,
        step_id: "s01",
        names: [],
        why: "The request needs a sum within ten",
        change: "numbers",
        patch,
      }),
    ).rejects.toThrow("expected object");
    const repaired = await verbs.lesson_edit.run(contextFor(run, "repaired", lesson), {
      draft_id: run,
      step_id: "s01",
      names: [],
      why: "The request needs a sum within ten",
      change: "numbers",
      patch: {
        ...patch,
        question: {
          ...patch.question,
          help: { look: { text: "Policz obie liczby." }, worked: ["3 + 1 = 4"] },
        },
      },
    });
    expect(repaired.output["ok"]).toBe(true);
    expect(draft.lesson_file).toMatchObject({
      script: { parts: [{ steps: [{ question: { key: { accept: ["37"] } } }] }] },
    });
  });
});

describe("model-written twins inherit their source family (dl-hin8.30)", () => {
  it("compiles a flat twin supplied through lesson_check without asking the model to change the main family", async () => {
    const { reads } = fakeReads({ xmade000: body("xmade000", 3, 1) }, [
      page("set_near", ["xmade000"]),
    ]);
    const verbs = createVerbs({ bank: apiBank(reads) });
    const run = runId();
    const draft = await verbs.lesson_draft.run(contextFor(run, "draft"), {
      request: "addition within 10",
      grade: "1",
      topic: "addition within 10",
      names: [],
      count: 1,
    });
    if (draft.lesson_file === undefined) throw new Error("expected draft");
    const twin = {
      say: "Ile to jest 2 + 1?",
      data: { input: "number", entry: "keypad", figure: { kind: "expression", text: "2 + 1 = ?" } },
      key: { accept: ["3"] },
    };
    const checked = await verbs.lesson_check.run(
      contextFor(run, "check", { revision: 1, lesson_file: draft.lesson_file }),
      {
        draft_id: run,
        names: [],
        help: { s01: { twin } },
      },
    );
    expect(checked.output["ok"]).toBe(true);
    expect(checked.lesson_file).toMatchObject({
      script: {
        parts: [
          { steps: [{ question: { family: "enter", help: { twin: { family: "enter" } } } }] },
        ],
      },
    });
    const edited = await verbs.lesson_edit.run(
      contextFor(run, "edit", { revision: 1, lesson_file: draft.lesson_file }),
      {
        draft_id: run,
        names: [],
        step_id: "s01",
        why: "Add a suitable twin",
        patch: { question: { help: { twin } } },
      },
    );
    expect(edited.output["ok"]).toBe(true);
    await expect(
      verbs.lesson_edit.run(
        contextFor(run, "wrong-family", { revision: 1, lesson_file: draft.lesson_file }),
        {
          draft_id: run,
          names: [],
          step_id: "s01",
          why: "A twin must retain the parent family",
          patch: { question: { help: { twin: { ...twin, family: "slots" } } } },
        },
      ),
    ).rejects.toThrow();
  });
});
