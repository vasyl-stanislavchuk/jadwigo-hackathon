import type { Need, SearchEnvelope, SearchRow } from "@jadwigo/contracts";
import { publicEnvelope, ranked, statesFor } from "./envelope.ts";
import type { BankSearch } from "./ports.ts";

/** The arm a search answers with by default: C, keyword over every language (decision
 * 2026-10-28-the-default-search-arm-is-c-keyword-search-over-every-language-p). */
export const DEFAULT_ARM = "C";

/**
 * A question set's row in the real shape, with every field the bank fills. Written here, never
 * copied from a source: the titles, skills and hashes are made up (no bank in git).
 */
export function setRow(
  overrides: Partial<SearchRow> & Pick<SearchRow, "id" | "titles">,
): SearchRow {
  return {
    rank: 1,
    score: 1,
    arm: DEFAULT_ARM,
    vector_score: null,
    bm25_score: null,
    rerank_score: null,
    best_view: "title",
    grade: "2",
    languages: Object.keys(overrides.titles),
    skill_ids: [],
    curriculum_tags: [],
    problem_types: [],
    question_types: ["numeric-input"],
    views: ["title", "samples"],
    source: "own",
    media: [],
    items: 8,
    ...overrides,
  };
}

/** The fixture bank's revision, standing where a published bank names its index manifest's sha256. */
export const FIXTURE_REV = "fixture";

/** The fixture bank's sets: a Khan-shaped one, an own set and one in Polish spelling. */
export const FIXTURE_ROWS: readonly SearchRow[] = [
  setRow({
    id: "set_khan_xf1x001",
    titles: { en: "Add within 20", pl: "Dodawanie w zakresie 20" },
    grade: "1",
    skill_ids: ["maths.add.within20"],
    curriculum_tags: ["ccss:1.OA.C.6"],
    problem_types: ["add-one-digit"],
    source: "khan",
    credit: "Khan Academy, CC BY-NC-SA 4.0, https://www.khanacademy.org/e/fixture-add-within-20",
    enrichment: {
      summary: { en: "Adding two numbers with a sum up to 20.", pl: "Dodawanie do 20." },
      mistake_classes: [
        {
          id: "counting-on",
          pl: "liczy od 1 zamiast od większej",
          en: "counts from 1, not on",
          spot: "8 + 3 answered 10",
        },
      ],
    },
    content_hash: "f1".repeat(32),
    items: 12,
  }),
  setRow({
    id: "set_own_fx0002",
    titles: { pl: "Mnożenie przez 2 i 5", en: "Multiply by 2 and 5" },
    grade: "2",
    skill_ids: ["maths.multiply.facts"],
    problem_types: ["times-table"],
    enrichment: {
      summary: {
        en: "Times tables of 2 and 5 in pictures.",
        pl: "Tabliczka mnożenia 2 i 5 na obrazkach.",
      },
      contexts: { en: ["shopping"], pl: ["zakupy"] },
    },
    content_hash: "f2".repeat(32),
  }),
  setRow({
    id: "set_own_fx0003",
    titles: { pl: "Ułamki: połowa i ćwierć" },
    grade: "3",
    skill_ids: ["maths.fractions.unit"],
    problem_types: ["name-the-fraction"],
    question_types: ["choose"],
    enrichment: { summary: { pl: "Połowa i ćwierć figury, zaznaczone na rysunku." } },
    content_hash: "f3".repeat(32),
    items: 6,
  }),
];

/** Lower case, Polish letters folded, split into words: "Ułamki" and "ulamki" meet. */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .replaceAll("ł", "l")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 1);
}

function needWords(need: Need): Set<string> {
  const parts = [need.words, need.words_en, need.can_do, need.resemble, ...(need.skills ?? [])];
  return new Set(parts.flatMap((part) => (part === undefined ? [] : words(part))));
}

function rowWords(row: SearchRow): Set<string> {
  const parts = [
    ...Object.values(row.titles),
    ...(row.skill_ids ?? []),
    ...(row.problem_types ?? []),
    ...Object.values(row.enrichment?.summary ?? {}),
  ];
  return new Set(parts.flatMap(words));
}

/**
 * Arm C over the given sets, in memory: a set's score is the share of the need's words it holds,
 * ties broken by id. No set holding any word is `empty`, never an error.
 */
export function fixtureSearch(rows: readonly SearchRow[] = FIXTURE_ROWS): BankSearch {
  return {
    async search(need) {
      const asked = needWords(need);
      const scored = rows
        .map((row) => {
          const held = rowWords(row);
          const hits = [...asked].filter((word) => held.has(word)).length;
          return { row, score: asked.size === 0 ? 0 : hits / asked.size };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score || (a.row.id < b.row.id ? -1 : 1))
        .slice(0, need.limit ?? 20)
        .map(({ row, score }) => ({ ...row, score, bm25_score: score }));
      const answer: SearchEnvelope = {
        version: 1,
        need,
        arm: DEFAULT_ARM,
        stage: "final",
        timing_ms: { keyword: 0, total: 0 },
        cache: "off",
        bank_rev: FIXTURE_REV,
        rows: ranked(scored, DEFAULT_ARM),
        state: statesFor(DEFAULT_ARM, scored.length > 0 ? "ok" : "empty"),
      };
      return publicEnvelope(answer);
    },
  };
}
