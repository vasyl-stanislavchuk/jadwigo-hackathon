import { describe, expect, it } from "vitest";
import {
  BankQuestionId,
  Need,
  QuestionBody,
  QuestionSource,
  questionSourceOf,
  SearchEnvelope,
} from "./bank.ts";
import { ROUTES } from "./routes.ts";

/**
 * The fixture envelope from david-learns `tests/fixtures/bank/envelope.json` at commit `dc8412cd`,
 * which david-learns' bank client is tested against at the same bank commit. Copied, not read, so
 * this test runs where only this repo is checked out.
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

const [FIRST] = ENVELOPE.rows;

describe("the search envelope", () => {
  it("parses the fixture envelope the product repo's bank client is tested against", () => {
    const parsed = SearchEnvelope.parse(ENVELOPE);
    expect(parsed.rows.map((row) => row.id)).toEqual(["set_khan_xd4e5f6", "set_khan_xj1k2l3"]);
    expect(parsed.state.find((s) => s.arm === "B1")?.state).toBe("ok");
  });

  it.each(["body", "private_body"])("refuses a row carrying a field named %s", (field) => {
    const leaked = { ...ENVELOPE, rows: [{ ...FIRST, [field]: { key: "42" } }] };
    expect(SearchEnvelope.safeParse(leaked).success).toBe(false);
    expect(ROUTES.questionSearches.response.safeParse(leaked).success).toBe(false);
  });

  it("drops a private body nested in a row's enrichment", () => {
    const enrichment = { ...FIRST?.enrichment, body: "SECRET", private_body: { key: 42 } };
    const leaked = { ...ENVELOPE, rows: [{ ...FIRST, enrichment }] };
    for (const parsed of [
      SearchEnvelope.parse(leaked),
      ROUTES.questionSearches.response.parse(leaked),
    ]) {
      expect(parsed.rows[0]?.enrichment).toEqual(FIRST?.enrichment);
    }
  });

  it("drops a row field the bank adds before this contract names it", () => {
    const later = { ...ENVELOPE, rows: [{ ...FIRST, added_later: 1 }] };
    expect(SearchEnvelope.parse(later).rows[0]).not.toHaveProperty("added_later");
  });

  it("refuses a state outside the 5", () => {
    const odd = { ...ENVELOPE, state: [{ arm: "B1", state: "partial" }] };
    expect(SearchEnvelope.safeParse(odd).success).toBe(false);
  });
});

describe("the need", () => {
  it("takes words, skills, can_do or resemble, and refuses a need with none", () => {
    expect(Need.safeParse({ language: "pl", grade: "3", words: "dodawanie" }).success).toBe(true);
    expect(Need.safeParse({ language: "en", grade: "3", skills: ["math.add"] }).success).toBe(true);
    expect(Need.safeParse({ language: "pl", grade: "3" }).success).toBe(false);
  });

  it("refuses a field the bank schema does not name", () => {
    expect(Need.safeParse({ language: "pl", grade: "3", words: "x", sort: "new" }).success).toBe(
      false,
    );
  });
});

describe("the search route", () => {
  it("is POST /api/v1/question-searches, the need in and the envelope out", () => {
    expect(ROUTES.questionSearches.path).toBe("/api/v1/question-searches");
    expect(ROUTES.questionSearches.method).toBe("POST");
    expect(ROUTES.questionSearches.body).toBe(Need);
    expect(ROUTES.questionSearches.response).toBe(SearchEnvelope);
  });
});

/** An invented body in the derive step's shape: no Khan text, a made-up id, sha and URL. */
const BODY = {
  id: "xfeed0001",
  source: "khan",
  en: {
    family: "enter",
    data: { prompt: "What is 2 + 3?" },
    key: { accept: ["5"] },
  },
  credit: {
    source: "khan",
    url: "https://example.org/invented/xfeed0001",
    licence: "CC BY-NC-SA 4.0",
  },
  pictures: [{ ref: `${"cd".repeat(32)}.svg`, decorative: false, pl: "Dwa jabłka i trzy jabłka" }],
};

describe("the question body", () => {
  it("parses an invented body with its key and drops a field it does not name", () => {
    const parsed = QuestionBody.parse({ ...BODY, raw_item: { x: 1 } });
    expect(parsed.en?.key).toEqual({ accept: ["5"] });
    expect(parsed).not.toHaveProperty("raw_item");
  });

  it("takes a body with no playable variant yet: only id, credit and problem_type", () => {
    const waiting = { id: "xfeed0002", credit: BODY.credit, problem_type: "invented" };
    expect(QuestionBody.parse(waiting)).toEqual(waiting);
  });

  it("refuses a body with no credit, or a picture ref that is no sha", () => {
    const { credit: _, ...uncredited } = BODY;
    expect(QuestionBody.safeParse(uncredited).success).toBe(false);
    const odd = { ...BODY, pictures: [{ ref: "picture.png", decorative: true }] };
    expect(QuestionBody.safeParse(odd).success).toBe(false);
  });

  it("takes an Alfik body: source alfik, a lettered choose and the task picture", () => {
    const alfik = {
      id: "alfik_2024_k2_q07",
      source: "alfik",
      pl: {
        family: "choose",
        data: { options: ["A", "B", "C", "D", "E"] },
        key: { correct: ["C"] },
      },
      credit: { source: "alfik", licence: "© Łowcy Talentów – JERSZ" },
      pictures: [{ ref: `${"ab".repeat(32)}.png`, decorative: false }],
    };
    expect(QuestionBody.parse(alfik).source).toBe("alfik");
    expect(QuestionBody.safeParse({ ...alfik, source: "own" }).success).toBe(false);
  });

  it("names khan and alfik as its sources, and reads the source from the id", () => {
    expect(QuestionSource.options).toEqual(["khan", "alfik"]);
    expect(questionSourceOf("alfik_2024_k2_q07")).toBe("alfik");
    expect(questionSourceOf("x1a2b3c4")).toBe("khan");
    expect(questionSourceOf("abc_DEF-9")).toBe("khan");
  });

  it.each(["x1a2b3", "abc_DEF-9", "alfik_2024_k2_q07", "x".repeat(64)])(
    "takes %s as an id",
    (id) => {
      expect(BankQuestionId.safeParse(id).success).toBe(true);
    },
  );

  it.each(["", "../x", "x.json", "x/y", "x y", "x".repeat(65)])("refuses %j as an id", (id) => {
    expect(BankQuestionId.safeParse(id).success).toBe(false);
  });

  it("is GET /api/v1/questions/{id}, no body and the body out", () => {
    expect(ROUTES.questionBody.path).toBe("/api/v1/questions/{id}");
    expect(ROUTES.questionBody.method).toBe("GET");
    expect(ROUTES.questionBody.body).toBeNull();
    expect(ROUTES.questionBody.response).toBe(QuestionBody);
  });
});
