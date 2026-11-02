/**
 * The first screen's unsent words and Dla, kept per tab (dl-uukj.47.24), so a parent who checks a
 * child mid-sentence, or reloads, finds them where they left them. sessionStorage, like the first
 * message (workspace/engine.ts): the tab's own, gone with it, never sent anywhere or logged.
 * Sign-out clears it, and it is kept for one signed-in account: another account on the same tab
 * reads none, so one parent's words about their child never reach another's box.
 */

import { LearnerId } from "@jadwigo/contracts";

const KEY = "jw.parent.draft";

export interface Draft {
  /** The signed-in account the words belong to, or null when it is not known. */
  owner: string | null;
  text: string;
  /** Dla's child, or null for "Bez dziecka". */
  learner: LearnerId | null;
}

export const newLessonDraft = {
  /** The draft `owner` left, or null: none, unreadable, or another account's. */
  get(owner: string | null, held: Storage = window.sessionStorage): Draft | null {
    try {
      const raw = held.getItem(KEY);
      if (raw === null) return null;
      const read: unknown = JSON.parse(raw);
      if (typeof read !== "object" || read === null) return null;
      const { owner: kept, text, learner } = read as Record<string, unknown>;
      if ((kept ?? null) !== owner) return null;
      const parsed = LearnerId.safeParse(learner);
      return {
        owner,
        text: typeof text === "string" ? text : "",
        learner: parsed.success ? parsed.data : null,
      };
    } catch {
      return null;
    }
  },
  put(draft: Draft, held: Storage = window.sessionStorage): void {
    try {
      if (draft.text === "" && draft.learner === null) held.removeItem(KEY);
      else held.setItem(KEY, JSON.stringify(draft));
    } catch {
      // Storage refused: the words stay on screen, and only a reload loses them.
    }
  },
  clear(held: Storage = window.sessionStorage): void {
    try {
      held.removeItem(KEY);
    } catch {
      // Nothing was kept.
    }
  },
};
