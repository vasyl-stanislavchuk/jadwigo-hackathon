/**
 * Whether an item's key grades (dl-a38n.32.2): the key's own answer, `solutionOf(q)`, judged with
 * the server's judge, `judge(q, …)`, must come back correct. A key that names an option the item
 * does not have, or an answer its own entry cannot take, fails here: a child who answers right
 * would be told wrong. Each miss is a finding with rule `key-grades`, for the converter to fix.
 */

import { judge, solutionOf } from "@jadwigo/core";
import type { Finding } from "@jadwigo/lesson-import/file";
import type { StrictQuestion } from "./strict.ts";

const FIX =
  "The converter (to_family_pl) must write a key whose own answer its judge marks right: every id it names among the item's options, parts or gaps, every typed answer one the entry takes.";

/** The key's shape in a few words: its fields, and the ids or answers it names. */
function keyShape(key: unknown): string {
  const text = JSON.stringify(key) ?? "";
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
}

/** The finding when the key's own answer does not grade, or none: `at` is the question's place,
 * `spec` for the item's own and `spec.help.twin` for its twin. */
export function keyFindings(item_id: string, question: StrictQuestion, at = "spec"): Finding[] {
  let why: string | null;
  try {
    const verdict = judge(question, solutionOf(question));
    why = verdict.correct ? null : `the judge marks it ${verdict.mistake_class ?? "wrong"}`;
  } catch (e) {
    why = `the judge threw: ${e instanceof Error ? e.message : String(e)}`;
  }
  if (why === null) return [];
  return [
    {
      step_id: item_id,
      path: `${at}.key`,
      level: "error",
      rule: "key-grades",
      text: `The ${question.family} key's own answer does not grade (${why}); the key is ${keyShape(question.key)}.`,
      fix: FIX,
    },
  ];
}
