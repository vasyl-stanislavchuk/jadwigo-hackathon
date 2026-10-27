/**
 * The KaTeX macro table and the one render call (dl-r772.6). Khan's items colour their maths with
 * about fifty commands, `\blueD{7}`, `\greenD{4}`, `\purpleC{28}` (docs/research/
 * khan-academy-question-types.md §4). Khan's renderer folds them into ten accessible colours; here
 * each folds into a CSS class on one of ten roles, `\htmlClass{tex-blue}{#1}`, whose colour is a
 * token in styles/tokens.css, light and dark. The same table as scripts/khan/gallery.py
 * `tex_macros()`, which paints hex values for the picker instead.
 *
 * Two KaTeX details from the research note. A literal `#` in a macro body is written `##`, or KaTeX
 * reads it as an argument; with classes no body holds one. MathJax lets `\begin{align}` sit inline
 * and KaTeX only allows it in display maths, so `align` is rewritten to `aligned` before rendering.
 */

import katex from "katex";
import type { Language } from "../stage/types.ts";
import { notationTex } from "./notation.ts";
import { texRanges } from "./richTextParse.ts";

export type TexRole =
  | "blue"
  | "green"
  | "gold"
  | "red"
  | "pink"
  | "purple"
  | "violet"
  | "gray"
  | "gray-h"
  | "gray-i";

export const TEX_ROLES: readonly TexRole[] = [
  "blue",
  "green",
  "gold",
  "red",
  "pink",
  "purple",
  "violet",
  "gray",
  "gray-h",
  "gray-i",
];

/** The class a role paints with: `.tex-blue { color: var(--tex-blue) }` in tokens.css. */
export const texClass = (role: TexRole): string => `tex-${role}`;

const paint = (role: TexRole) => `\\htmlClass{${texClass(role)}}{#1}`;

// Khan's colour families and the role each folds into (mathjax-renderer 3.0.2, tex-input-config.js):
// teal goes to green, maroon to pink, purple A to D to violet and purple E to purple.
const FAMILIES: Record<string, { role: TexRole; shades: string }> = {
  blue: { role: "blue", shades: "ABCDE" },
  teal: { role: "green", shades: "ABCDE" },
  green: { role: "green", shades: "ABCDE" },
  mint: { role: "green", shades: "ABC" },
  gold: { role: "gold", shades: "ABCDE" },
  red: { role: "red", shades: "ABCDE" },
  maroon: { role: "pink", shades: "ABCDE" },
  purple: { role: "violet", shades: "ABCD" },
  gray: { role: "gray", shades: "ABCDEFG" },
};
const PLAIN: Record<string, TexRole> = {
  blue: "blue",
  kaBlue: "blue",
  green: "green",
  kaGreen: "green",
  orange: "gold",
  gold: "gold",
  red: "red",
  pink: "pink",
  purple: "purple",
  purpleE: "purple",
  gray: "gray",
  grayH: "gray-h",
  grayI: "gray-i",
};

function colourMacros(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, role] of Object.entries(PLAIN)) out[`\\${name}`] = paint(role);
  for (const [family, { role, shades }] of Object.entries(FAMILIES))
    for (const shade of shades) out[`\\${family}${shade}`] = paint(role);
  return out;
}

/** Every macro a Khan item may use: the colours, and the few named commands Khan adds to TeX. */
export const TEX_MACROS: Readonly<Record<string, string>> = {
  ...colourMacros(),
  "\\lcm": "\\operatorname{lcm}",
  "\\gcf": "\\operatorname{gcf}",
  "\\infin": "\\infty",
  "\\rarr": "\\rightarrow",
  "\\rArr": "\\Rightarrow",
  "\\bold": "\\mathbf",
  "\\sout": "\\cancel",
  "\\mbox": "\\text",
};

/** The colour macros by name, `blueE` and so on: the ones whose argument the brace pre-pass guards. */
const COLOUR_NAMES: ReadonlySet<string> = new Set(
  Object.keys(colourMacros()).map((k) => k.slice(1)),
);

/** Commands with a fixed number of arguments whose slots Khan fills with a bare colour macro. */
const ARITY: Readonly<Record<string, number>> = {
  underline: 1,
  overline: 1,
  text: 1,
  mbox: 1,
  sqrt: 1,
  boxed: 1,
  cancel: 1,
  overset: 2,
  underset: 2,
  frac: 2,
  dfrac: 2,
  tfrac: 2,
};

/** Where the one TeX token starting at `i` ends: a control word, a control symbol, a braced group
 * (braces matched, `\{` and `\}` skipped) or one character. */
function tokenEnd(tex: string, i: number): number {
  if (tex[i] === "\\") {
    let j = i + 1;
    if (/[A-Za-z]/.test(tex[j] ?? "")) while (/[A-Za-z]/.test(tex[j] ?? "")) j++;
    else j++;
    return Math.min(j, tex.length);
  }
  if (tex[i] === "{") {
    let depth = 0;
    for (let j = i; j < tex.length; j++) {
      if (tex[j] === "\\") j++;
      else if (tex[j] === "{") depth++;
      else if (tex[j] === "}" && --depth === 0) return j + 1;
    }
    return tex.length;
  }
  return i + 1;
}

const skipSpace = (tex: string, i: number): number => {
  while (i < tex.length && /\s/.test(tex[i] ?? "")) i++;
  return i;
};

/**
 * Khan writes a colour macro as a bare argument, `\overset{\blueE1}\purpleD4` or
 * `\underline\blueE6`. KaTeX hands a bare argument exactly one token, so the macro gets no `#1`
 * and the span fails ("Unexpected end of input in a macro argument"). MathJax reads it the TeX way.
 * This pass braces the macro with its argument, `\overset{\blueE1}{\purpleD4}`, for the commands
 * in ARITY only, and leaves every other byte as it was. A scanner, not a regex: an argument may
 * nest groups three deep (`\underline\goldE{+\phantom{2}{2{,}100}}`).
 */
function braceColourArguments(tex: string): string {
  let out = "";
  let i = 0;
  while (i < tex.length) {
    const end = tokenEnd(tex, i);
    const token = tex.slice(i, end);
    const slots = token.startsWith("\\") ? ARITY[token.slice(1)] : undefined;
    // A braced group is scanned inside too, so a command nested in it is fixed as well.
    if (token.length > 1 && token[0] === "{") {
      const closed = token.endsWith("}");
      out += `{${braceColourArguments(token.slice(1, closed ? -1 : undefined))}${closed ? "}" : ""}`;
      i = end;
      continue;
    }
    out += token;
    i = end;
    if (slots === undefined) continue;
    // \sqrt[3]{x}: the optional index is copied through as it stands.
    if (token === "\\sqrt") {
      const at = skipSpace(tex, i);
      if (tex[at] === "[") {
        const close = tex.indexOf("]", at);
        if (close !== -1) {
          out += tex.slice(i, close + 1);
          i = close + 1;
        }
      }
    }
    for (let k = 0; k < slots && i < tex.length; k++) {
      const at = skipSpace(tex, i);
      out += tex.slice(i, at);
      i = at;
      if (i >= tex.length) break;
      const argEnd = tokenEnd(tex, i);
      const arg = tex.slice(i, argEnd);
      if (arg.startsWith("\\") && COLOUR_NAMES.has(arg.slice(1))) {
        const inner = skipSpace(tex, argEnd);
        const innerEnd = inner < tex.length ? tokenEnd(tex, inner) : inner;
        out += `{${braceColourArguments(tex.slice(i, innerEnd))}}`;
        i = innerEnd;
      } else if (arg[0] === "{") {
        out += braceColourArguments(arg);
        i = argEnd;
      } else {
        out += arg;
        i = argEnd;
      }
    }
  }
  return out;
}

/** `align` is display-only in KaTeX; inline it becomes `aligned`, which draws the same. A colour
 * macro written as a bare argument is braced with its argument (braceColourArguments). */
export function preProcessTex(tex: string): string {
  return braceColourArguments(tex.replace(/\\(begin|end)\{align\*?\}/g, "\\$1{aligned}"));
}

/** The one place KaTeX is called. `throwOnError: false` draws a bad span in place (a `.katex-error`
 * element, which the bank test refuses) instead of losing the step, `strict: 'ignore'` accepts the
 * Unicode and the line breaks Khan writes, and `trust` admits exactly `\htmlClass`, the command the
 * colour macros need, and nothing that could carry a URL or a style. `throwOnError: true` is for
 * tests only: with false, KaTeX draws an unknown command as red text with no `.katex-error` class
 * (https://katex.org/docs/options), which a test reading for that class would pass. */
export function renderTex(
  tex: string,
  display = false,
  { throwOnError = false }: { throwOnError?: boolean } = {},
): string {
  return katex.renderToString(preProcessTex(tex), {
    throwOnError,
    strict: "ignore",
    // A copy per call: KaTeX adds any \gdef in the expression to the object it is given.
    macros: { ...TEX_MACROS },
    trust: (context) => context.command === "\\htmlClass",
    displayMode: display,
    // html only: KaTeX's MathML would double every digit in the text the views and tests read.
    // A screen reader gets the maths from texWords() on the span instead (dl-w3.25).
    output: "html",
  });
}

/**
 * The plain words of a TeX span, for its accessible name: colour and size macros unwrapped,
 * `\times` and friends as their signs, a fraction as `a/b`. Approximate by design: it names an
 * option such as `$\blueD{4}\times3$` as "4 × 3" for a screen reader. The voice never reads it
 * (say is plain words by rule).
 */
export function texWords(tex: string): string {
  let t = tex;
  t = t.replace(/\\(?:Large|large|Huge|huge|small|normalsize|displaystyle)\b/g, "");
  t = t.replace(/\\phantom\{[^{}]*\}/g, "");
  t = t.replace(/\\(?:begin|end)\{[a-z*]+\}/g, " ");
  t = t.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2");
  // Polish notation (notation.ts): a colon for division, a thin space between thousands.
  t = t.replace(/\\mathbin\{:\}/g, " : ").replace(/\\[,;!]/g, " ");
  const signs: Record<string, string> = {
    times: " × ",
    cdot: " · ",
    div: " ÷ ",
    pm: " ± ",
    ne: " ≠ ",
    le: " ≤ ",
    ge: " ≥ ",
    rarr: " → ",
    rightarrow: " → ",
    infin: " ∞ ",
    infty: " ∞ ",
  };
  t = t.replace(/\\([a-zA-Z]+)\s*/g, (_, name: string) => signs[name] ?? "");
  t = t.replace(/[{}]/g, "").replace(/&/g, " ").replace(/~/g, " ").replace(/\s+/g, " ").trim();
  return t;
}

/** A colour macro's argument kept bare: a group of plain characters no script follows, `{7}` as
 * `7`, so the span stays plain text (rule 17). Any other group keeps its braces. */
function unwrapped(group: string, after: string): string {
  const inner = group.slice(1, group.endsWith("}") ? -1 : undefined);
  return /^[^{}\\^_]*$/.test(inner) && !/^\s*[\^_]/.test(after)
    ? inner
    : `{${uncolouredTex(inner)}}`;
}

/** One TeX span with every colour macro taken off and its argument kept: `\blueD7` is `7`,
 * `\purpleC{\text{ rows}}` is `{\text{ rows}}`. */
function uncolouredTex(tex: string): string {
  let out = "";
  let i = 0;
  while (i < tex.length) {
    const end = tokenEnd(tex, i);
    const token = tex.slice(i, end);
    i = end;
    if (token.startsWith("\\") && COLOUR_NAMES.has(token.slice(1))) {
      i = skipSpace(tex, i);
      if (i >= tex.length) break;
      const argEnd = tokenEnd(tex, i);
      const arg = tex.slice(i, argEnd);
      out += arg[0] === "{" ? unwrapped(arg, tex.slice(argEnd)) : arg;
      i = argEnd;
    } else
      out +=
        token[0] === "{" && token.length > 1
          ? `{${uncolouredTex(token.slice(1, token.endsWith("}") ? -1 : undefined))}}`
          : token;
  }
  return out;
}

/**
 * A lesson string with Khan's colour commands taken off every TeX span, their content kept
 * (Choose addendum 1.2, dl-uukj.29.86): the solution card is ink, and a hint's colours point at a
 * picture the card does not draw. Text outside the spans is untouched.
 */
export function uncoloured(text: string): string {
  let out = "";
  let at = 0;
  for (const [start, end] of texRanges(text)) {
    const d =
      text.startsWith("$$", start) && end - start >= 4 && text.startsWith("$$", end - 2) ? 2 : 1;
    out +=
      text.slice(at, start) +
      text.slice(start, start + d) +
      uncolouredTex(text.slice(start + d, end - d)) +
      text.slice(end - d, end);
    at = end;
  }
  return out + text.slice(at);
}

/**
 * A lesson string as the screen reader's live region reads it (dl-uukj.29.78): each TeX span as
 * the words its accessible name gives (texWords, in the lesson's notation), and the markdown marks
 * gone, so a colour macro such as `\blueD7` is never read out. The page draws the same string with
 * RichText; this is only its words.
 */
export function liveWords(text: string, language: Language): string {
  let out = "";
  let at = 0;
  for (const [start, end] of texRanges(text)) {
    const d =
      text.startsWith("$$", start) && end - start >= 4 && text.startsWith("$$", end - 2) ? 2 : 1;
    out += `${text.slice(at, start)} ${texWords(notationTex(text.slice(start + d, end - d), language))} `;
    at = end;
  }
  return (out + text.slice(at))
    .replace(/\\\$/g, "$")
    .replace(/[*_`]/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
