/**
 * How a question ended, for the child's end list and the child's review step (dl-uukj.32 wave 2
 * step 0): the word for it (a `play_ended_*` key) and the child's soft icon (a star for right, a
 * sprout for one still growing, a check for one done while verdicts were held, never a cross: wave
 * 1 plan of `dl-uukj.30`). The parent's pages read their own outcomes, words, icons and tones
 * (parent/overview/outcome.tsx, decision
 * 2026-10-30-the-parent-s-outcomes-a-soft-green-for-got-there-a-dashed-tile-f); `Tone` is the one
 * list of the colours OutcomeTile in @jadwigo/ui draws.
 */

import type { PageEnded } from "@jadwigo/contracts";
import type { CopyKey } from "@jadwigo/copy";
import { Check, Circle, type LucideIcon, Sprout, Star } from "lucide-react";

/** `open` is a question still waiting, which a finished attempt's list never has. */
export type EndedOrOpen = PageEnded | "open";

export const ENDED_WORD: Record<EndedOrOpen, CopyKey> = {
  correct: "play_ended_correct",
  missed: "play_ended_missed",
  skipped: "play_ended_skipped",
  done: "play_ended_done",
  open: "play_ended_open",
};

export const ENDED_ICON: Record<EndedOrOpen, LucideIcon> = {
  correct: Star,
  missed: Sprout,
  skipped: Sprout,
  done: Check,
  open: Circle,
};

/** The ink the child's icon and word wear on the end list: the kid green for right, the soft miss
 * colour (owner, 2026-10-24) for one still growing, plain for the rest (dl-uukj.30.6). */
export const ENDED_INK: Record<EndedOrOpen, string> = {
  correct: "text-kid-correct-ink",
  missed: "text-kid-try-again-ink",
  skipped: "text-kid-try-again-ink",
  done: "",
  open: "",
};

/** The colours a tile or a cell wears: right, a miss, or plain for the rest; the parent's pages also
 * draw right-soft (right after tries or help) and empty (not asked), decision
 * 2026-10-30-the-parent-s-outcomes-a-soft-green-for-got-there-a-dashed-tile-f. */
export type Tone = "right" | "right-soft" | "miss" | "plain" | "empty";
