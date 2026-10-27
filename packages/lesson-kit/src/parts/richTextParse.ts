/**
 * Rich text in a lesson string, as data (dl-r772.6, docs/18 §7a "Text is plain"). No React here, and
 * not named richText.ts: on a case-insensitive disk that file and RichText.tsx are one module path.
 * RichText.tsx draws what this returns.
 *
 * The grammar is the small Perseus flavour Khan's items are written in (docs/research/
 * khan-academy-question-types.md §4): paragraphs apart by a blank line, `**bold**`, `*italic*`, line breaks,
 * pipe tables in the loose forms Perseus writes, `- ` bullet lists, an image on its own line,
 * backtick code (the same pairs as InlineCode) and TeX between `$…$` or `$$…$$`. A hand parser
 * rather than a markdown library (docs/07 §7.4): the grammar is a dozen rules, nothing nests
 * beyond bold around TeX, and no raw-HTML path exists, so an item can never put markup on a
 * child's page. KaTeX escapes its own input.
 *
 * TeX is opaque: nothing inside a `$…$` span is read as markdown, so `\text{a_b}`, `2*3` and
 * `\blueD{7}` stay TeX. A `{id}` marker is a slot only when the caller names its ids, and never
 * inside TeX, so `\text{fives}` is not a gap. The stored string never changes.
 *
 * A glossary term (dl-w3.56) is the markdown link form with a `def:` destination:
 * `[word](def: meaning)`. It is a `term` run, drawn as a word that opens its meaning (Khan's
 * `definition` widget, a `togglePrompt` and its `definition`:
 * https://github.com/Khan/perseus/tree/main/packages/perseus/src/widgets/definition). The meaning
 * is kept as a string and parsed again when drawn, so it may hold TeX. A link to anywhere else,
 * `[text](https://…)`, is its text with the URL dropped: lesson text never leads a child off the
 * page. An inline image `![alt](src)` stays text, as before.
 */

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; runs: Inline[] }
  | { kind: "italic"; runs: Inline[] }
  | { kind: "code"; text: string }
  | { kind: "tex"; tex: string; display: boolean }
  | { kind: "slot"; id: string }
  | { kind: "term"; word: string; meaning: string }
  | { kind: "break" };

export type Block =
  | { kind: "paragraph"; runs: Inline[] }
  | { kind: "table"; header: Inline[][] | null; rows: Inline[][][] }
  | { kind: "list"; items: Inline[][] }
  | { kind: "image"; alt: string; src: string };

export interface RichTextOptions {
  /** The slot ids the text may name as `{id}`; with none, braces are plain text. */
  slots?: ReadonlySet<string> | undefined;
}

/** The id a slot marker may carry: the same shape as a gap marker (families/slots/model.ts). */
const SLOT = /^\{([a-z][a-z0-9_]*)\}/;
const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)\)$/;
// A table's delimiter row, in every form Perseus writes: `-|-`, `:-|`, `---|---`, `| - | - |`.
const TABLE_DELIM = /^[\s|:-]*-[\s|:-]*$/;
const BULLET = /^- (.*)$/;

/** Where the TeX span opening at `i` ends (the index after its closing dollars), or -1 when it never
 * closes. `\$` inside a span is a dollar, not a closing one. */
function texEnd(text: string, i: number, display: boolean): number {
  const close = display ? "$$" : "$";
  let at = i + close.length;
  while (at < text.length) {
    if (text[at] === "\\") {
      at += 2;
      continue;
    }
    if (text.startsWith(close, at)) return at + close.length;
    at++;
  }
  return -1;
}

/** The span opening at `i`: display when `$$` opens and closes it, else inline; -1 when neither closes. */
function spanEnd(text: string, i: number): { end: number; display: boolean } {
  if (text.startsWith("$$", i)) {
    const end = texEnd(text, i, true);
    if (end !== -1) return { end, display: true };
  }
  return { end: texEnd(text, i, false), display: false };
}

/** The [start, end) ranges of every TeX span in a text, in order. A span that never closes is text. */
export function texRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === "\\") {
      i += 2;
    } else if (c === "`") {
      const end = text.indexOf("`", i + 1);
      i = end === -1 ? i + 1 : end + 1;
    } else if (c === "$") {
      const { end } = spanEnd(text, i);
      if (end === -1) i++;
      else {
        out.push([i, end]);
        i = end;
      }
    } else i++;
  }
  return out;
}

/** Where the bold opened at `i` closes (the index of its closing stars), skipping TeX and code, or
 * -1. Perseus writes `**Bold. **` with a space before the closing stars, which still closes. */
function boldEnd(text: string, i: number): number {
  let at = i + 2;
  if (at >= text.length || /\s/.test(text[at] ?? "") || text.startsWith("**", at)) return -1;
  while (at < text.length) {
    const c = text[at];
    if (c === "\n") return -1;
    if (c === "\\") at += 2;
    else if (c === "$") {
      const { end } = spanEnd(text, at);
      at = end === -1 ? at + 1 : end;
    } else if (c === "`") {
      const end = text.indexOf("`", at + 1);
      at = end === -1 ? at + 1 : end + 1;
    } else if (text.startsWith("**", at)) return at;
    else at++;
  }
  return -1;
}

/** Where the italic opened by the single star at `i` closes (the index of its closing star), or -1.
 * It opens only after a space, a bracket or the line's start and before a letter, and closes on a
 * star after a non-space that no letter or star follows, so `2*3*4` and `a * b` stay text
 * (dl-uukj.29.91). TeX and code inside are skipped. */
function italicEnd(text: string, i: number): number {
  if (
    text[i + 1] === undefined ||
    /[\s*]/.test(text[i + 1] ?? "") ||
    (i > 0 && /[\p{L}\p{N}*]/u.test(text[i - 1] ?? ""))
  )
    return -1;
  let at = i + 1;
  while (at < text.length) {
    const c = text[at];
    if (c === "\n") return -1;
    const next = skipOpaque(text, at);
    if (next !== -1) {
      at = next;
      continue;
    }
    if (c === "*") {
      if (text[at + 1] === "*") return -1;
      if (!/\s/.test(text[at - 1] ?? "") && !/[\p{L}\p{N}]/u.test(text[at + 1] ?? "")) return at;
      return -1;
    }
    at++;
  }
  return -1;
}

/** The index after a TeX span, a code span or an escape opening at `at`, or -1 when none opens there. */
function skipOpaque(text: string, at: number): number {
  const c = text[at];
  if (c === "\\") return at + 2;
  if (c === "$") {
    const { end } = spanEnd(text, at);
    return end === -1 ? at + 1 : end;
  }
  if (c === "`") {
    const end = text.indexOf("`", at + 1);
    return end === -1 ? at + 1 : end + 1;
  }
  return -1;
}

const DEF = /^def:\s*/;

/**
 * A `[word](destination)` opening at `i`: its word, destination and the index after it, or null
 * when the form does not close on the line, nests another bracket, or follows a `!` (an image).
 * TeX and code inside are skipped, and the destination's own parentheses balance, so a meaning
 * may say "(bez reszty)".
 */
function linkAt(text: string, i: number): { word: string; dest: string; end: number } | null {
  if (i > 0 && text[i - 1] === "!") return null;
  let at = i + 1;
  while (at < text.length && text[at] !== "]") {
    if (text[at] === "\n" || text[at] === "[") return null;
    const next = skipOpaque(text, at);
    at = next === -1 ? at + 1 : next;
  }
  if (at >= text.length || text[at + 1] !== "(") return null;
  const word = text.slice(i + 1, at);
  if (word.trim() === "") return null;
  let depth = 0;
  let j = at + 2;
  while (j < text.length) {
    const c = text[j];
    if (c === "\n") return null;
    const next = skipOpaque(text, j);
    if (next !== -1) {
      j = next;
      continue;
    }
    if (c === "(") depth++;
    else if (c === ")") {
      if (depth === 0) return { word, dest: text.slice(at + 2, j), end: j + 1 };
      depth--;
    }
    j++;
  }
  return null;
}

/** One paragraph's text as inline runs. Lines inside it become breaks. */
export function parseInline(text: string, options: RichTextOptions = {}, bold = true): Inline[] {
  const runs: Inline[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer !== "") runs.push({ kind: "text", text: buffer });
    buffer = "";
  };
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === "\\" && text[i + 1] === "$") {
      buffer += "$";
      i += 2;
      continue;
    }
    if (c === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        runs.push({ kind: "code", text: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    if (c === "$") {
      const { end, display } = spanEnd(text, i);
      if (end !== -1) {
        flush();
        const d = display ? 2 : 1;
        runs.push({ kind: "tex", tex: text.slice(i + d, end - d), display });
        i = end;
        continue;
      }
    }
    if (bold && c === "*" && text[i + 1] === "*") {
      const end = boldEnd(text, i);
      if (end !== -1) {
        flush();
        runs.push({
          kind: "bold",
          runs: parseInline(text.slice(i + 2, end).replace(/\s+$/, ""), options, false),
        });
        i = end + 2;
        continue;
      }
    }
    if (bold && c === "*" && text[i + 1] !== "*") {
      const end = italicEnd(text, i);
      if (end !== -1) {
        flush();
        runs.push({ kind: "italic", runs: parseInline(text.slice(i + 1, end), options, false) });
        i = end + 1;
        continue;
      }
    }
    if (c === "[") {
      const link = linkAt(text, i);
      if (link) {
        const def = DEF.exec(link.dest);
        if (def) {
          flush();
          runs.push({
            kind: "term",
            word: link.word,
            meaning: link.dest.slice(def[0].length).trim(),
          });
        } else buffer += link.word;
        i = link.end;
        continue;
      }
    }
    if (c === "{" && options.slots) {
      const m = SLOT.exec(text.slice(i));
      const id = m?.[1];
      if (m && id !== undefined && options.slots.has(id)) {
        flush();
        runs.push({ kind: "slot", id });
        i += m[0].length;
        continue;
      }
    }
    if (c === "\n") {
      flush();
      runs.push({ kind: "break" });
      i++;
      continue;
    }
    buffer += c;
    i++;
  }
  flush();
  return runs;
}

/** A table row cut at its pipes, outside TeX and code, with the outer pipes dropped. */
function cells(line: string): string[] {
  const out: string[] = [];
  let buffer = "";
  let i = 0;
  // A cell that is only `$$` is Perseus for an empty cell, and must not open display maths.
  const trimmed = line.trim().replace(/(^|\|)\s*\$\$\s*(?=\||$)/g, "$1 ");
  while (i < trimmed.length) {
    const c = trimmed[i];
    if (c === "\\") {
      buffer += trimmed.slice(i, i + 2);
      i += 2;
    } else if (c === "$") {
      const { end } = spanEnd(trimmed, i);
      if (end === -1) {
        buffer += c;
        i++;
      } else {
        buffer += trimmed.slice(i, end);
        i = end;
      }
    } else if (c === "`") {
      const end = trimmed.indexOf("`", i + 1);
      if (end === -1) {
        buffer += c;
        i++;
      } else {
        buffer += trimmed.slice(i, end + 1);
        i = end + 1;
      }
    } else if (c === "|") {
      out.push(buffer);
      buffer = "";
      i++;
    } else {
      buffer += c;
      i++;
    }
  }
  out.push(buffer);
  if (trimmed.startsWith("|")) out.shift();
  if (trimmed.endsWith("|") && out.length > 0) out.pop();
  return out.map((c) => c.trim());
}

const hasPipe = (line: string) => cells(line).length > 1 || /^\s*\|.*\|\s*$/.test(line);

function table(raw: string[][], options: RichTextOptions): Block {
  // As wide as the widest row, less trailing columns empty everywhere.
  let n = Math.max(...raw.map((r) => r.length));
  while (n > 1 && raw.every((r) => !(r[n - 1] ?? ""))) n--;
  const [head = [], ...rows] = raw.map((r) => Array.from({ length: n }, (_, k) => r[k] ?? ""));
  const parse = (r: string[]) => r.map((c) => parseInline(c, options));
  return { kind: "table", header: head.some(Boolean) ? parse(head) : null, rows: rows.map(parse) };
}

/** A Perseus-flavoured text as blocks. */
export function parseRichText(text: string, options: RichTextOptions = {}): Block[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  const endParagraph = () => {
    if (paragraph.length > 0)
      blocks.push({ kind: "paragraph", runs: parseInline(paragraph.join("\n"), options) });
    paragraph = [];
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === "") {
      endParagraph();
      i++;
      continue;
    }
    const image = IMAGE_LINE.exec(line.trim());
    if (image) {
      endParagraph();
      blocks.push({ kind: "image", alt: image[1] ?? "", src: image[2] ?? "" });
      i++;
      continue;
    }
    if (
      hasPipe(line) &&
      i + 1 < lines.length &&
      (lines[i + 1] ?? "").includes("|") &&
      TABLE_DELIM.test(lines[i + 1] ?? "")
    ) {
      endParagraph();
      const raw = [cells(line)];
      for (
        i += 2;
        i < lines.length && (lines[i] ?? "").trim() !== "" && hasPipe(lines[i] ?? "");
        i++
      )
        raw.push(cells(lines[i] ?? ""));
      blocks.push(table(raw, options));
      continue;
    }
    if (BULLET.test(line)) {
      endParagraph();
      const items: Inline[][] = [];
      for (; i < lines.length && BULLET.test(lines[i] ?? ""); i++)
        items.push(parseInline(BULLET.exec(lines[i] ?? "")?.[1] ?? "", options));
      blocks.push({ kind: "list", items });
      continue;
    }
    paragraph.push(line);
    i++;
  }
  endParagraph();
  return blocks;
}

function texIn(runs: Inline[], out: string[]): void {
  for (const r of runs) {
    if (r.kind === "tex") out.push(r.tex);
    else if (r.kind === "bold" || r.kind === "italic") texIn(r.runs, out);
  }
}

/** Every TeX span in a text, delimiters off, in reading order (for tests over a bank). */
export function texSpans(text: string): string[] {
  const out: string[] = [];
  for (const b of parseRichText(text)) {
    if (b.kind === "paragraph") texIn(b.runs, out);
    else if (b.kind === "list") for (const item of b.items) texIn(item, out);
    else if (b.kind === "table")
      for (const row of [...(b.header ? [b.header] : []), ...b.rows])
        for (const cell of row) texIn(cell, out);
  }
  return out;
}

export interface Term {
  word: string;
  meaning: string;
}

function termsInRuns(runs: Inline[], out: Term[]): void {
  for (const r of runs) {
    if (r.kind === "term") out.push({ word: r.word, meaning: r.meaning });
    else if (r.kind === "bold" || r.kind === "italic") termsInRuns(r.runs, out);
  }
}

/** Every glossary term in a text, in reading order (for validate's key_in_term). */
export function termsIn(text: string): Term[] {
  const out: Term[] = [];
  for (const b of parseRichText(text)) {
    if (b.kind === "paragraph") termsInRuns(b.runs, out);
    else if (b.kind === "list") for (const item of b.items) termsInRuns(item, out);
    else if (b.kind === "table")
      for (const row of [...(b.header ? [b.header] : []), ...b.rows])
        for (const cell of row) termsInRuns(cell, out);
  }
  return out;
}

/** Does this text hold TeX? */
export function hasTex(text: string): boolean {
  return texSpans(text).length > 0;
}

/** One paragraph of plain words: no TeX, bold, code, break or block in it. */
export function isPlainText(text: string): boolean {
  const blocks = parseRichText(text);
  if (blocks.length === 0) return true;
  const [only] = blocks;
  return (
    blocks.length === 1 && only?.kind === "paragraph" && only.runs.every((r) => r.kind === "text")
  );
}
