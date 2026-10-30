/**
 * What the check reports (dl-a38n, lead decision 2): a list of findings, never the first error
 * alone. Each names the step, a path into the lesson file, a level, a rule the reader can cite,
 * what is wrong and what to do. md drops' `Finding(line, level, rule, text, path)` is the model
 * (medallion-dev-cli drop_lint.py). Lane import makes check.ts return `findings`; the builder's
 * step table tints a row by its worst finding.
 */

export const FINDING_LEVELS = ["error", "warn"] as const;
export type FindingLevel = (typeof FINDING_LEVELS)[number];

export interface Finding {
  /** The step it is about, or null for the lesson as a whole. */
  step_id: string | null;
  /** A path into the lesson file, e.g. `script.parts[1].steps[2].question.help.boost`. */
  path: string;
  level: FindingLevel;
  /** A short name the reader can cite, e.g. `empty-rung`, `unknown-mistake-class`. */
  rule: string;
  text: string;
  fix: string;
}

/** The worst level among findings, or null when there are none. */
export function worstLevel(findings: readonly Finding[]): FindingLevel | null {
  let worst: FindingLevel | null = null;
  for (const f of findings) {
    if (f.level === "error") return "error";
    worst = "warn";
  }
  return worst;
}
