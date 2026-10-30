/**
 * How a question ended, in one place for the child's end list, the child's review step, the
 * parent's attempt page and the parent's overview (dl-uukj.32 wave 2 step 0): the word for it (a
 * `play_ended_*` key; the adult table has the parent's words), the child's soft icon (a star for
 * right, a sprout for one still growing, a check for one done while verdicts were held, never a
 * cross: wave 1 plan of `dl-uukj.30`), and its tone. A tone is the pair of colours a tile wears:
 * the player's own right, the miss colour of decision 2026-10-24, or plain. The utilities are
 * Zeszyt's (`bg-kid-correct-soft` and the rest, packages/ui styles/tailwind.css).
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

/** The colours a tile or a cell wears: right, a miss, or plain for the rest. */
export type Tone = "right" | "miss" | "plain";

export const ENDED_TONE: Record<EndedOrOpen, Tone> = {
  correct: "right",
  missed: "miss",
  skipped: "plain",
  done: "plain",
  open: "plain",
};

/** A tone's border, ground and ink, as Zeszyt's utilities. */
export const TONE_CLASS: Record<Tone, string> = {
  right: "border-kid-correct bg-kid-correct-soft text-kid-correct-ink",
  miss: "border-kid-try-again bg-kid-try-again-soft text-kid-try-again-ink",
  plain: "border-border bg-background text-foreground",
};
