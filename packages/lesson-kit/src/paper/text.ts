/**
 * A lesson string as the print sheet's HTML (dl-1eieq.8.1). The same parse as the screen's
 * RichText (richTextParse.ts) and the same maths rules: numbers and signs print as text in the
 * lesson's face (plainTex.ts, rule 17), the school's notation in Polish (notation.ts), and only the
 * rest goes to KaTeX. No React and no DOM, so the API builds it on the server. Every word is
 * escaped here; KaTeX's output is the only HTML taken from a string, and KaTeX escapes its input.
 *
 * What prints differently from the screen: a glossary term prints its word without the popover, a
 * `{id}` slot prints as an empty `<span class="slot" data-slot="id">` the print Lambda fills with
 * the gap's box or the option's word, and a picture's address is the absolute URL `media` gives.
 */

import type { Language } from "@jadwigo/contracts";
import { notationTex, notationText } from "../parts/notation.ts";
import { plainTex } from "../parts/plainTex.ts";
import { renderTex } from "../parts/richTextMacros.ts";
import { type Block, type Inline, parseRichText } from "../parts/richTextParse.ts";
import { wordFormula } from "../parts/wordFormula.ts";

export interface PaperTextOptions {
  readonly language: Language;
  /** The `{id}` markers that are slots in this string: a question's gap or option ids. */
  readonly slots?: ReadonlySet<string> | undefined;
  /** A picture's absolute URL, by the address the lesson wrote. */
  readonly media: (src: string) => string;
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Text as HTML text: the five characters HTML reads escaped. */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);
}

function tex(written: string, display: boolean, language: Language): string {
  const t = notationTex(written, language);
  const plain = display ? null : plainTex(t);
  if (plain !== null) return `<span class="formula">${escapeHtml(plain)}</span>`;
  const words = wordFormula(t);
  if (words !== null)
    return `<span class="formula">${words
      .map(
        (p, i) =>
          (i > 0 ? (p.kind === "sign" ? " " : " ") : "") +
          (p.kind === "sign" ? escapeHtml(p.text) : renderTex(p.tex, false)),
      )
      .join("")}</span>`;
  return `<span class="${display ? "tex tex-display" : "tex"}">${renderTex(t, display)}</span>`;
}

function runs(list: readonly Inline[], o: PaperTextOptions): string {
  return list
    .map((r) => {
      switch (r.kind) {
        case "text":
          return escapeHtml(notationText(r.text, o.language));
        case "bold":
          return `<strong>${runs(r.runs, o)}</strong>`;
        case "italic":
          return `<em>${runs(r.runs, o)}</em>`;
        case "code":
          return `<code>${escapeHtml(r.text)}</code>`;
        case "tex":
          return tex(r.tex, r.display, o.language);
        case "slot":
          return `<span class="slot" data-slot="${escapeHtml(r.id)}"></span>`;
        case "term":
          return escapeHtml(notationText(r.word, o.language));
        case "image":
          return `<img class="inline" src="${escapeHtml(o.media(r.src))}" alt="${escapeHtml(r.alt)}">`;
        case "break":
          return "<br>";
      }
      return "";
    })
    .join("");
}

function block(b: Block, o: PaperTextOptions): string {
  switch (b.kind) {
    case "paragraph":
      return `<p>${runs(b.runs, o)}</p>`;
    case "list":
      return `<ul>${b.items.map((item) => `<li>${runs(item, o)}</li>`).join("")}</ul>`;
    case "image":
      return `<img class="block" src="${escapeHtml(o.media(b.src))}" alt="${escapeHtml(b.alt)}">`;
    case "table": {
      const head =
        b.header === null
          ? ""
          : `<thead><tr>${b.header.map((c) => `<th>${runs(c, o)}</th>`).join("")}</tr></thead>`;
      const body = b.rows
        .map((row) => `<tr>${row.map((c) => `<td>${runs(c, o)}</td>`).join("")}</tr>`)
        .join("");
      return `<table class="text-table">${head}<tbody>${body}</tbody></table>`;
    }
  }
}

/**
 * The string as HTML. One paragraph prints as its runs alone, so an option, a gap's word or a
 * table cell keeps its host's size; more than one, or a list or table, prints as blocks.
 */
export function paperHtml(text: string, o: PaperTextOptions): string {
  const blocks = parseRichText(text, { slots: o.slots });
  const [only] = blocks;
  if (blocks.length === 1 && only?.kind === "paragraph") return runs(only.runs, o);
  return blocks.map((b) => block(b, o)).join("");
}
