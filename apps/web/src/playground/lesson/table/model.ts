/**
 * The step table's rows (dl-a38n.12), one per question step in script order, as pure data so a
 * test reads them without drawing: n, the step id (the anchor of the drawn step), its skills,
 * family, key, how many of its 5 rungs are written, its findings, and the row's tone from the worst
 * of them. md drops' table is the model for the ideas: typed columns, a tone per row, a row anchor.
 */

import type { Finding, FindingLevel } from "@jadwigo/lesson-import";
import type { FamilySpec } from "@jadwigo/lesson-kit";
import type { PartSpecs } from "../adapter.ts";
import { rungsOf } from "../rungs.ts";
import { worstOf } from "./findings.ts";

export interface StepRow {
  n: number;
  step_id: string;
  part: string;
  skills: string[];
  /** The family, or null for a step the adapter skipped. */
  family: string | null;
  /** The key in a line; "" for a step the adapter skipped. */
  key: string;
  /** Why the adapter skipped the step, or null when it is drawn. */
  skipped: string | null;
  rungs: { written: number; of: number };
  findings: number;
  tone: FindingLevel | null;
}

const MAX_KEY = 48;

/** A key in one line: Enter's accepted answers, Choose's right options, else its JSON. */
function keyText(spec: FamilySpec): string {
  const text =
    spec.family === "enter"
      ? spec.key.accept.join(" / ")
      : spec.family === "choose"
        ? spec.key.correct.join(", ")
        : JSON.stringify(spec.key);
  return text.length > MAX_KEY ? `${text.slice(0, MAX_KEY - 1)}…` : text;
}

/** One row per question step of `parts`, with `findings` counted against their step. */
export function stepRows(parts: readonly PartSpecs[], findings: readonly Finding[]): StepRow[] {
  let n = 0;
  return parts.flatMap(({ part, steps }) =>
    steps.map((step) => {
      n += 1;
      const mine = findings.filter((f) => f.step_id === step.step_id);
      const common = {
        n,
        step_id: step.step_id,
        part,
        findings: mine.length,
        tone: worstOf(mine),
      };
      if (step.kind === "skipped")
        return {
          ...common,
          skills: [],
          family: null,
          key: "",
          skipped: step.reason,
          rungs: { written: 0, of: 5 },
        };
      const rungs = rungsOf(step.spec);
      return {
        ...common,
        skills: step.skill_ids,
        family: step.spec.family,
        key: keyText(step.spec),
        skipped: null,
        rungs: { written: rungs.filter((r) => r.written).length, of: rungs.length },
      };
    }),
  );
}
