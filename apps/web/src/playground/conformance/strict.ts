/**
 * The strict compile of one converted item (dl-a38n.32.2): the checks `compileProblems` makes on a
 * question step (packages/lesson-import/src/compile.ts, `body` and `strictly`), run in the page.
 * compile.ts needs `node:crypto` and is not in the browser-safe `/file` entry, so this mirrors its
 * question checks with the same contract schemas: the question type's family, the family's data
 * and key (`FamilyQuestion`), the help ladder less its twin (`Help`), and no field the contract
 * would silently drop, under compile.ts's own rules: `question-type-family`, `contract` and
 * `unknown-field`, each for the converter to fix. Like compile.ts it stops at the first of them that
 * fails. strict.test.ts runs lesson-import's real check over the planted items, so a drift between
 * this mirror and compile.ts fails a test. The mirror goes once `dl-e8ov.2.86` exports the check
 * from `@jadwigo/lesson-import/file`.
 */

import { FamilyQuestion, Help, QUESTION_TYPE_FAMILY, QuestionType } from "@jadwigo/contracts";
import type { Finding } from "@jadwigo/lesson-import/file";
import type { ConvertedItem } from "./items.ts";

/** A question as the judge reads it: the family's data and key, its question type and help. */
export type StrictQuestion = FamilyQuestion & { question_type: QuestionType; help?: Help };

const FIX =
  "The converter (to_family_pl) must write this item to its family's contract (packages/contracts/src/families/), or leave it waiting.";

/** A Zod path as the converted file writes it: `spec.data.options[2].text`. */
function pathOf(at: string, path: readonly PropertyKey[]): string {
  return path.reduce<string>(
    (p, k) => (typeof k === "number" ? `${p}[${k}]` : `${p}.${String(k)}`),
    at,
  );
}

/** Every path in `given` that `kept` lacks: what a Zod object stripped without a word. */
function dropped(given: unknown, kept: unknown, path: string): string[] {
  if (Array.isArray(given)) {
    return given.flatMap((v, i) =>
      dropped(v, (kept as unknown[] | undefined)?.[i], `${path}[${i}]`),
    );
  }
  if (given === null || typeof given !== "object") return [];
  const out = (kept ?? {}) as Record<string, unknown>;
  return Object.entries(given).flatMap(([k, v]) =>
    k in out ? dropped(v, out[k], `${path}.${k}`) : [`${path}.${k}`],
  );
}

type Rule = "question-type-family" | "contract" | "unknown-field";

function finding(item_id: string, rule: Rule, path: string, text: string): Finding {
  return { step_id: item_id, path, level: "error", rule, text, fix: FIX };
}

/** `value` parsed with `schema`, or the findings that say why not. */
function strictly<S extends typeof FamilyQuestion | typeof Help>(
  item_id: string,
  schema: S,
  value: unknown,
  at: string,
): { data: ReturnType<S["parse"]> } | { findings: Finding[] } {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return {
      findings: parsed.error.issues.map((i) =>
        finding(item_id, "contract", pathOf(at, i.path), `The contract refuses it: ${i.message}.`),
      ),
    };
  }
  const lost = dropped(value, parsed.data, at);
  if (lost.length > 0) {
    return {
      findings: lost.map((path) =>
        finding(item_id, "unknown-field", path, "The contract has no field for this."),
      ),
    };
  }
  return { data: parsed.data as ReturnType<S["parse"]> };
}

type Body = { question: StrictQuestion; findings: [] } | { question: null; findings: Finding[] };

/** The item's question and its twin's, the twin null when it has none, or why they do not compile. */
type Compiled =
  | { question: StrictQuestion; twin: StrictQuestion | null; findings: [] }
  | { question: null; findings: Finding[] };

/** One question (the item's own, or its twin) as compile.ts's `body` checks it, under `at`. */
function body(item_id: string, type: QuestionType, raw: Record<string, unknown>, at: string): Body {
  const { help: rawHelp, ...spec } = raw;
  const family = QUESTION_TYPE_FAMILY[type];
  if (family !== spec["family"]) {
    const text = `${type} is a ${family} question, not ${String(spec["family"])}.`;
    return {
      question: null,
      findings: [finding(item_id, "question-type-family", `${at}.family`, text)],
    };
  }
  const question = strictly(item_id, FamilyQuestion, spec, at);
  if ("findings" in question) return { question: null, findings: question.findings };
  const { twin: _twin, ...ladder } = (rawHelp ?? {}) as Record<string, unknown>;
  const help = strictly(item_id, Help, ladder, `${at}.help`);
  if ("findings" in help) return { question: null, findings: help.findings };
  const compiled = { ...question.data, question_type: type };
  return {
    question: rawHelp === undefined ? compiled : { ...compiled, help: help.data },
    findings: [],
  };
}

/**
 * The item's question compiled strictly, or every reason it does not compile: its own question,
 * then its twin (`help.twin`, less its `say`), which the import writes as a spare question.
 */
export function compileStrictly(item: ConvertedItem): Compiled {
  const spec = item.spec ?? {};
  const type = QuestionType.safeParse(spec.question_type);
  if (!type.success) {
    const text = `${String(spec.question_type)} is not a question type.`;
    return { question: null, findings: [finding(item.id, "contract", "spec.question_type", text)] };
  }
  const own = body(
    item.id,
    type.data,
    {
      family: spec.family,
      data: spec.data,
      key: spec.key,
      ...(spec.help === undefined ? {} : { help: spec.help }),
    },
    "spec",
  );
  if (own.question === null) return own;
  const alone = { question: own.question, twin: null, findings: [] as [] };
  const twin = (spec.help as { twin?: unknown } | undefined)?.twin;
  if (twin === null || typeof twin !== "object") return alone;
  const { say: _say, ...twinQuestion } = twin as Record<string, unknown>;
  // A twin's own twin is compile.ts's `twin-of-twin`, which this page does not mirror.
  if ((twinQuestion["help"] as { twin?: unknown } | undefined)?.twin !== undefined) return alone;
  const second = body(item.id, type.data, twinQuestion, "spec.help.twin");
  return second.question === null ? second : { ...alone, twin: second.question };
}
