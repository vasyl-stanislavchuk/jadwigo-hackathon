/**
 * Part: one typed value, a number on the keypad or text on a keyboard (dl-w3.37.10). It generalises
 * the digit composer (composer.ts) for the families: Enter and every typed gap in Gaps use it.
 *
 * The onset rule is the composer's: t1 is the first input of the attempt and the modality is the
 * input that gave it. Unlike the composer, the text is kept after a miss so the child can fix it
 * (the miss rule, docs/18 §0); a new attempt only re-arms t1. The text is kept exactly as typed:
 * nothing here trims, folds case or corrects spelling.
 */

import type { Instant } from "../stage/clock.ts";

export interface EntryState {
  text: string;
  t1: Instant | null;
  modality: "click" | "keyboard" | null;
}

export const EMPTY_ENTRY: EntryState = { text: "", t1: null, modality: null };

export type EntryEvent =
  | { type: "digit"; digit: string; at: Instant; source: "click" | "keyboard" }
  /** A sign from an expression keypad (dl-w3.51.1), kept in the text as typed. */
  | { type: "sign"; sign: string; at: Instant; source: "click" | "keyboard" }
  | { type: "backspace" }
  /** A keyboard field's whole new text. `source` is `click` when a tap on the Polish letter row
   * (LetterRow.tsx, dl-uukj.28) wrote it; absent, the keyboard did. */
  | { type: "text"; text: string; at: Instant; source?: "click" | "keyboard" };

/** One input. `max` caps the length; a number takes digits only. */
export function enter(state: EntryState, ev: EntryEvent, max: number): EntryState {
  const onset = (at: Instant, source: "click" | "keyboard"): Pick<EntryState, "t1" | "modality"> =>
    state.t1 === null ? { t1: at, modality: source } : { t1: state.t1, modality: state.modality };
  switch (ev.type) {
    case "digit":
      if (!/^[0-9]$/.test(ev.digit) || state.text.length >= max) return state;
      return { text: state.text + ev.digit, ...onset(ev.at, ev.source) };
    case "sign":
      if (ev.sign.length !== 1 || state.text.length >= max) return state;
      return { text: state.text + ev.sign, ...onset(ev.at, ev.source) };
    case "backspace":
      return { ...state, text: state.text.slice(0, -1) };
    case "text":
      if (ev.text === state.text) return state;
      return { text: ev.text.slice(0, max), ...onset(ev.at, ev.source ?? "keyboard") };
  }
}

/** A new attempt: the text stays, t1 is re-armed for the next first input. */
export function rearm(state: EntryState): EntryState {
  return { ...state, t1: null, modality: null };
}

/** What Check commits: the text as typed, with its onset, or null when there is nothing to send.
 * A kept answer sent again unchanged takes the Check press as its onset. */
export function submit(
  state: EntryState,
  at: Instant,
  source: "click" | "keyboard",
): { text: string; t1: Instant; modality: "click" | "keyboard" } | null {
  if (state.text.trim() === "") return null;
  return { text: state.text, t1: state.t1 ?? at, modality: state.modality ?? source };
}
