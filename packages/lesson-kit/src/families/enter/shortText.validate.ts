/**
 * The checks for a typed word's key (short_text, dl-w3.28, dl-w3.61.2), called from validate.ts.
 * Accents and a one-letter slip are about letters, so they apply to text only. The check that an
 * author's near form is not one the key takes as right needs the judge's text comparison, which is
 * `packages/core`'s, so it is not run here.
 */

import type { Family } from "../names.ts";
import type { SpecOf } from "../types.ts";

type Report = (path: string, rule: string, message: string) => void;

export function validateText(spec: SpecOf<typeof Family.Enter>, err: Report): void {
  const { data, key } = spec;
  if (data.input !== "text") {
    if (key.accents !== undefined)
      err("key.accents", "accents_on_number", "Accents apply to a typed word only.");
    if (key.typo !== undefined)
      err("key.typo", "typo_on_number", "A one-letter slip applies to a typed word only.");
  }
}
