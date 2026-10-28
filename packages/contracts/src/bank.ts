import { z } from "zod";
import { Language } from "./records.ts";

/**
 * The question bank's seam: the need a caller sends and the envelope the bank answers with.
 *
 * Written from `schemas/need.schema.json` and `schemas/search-envelope.schema.json` in the
 * `jadwigo-bank` repo at commit `ac60440`, the commit `david-learns` pins too. The bank owns these
 * shapes: a field is added there first and here second, and the snapshots in `schemas/` say which
 * bank commit they follow. Route: `ROUTES.questionSearches` (decision
 * `jadwigo-question-bank/decisions/2026-10-28-the-bank-s-search-route-is-post-api-v1-question-searches`).
 */
export const BANK_COMMIT = "ac60440";

const Words = z.array(z.string());

/**
 * What a caller sends search: a need, not a sentence. It carries at least one of `words`,
 * `skills`, `can_do` or `resemble` (the bank schema's `anyOf`, a refinement here).
 */
export const Need = z
  .strictObject({
    words: z.string().describe("The need in plain words, in the caller's language").optional(),
    words_en: z
      .string()
      .describe(
        "English terms for the keyword arm when the need is not in English; never stored on a page",
      )
      .optional(),
    skills: Words.optional(),
    mistakes: Words.optional(),
    can_do: z.string().optional(),
    contexts: Words.optional(),
    curriculum_tags: Words.describe("e.g. pl-2017:II.3.3, ccss:3.OA.C.7").optional(),
    resemble: z.string().describe("A task to resemble, e.g. a homework problem's text").optional(),
    language: Language,
    grade: z.string().describe('Canonical form: the bare number, e.g. "3"'),
    limit: z.int().min(1).optional(),
  })
  .refine(
    (need) =>
      need.words !== undefined ||
      need.skills !== undefined ||
      need.can_do !== undefined ||
      need.resemble !== undefined,
    { message: "a need carries words, skills, can_do or resemble" },
  )
  .describe(
    `A search need, from jadwigo-bank schemas/need.schema.json at commit ${BANK_COMMIT}. It carries at least one of words, skills, can_do or resemble.`,
  );
export type Need = z.infer<typeof Need>;

/** How every arm of one search came out: `ok`, `empty`, `abstained`, `degraded` or `not_asked`. */
const SearchStateValue = z.enum(["ok", "empty", "abstained", "degraded", "not_asked"]);

const SearchState = z.object({
  arm: z.string(),
  state: SearchStateValue,
  detail: z
    .string()
    .describe(
      "What degraded it (an embedder or reranker failure), never a key or a URL with a token",
    )
    .optional(),
});
export type SearchState = z.infer<typeof SearchState>;

const Score = z.number().nullable().optional();

/**
 * One ranked question set. Fields the bank adds later are dropped on parse; a private body is
 * refused outright, so it can never leave through the route (`body` and `private_body` are
 * `never`, which JSON Schema writes as `not: {}`).
 */
const SearchRow = z.object({
  id: z.string().regex(/^set_/),
  rank: z.int().min(1),
  score: z.number(),
  arm: z.string(),
  vector_score: Score,
  bm25_score: Score,
  rerank_score: Score,
  best_view: z
    .string()
    .nullable()
    .describe(
      "The index view the vector hit came from: title, samples, meaning_pl, meaning_en, needs",
    )
    .optional(),
  view_scores: z.record(z.string(), z.number()).optional(),
  grade: z.string().nullable().optional(),
  titles: z.record(z.string(), z.string()).describe("By language code: pl, en"),
  languages: Words.optional(),
  skill_ids: Words.optional(),
  curriculum_tags: Words.optional(),
  problem_types: Words.optional(),
  question_types: Words.optional(),
  views: Words.optional(),
  source: z.string().describe("Where the set's questions come from: khan, own, ai").optional(),
  credit: z
    .string()
    .describe(
      "The attribution line the product must show: Khan Academy, CC BY-NC-SA 4.0 and the exercise's URL",
    )
    .optional(),
  enrichment: z
    .record(z.string(), z.unknown())
    .describe(
      "The set's enrichment fields the caller may show: summary, can_do, mistake_classes, contexts",
    )
    .optional(),
  content_hash: z.string().describe("sha256 of the set page the row was built from").optional(),
  media: Words.describe("shas of the pictures the set's questions need").optional(),
  items: z.int().describe("How many questions the set holds (the bank's field name)").optional(),
  body: z.never().describe("A private body never crosses this route").optional(),
  private_body: z.never().describe("A private body never crosses this route").optional(),
});
export type SearchRow = z.infer<typeof SearchRow>;

/** What a bank search returns: question sets ranked, and the state of every arm. */
export const SearchEnvelope = z
  .object({
    version: z.literal(1),
    need: Need.optional(),
    arm: z.string().describe("The arm that answered (A, A1, B, B1, C, C2)").optional(),
    stage: z.enum(["first", "final"]).optional(),
    timing_ms: z
      .object({
        embed: z.number().optional(),
        vectors: z.number().optional(),
        rows: z.number().optional(),
        keyword: z.number().optional(),
        rerank: z.number().optional(),
        total: z.number().optional(),
      })
      .describe("Server-side stage times in milliseconds")
      .optional(),
    cache: z.enum(["hit", "miss", "off"]).optional(),
    rows: z.array(SearchRow),
    state: z
      .array(SearchState)
      .describe("One row per known arm: the asked arm's outcome and not_asked for the rest"),
  })
  .describe(
    `A bank search's answer, version 1, from jadwigo-bank schemas/search-envelope.schema.json at commit ${BANK_COMMIT}.`,
  );
export type SearchEnvelope = z.infer<typeof SearchEnvelope>;
