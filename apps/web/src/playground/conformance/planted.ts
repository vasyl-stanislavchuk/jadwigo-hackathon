/**
 * The wave's planted fixture (docs/worklog/dl-a38n.32/2026-10-30-wave-1.md, "The planted
 * fixture"): a converted-pl.json-shaped file of made-up items, built here and never from bank data
 * (AGENTS.md fence 8). Tests only. Each item plants one way an item is not lesson-ready.
 */

const OPTIONS = [
  { id: "o1", content: { kind: "text", text: "4" } },
  { id: "o2", content: { kind: "text", text: "5" } },
];
const DATA = { stem: { text: "Ile to 2 + 2?" }, options: OPTIONS, select: "many", layout: "list" };
const CHECKED = {
  kind: "plays",
  rules_version: "sha256:planted",
  checked_at: "2026-10-30T00:00:00Z",
};

function item(id: string, data: unknown, key: unknown, status: unknown = CHECKED) {
  return {
    id,
    language: "pl",
    exercise: "planted-exercise",
    exercise_title: "Planted",
    problem_type: "Planted",
    grade: 3,
    credit: {
      source: "khan",
      url: "https://example.invalid/planted",
      licence: "CC BY-NC-SA 3.0",
      original_lang: "pl",
      ref: "planted",
    },
    spec: {
      id,
      family: "choose",
      question_type: "multi_select",
      data,
      key,
      say: "Wybierz.",
      phase: "practice",
    },
    status,
  };
}

/** A ref no media URL serves: 40 hex digits and an extension. */
const UNSERVED_REF = "0123456789abcdef0123456789abcdef01234567.png";

/** The fixture's items, by what each plants. */
export const PLANTED = {
  /** Compiles, grades and draws. */
  ready: item("planted-ready", DATA, { correct: ["o1"] }),
  /** An option whose text holds inline TeX. */
  tex: item(
    "planted-tex",
    { ...DATA, options: [{ id: "o1", content: { kind: "text", text: "$2+2$" } }, OPTIONS[1]] },
    { correct: ["o1"] },
  ),
  /** A key naming an option id that is not among the options. */
  key: item("planted-key", DATA, { correct: ["o9"] }),
  /** A picture whose src is a ref no media URL serves. */
  picture: item(
    "planted-picture",
    {
      ...DATA,
      options: [
        { id: "o1", content: { kind: "image", image: UNSERVED_REF, alt: "cztery" } },
        OPTIONS[1],
      ],
    },
    { correct: ["o1"] },
  ),
  /** Plays, with no checked_at: jw's "not checked"; the page itself finds nothing. */
  unchecked: item("planted-unchecked", DATA, { correct: ["o1"] }, { kind: "plays" }),
  /** A field the contract has no place for: not strict. */
  loose: item("planted-loose", { ...DATA, colour: "red" }, { correct: ["o1"] }),
} as const;

/** The fixture as the conversion writes it. */
export const plantedFile = () => ({
  generated_by: "planted (apps/web/src/playground/conformance/planted.ts)",
  licence_note: "made up for tests",
  items: Object.values(PLANTED),
});
