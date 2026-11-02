/**
 * A word formula: TeX that is only words in `\text{…}`, each maybe coloured, joined by signs, as in
 * a hint's "$\blueD{\text{Number of rows}}\times\purpleC{\text{Number of objects in each row}}=…$"
 * (dl-uukj.52). KaTeX sets a span on one line (rule 17: a formula never breaks), so at 420 px such a
 * line ran off the help card and was cut. It is a sentence, not a formula: RichText draws it a word
 * at a time, each word its own KaTeX span in its colour, so the line breaks between words. A sign
 * stays on the line of the word before it.
 */
import { isColourMacro } from "./richTextMacros.ts";

/** One piece of a word formula: a word as TeX (`\blueD{\text{rows}}`) or a sign as text ("×"). */
export type FormulaPiece = { kind: "word"; tex: string } | { kind: "sign"; text: string };

const SIGNS: Record<string, string> = {
  "\\times": "×",
  "\\cdot": "·",
  "\\div": "÷",
  "\\mathbin{:}": ":",
  ":": ":",
  "=": "=",
  "+": "+",
  "-": "−",
  "−": "−",
};

const GROUP = /^(?:\\([A-Za-z]+)\s*\{\s*\\text\s*\{([^{}\\$]*)\}\s*\}|\\text\s*\{([^{}\\$]*)\})/;
const SIGN = /^(?:\\times|\\cdot|\\div|\\mathbin\{:\}|[=+\-−:])(?![A-Za-z])/;

/** The pieces of a word formula, or null when the TeX is anything else (KaTeX draws it whole). */
export function wordFormula(tex: string): FormulaPiece[] | null {
  const pieces: FormulaPiece[] = [];
  let rest = tex.trim();
  let phrase = false;
  while (rest !== "") {
    const group = GROUP.exec(rest);
    const sign = group ? null : SIGN.exec(rest);
    if (group) {
      const colour = group[1];
      if (colour !== undefined && !isColourMacro(colour)) return null;
      const words = (group[2] ?? group[3] ?? "").trim().split(/\s+/).filter(Boolean);
      if (words.length > 1) phrase = true;
      for (const w of words)
        pieces.push({
          kind: "word",
          tex: colour === undefined ? `\\text{${w}}` : `\\${colour}{\\text{${w}}}`,
        });
      rest = rest.slice(group[0].length).trimStart();
    } else if (sign) {
      pieces.push({ kind: "sign", text: SIGNS[sign[0]] ?? sign[0] });
      rest = rest.slice(sign[0].length).trimStart();
    } else return null;
  }
  // Only a phrase of 2 words or more needs breaking; "\text{cm}" or "3 \text{ rows}" stays whole.
  return phrase && pieces.some((p) => p.kind === "sign") ? pieces : null;
}
