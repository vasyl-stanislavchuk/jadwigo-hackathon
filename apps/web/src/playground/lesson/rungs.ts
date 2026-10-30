/**
 * Which help rungs a step has written, as the builder's rungs strip shows them: look, boost,
 * almost, worked and the twin. A draft may hold an empty rung (lead decision 1), so a rung counts
 * as written only when some line in it has words.
 */

import type { FamilySpec } from "@jadwigo/lesson-kit";

const RUNGS = ["look", "boost", "almost", "worked", "twin"] as const;
type RungName = (typeof RUNGS)[number];

/** Whether `value` holds a line with words in it, at any depth. */
function hasWords(value: unknown): boolean {
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.some(hasWords);
  if (value !== null && typeof value === "object") return Object.values(value).some(hasWords);
  return false;
}

/** Each rung of `spec`'s ladder, in order, and whether it is written. The twin counts as written
 * when it is there: the adapter only keeps a twin it can draw. */
export function rungsOf(spec: FamilySpec): { rung: RungName; written: boolean }[] {
  const help = (spec.help ?? {}) as Record<string, unknown>;
  return RUNGS.map((rung) => ({
    rung,
    written: rung === "twin" ? help["twin"] !== undefined : hasWords(help[rung]),
  }));
}
