/**
 * fraction_shade (dl-w3.61.7): the checks for a shape to shade. The judge is `packages/core`'s and
 * the solution (the first `count` parts) is in families/answer.ts.
 */

import type { Surface } from "../names.ts";
import type { PlaceData, PlaceKey } from "./model.ts";

type FractionData = Extract<PlaceData, { surface: typeof Surface.Fraction }>;
type FractionKey = Extract<PlaceKey, { surface: typeof Surface.Fraction }>;

type Report = (path: string, rule: string, message: string) => void;

/** The checks (docs/18 §7d): 2 to 12 equal parts, a rectangle's rows divide them, and the count
 * is a number of those parts. */
export function fractionProblems(
  data: FractionData,
  key: FractionKey,
  err: Report,
  warn: Report,
): void {
  if (!Number.isInteger(data.parts) || data.parts < 2 || data.parts > 12)
    err("data.parts", "fraction_parts", "A shape to shade is cut into 2 to 12 equal parts.");
  if (data.shape === "rect") {
    const rows = data.rows ?? 1;
    if (!Number.isInteger(rows) || rows < 1 || data.parts % rows !== 0)
      err("data.rows", "fraction_rows", "A rectangle’s rows must divide its parts evenly.");
  } else if (data.rows !== undefined)
    warn("data.rows", "fraction_rows", "Only a rectangle takes rows.");
  // A part is a tap target: past 8 on a bar, a phone draws it narrower than a finger.
  if (data.shape === "bar" && data.parts > 8)
    warn(
      "data.parts",
      "fraction_narrow",
      "More than 8 parts on a bar are narrower than a finger on a phone: use a rectangle in rows.",
    );
  if (!Number.isInteger(key.count) || key.count < 0 || key.count > data.parts)
    err(
      "key.count",
      "fraction_count",
      "The parts to shade are a whole number from 0 to the parts there are.",
    );
  if (data.label.trim() === "") err("data.label", "empty_label", "Say which fraction to shade.");
}
