/**
 * A TeX span of numbers and signs alone, read as text (the lesson frame's rule 17): `7 + 5 = 12`
 * prints in the lesson's face on one line, and only the rest goes to KaTeX. Shared by RichText.tsx
 * and the print sheet's text (src/paper/text.ts), which runs without React or a DOM.
 */

/** TeX that is only numbers and signs, with the macros that name a sign: drawn as text. A letter,
 * a brace or any other macro (a variable, a colour, a fraction) leaves it to KaTeX. */
const PLAIN_TEX =
  /^(?:[\d \t\n.,:?!()<>=+\-−×·÷]|\{,\}|\\(?:times|cdot|div|,|;|mathbin\{:\})(?![A-Za-z]))*$/;
const PLAIN_SIGNS: Record<string, string> = {
  "\\times": "×",
  "\\cdot": "·",
  "\\div": "÷",
  "\\mathbin{:}": ":",
  "\\,": " ",
  ";": " ",
  "{,}": ",",
};

/** The text a plain TeX span reads as, or null when it needs KaTeX. */
export function plainTex(tex: string): string | null {
  if (!PLAIN_TEX.test(tex)) return null;
  const text = tex
    .replace(/[ \t\n]+/g, "")
    .replace(/\\(?:times|cdot|div|mathbin\{:\}|,|;)|\{,\}/g, (m) => PLAIN_SIGNS[m] ?? m)
    .replace(/-/g, "−");
  // TeX ignores spaces: a sign between two terms takes one on each side, as in the lesson's text.
  return text.replace(/(?<=[\d)])([=+−×·÷:<>])(?=[\d(−])/g, " $1 ");
}
