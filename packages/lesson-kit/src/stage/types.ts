/**
 * The page-side shapes the stage, the parts and the family views share. Ported from david-learns
 * frontend/src/api/types.ts and runner/{blocks,reducer}.ts, without the old lesson blocks, the
 * Django wire and voice. Help is the page's view of a rung: the playground releases it from the
 * authored help, and the attempt wire's ReleasedHelp (packages/contracts wire.ts) maps onto it when
 * the API plays a lesson.
 */

import type { HelpPicture, PartMark, Picture, TerminalCard } from "@jadwigo/contracts";
import type { CopyKey } from "@jadwigo/copy";

export type { Category, Language } from "@jadwigo/copy";
export type { HelpPicture, PartMark, TerminalCard };

/** A served picture with its size and words, as a stem, an option or a hint carries it. */
type PagePicture = Picture;

/** One line of a terminal card: a command and what it prints. */
export type TerminalLine = TerminalCard["lines"][number];

/** One help card as the page draws it: a Khan hint (its words and pictures), or a ladder rung. */
export interface PageHintCard {
  text: string;
  pictures?: PagePicture[];
  picture?: HelpPicture;
  lines?: string[];
  /** With `lines`: a blank drawn after them, the last line left for the learner. */
  blank?: boolean;
}

/** One line of the solution card: its words in ink, and the hint's pictures only when the line
 * refers to them. */
export interface PageSolutionLine {
  text: string;
  pictures?: PagePicture[];
}

/** One rung of a question's help ladder as the page is given it. */
export interface PageHelp {
  /** 1 look again, 2 a smaller step, 3 almost there, 4 your turn (the twin). */
  rung: number;
  card: { text: string; picture?: HelpPicture | undefined } | null;
  /** Rung 1: the parts the view outlines, by id. */
  focus: string[] | null;
  /** Rung 2 and 3: the parts given away, in the family's shape. The view draws them as given and
   * puts them in the committed answer. */
  given: unknown;
  /** Rung 3: the worked lines but the last. Rung 4: all of them. */
  worked: string[] | null;
  /** Rung 3: true when the last line was cut off, so the view draws a blank after the lines. */
  blank?: boolean;
  /** Rung 4: the twin as the page draws it, key stripped. In v0 the twin is its own question. */
  twin: unknown;
  /** Whether more help is written. */
  more: boolean;
  /** Every card of the help note released so far, in order. With Khan's hints `rung` counts them. */
  hints?: PageHintCard[] | null;
  /** How many cards the question has in all, for the note's "n z m" counter. */
  hintsTotal?: number | null;
}

export type FeedbackKind = "praise" | "try_again" | "moved_on";

/** What the page shows after a check. In the playground it is read from the example's written
 * scenario, never judged. */
export interface Feedback {
  kind: FeedbackKind;
  /** Which line of a list key to use; cycles. */
  index: number;
  /** try_again only: which parts were right and which missed. Absent means the whole question is
   * marked. */
  parts?: PartMark[];
  /** The line to show instead of the kind's own. */
  line?: CopyKey;
  /** praise only: another accepted form of a typed answer, said once after the praise. */
  also?: string;
  /** praise only: why a right "none of these" is right, said after the praise. */
  why?: string;
  /** praise only: a right equation written the other way round, in the question's form. */
  swapped?: string;
}
