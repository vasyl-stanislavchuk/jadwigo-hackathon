/**
 * Inline code and the terminal card, as data (dl-i952.19, docs/plan/widgets/code-parts.md, variant
 * C). No React here: InlineCode.tsx and TerminalCard.tsx draw what these return.
 *
 * Inline code is a backtick pair in a lesson string; the stored string never changes. The
 * highlighter is our own (owner, 2026-10-08): it knows bd's verbs, flags and ids, which no general
 * highlighter tells apart, and it is a few dozen lines instead of a 25 to 60 KB dependency. If a
 * lesson ever shows JSON or Python, take shiki instead (the design doc names the manifest line).
 */

import type { TerminalCard, TerminalLine } from "../stage/types.ts";

export interface InlinePiece {
  code: boolean;
  text: string;
}

/** A lesson string cut at its backtick pairs. A stray backtick stays as text (lint refuses one). */
export function splitInline(text: string): InlinePiece[] {
  const pieces: InlinePiece[] = [];
  const re = /`([^`]+)`/g;
  let at = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > at) pieces.push({ code: false, text: text.slice(at, m.index) });
    pieces.push({ code: true, text: m[1] ?? "" });
    at = m.index + m[0].length;
  }
  if (at < text.length) pieces.push({ code: false, text: text.slice(at) });
  return pieces;
}

/** What a voice reads: the same words without the marks (dl.contracts.spec.speakable). */
export function speakable(text: string): string {
  return text.replaceAll("`", "");
}

/** A part of a command the learner fills in, such as `<Buy paint id>` (dl.contracts.spec.PLACEHOLDER). */
export const PLACEHOLDER = /<[^<>]+>/;

export function hasPlaceholder(cmd: string): boolean {
  return PLACEHOLDER.test(cmd);
}

/** Does this line show a copy button? Only when the card offers copy and the line has no
 * placeholder, which a shell would read as a redirection (dl.contracts.spec.copyable). */
export function copyable(card: TerminalCard, line: TerminalLine): boolean {
  return card.copy && !hasPlaceholder(line.cmd);
}

/** A command as a copy button names it: whole up to `max` characters, else cut with an ellipsis,
 * so a screen reader hears which command a button copies without the whole lab path. */
export function copyLabel(cmd: string, max = 60): string {
  return cmd.length <= max ? cmd : `${cmd.slice(0, max - 1)}…`;
}

export type TokenKind = "cmd" | "verb" | "flag" | "id" | "str" | "path" | "op" | "ph" | "arg";
export type Token = readonly [text: string, kind: TokenKind | null];

// bd's global flags that take a value: the value is a folder, and the verb still follows it
// (`bd -C $DL_LAB dep add …`).
const VALUE_FLAGS = new Set(["-C", "--db"]);
const BEAD_ID = /^[a-z][a-z0-9]*-[a-z0-9]{3,}(\.\d+)*$/;

/** A command cut into highlighted tokens; whitespace comes back with kind null. Joining every
 * token's text gives the command back exactly. */
export function tokens(cmd: string): Token[] {
  const re = /("[^"]*"|'[^']*'|<[^>]+>|&&|\|\||[|;()]|\s+|[^\s()|;]+)/g;
  const out: Token[] = [];
  let first = true;
  let isBd = false;
  let verbs = 0;
  let value = false;
  for (const [t] of cmd.matchAll(re)) {
    if (/^\s+$/.test(t)) {
      out.push([t, null]);
      continue;
    }
    let kind: TokenKind = "arg";
    if (/^(&&|\|\||[|;()])$/.test(t)) {
      out.push([t, "op"]);
      first = true;
      continue;
    }
    if (first) {
      kind = "cmd";
      isBd = t === "bd";
      verbs = 0;
      first = false;
    } else if (value) {
      kind = "path";
      value = false;
    } else if (t.startsWith("<")) kind = "ph";
    else if (/^["']/.test(t)) kind = "str";
    else if (t.startsWith("-")) {
      kind = "flag";
      if (isBd && VALUE_FLAGS.has(t) && verbs === 0) value = true;
      else if (isBd) verbs = 9;
    } else if (/[/~$]/.test(t)) kind = "path";
    else if (BEAD_ID.test(t)) {
      kind = "id";
      if (isBd) verbs = 9;
    } else if (isBd && verbs < 2 && /^[a-z][a-z-]*$/.test(t)) {
      kind = "verb";
      verbs++;
    }
    out.push([t, kind]);
  }
  return out;
}
