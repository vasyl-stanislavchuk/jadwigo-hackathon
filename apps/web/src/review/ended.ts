/**
 * How a question ended, as the child reads it on the end list and the review step: a kind word
 * (the player's `play_ended_*` lines) and a soft icon, a star for a right answer, a sprout for one
 * still growing, a check for one done while verdicts were held. Never a cross (wave 1 plan of
 * `dl-uukj.30`).
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
