import { describe, expect, it } from "vitest";
import { Need, SearchEnvelope } from "./bank.ts";
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
