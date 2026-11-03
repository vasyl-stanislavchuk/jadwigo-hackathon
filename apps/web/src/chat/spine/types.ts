/**
 * What the chat draws for one turn (wave dl-uukj.47.71, handoff §10): the turn spine, its stages
 * and their lines, and the lesson card's state. Lane A's `spineOf` and `cardStateOf` derive these
 * from a run's events; lanes B and C draw them. Every word is a copy key with its values, never
 * the engine's text (S3). A change here is the lead's (step 0 of the wave plan).
 */
import type { CopyKey } from "@jadwigo/copy";

/** A plan stage's mark: todo hollow, active the loader, done the check (§4.1). */
export type StageStatus = "todo" | "active" | "done" | "failed" | "stopped" | "waiting";

/** A line inside a stage (or under the header, when the plan has fewer than 3 stages). */
type LineKind = "done" | "now" | "retry" | "skip" | "slow" | "wait" | "steer" | "earlier";

/** Words to say: a copy key and the values it takes. */
export interface Words {
  copyKey: CopyKey;
  values: Readonly<Record<string, string | number>>;
}

/** A search result on its line (S14): one tag per set, sorted by fit. */
export interface SpineTag extends Words {
  id: string;
}

export interface SpineLine extends Words {
  kind: LineKind;
  /** A `now` line counts its seconds from here (epoch ms). */
  startedAt?: number;
  /** A search line's sets (S14), first by fit. */
  tags?: readonly SpineTag[];
  /** A steer: "Dopisane w trakcie" above the parent's words in quotes (S17). */
  steerLabel?: boolean;
  /** A steer's own words, the parent's, shown in quotes; never the engine's. */
  quote?: string;
}

export interface Stage {
  /** Stable within a turn: the plan entry's index. */
  id: string;
  /** The stage's name: the plan entry's words (the model's Polish), shown as they are. */
  name: string;
  status: StageStatus;
  /** 1 the first time; 2 shows "drugi raz", 3 "trzeci raz" (D1). */
  visit: number;
  /** A done or failed stage's one-line summary. */
  summary?: Words;
  lines: readonly SpineLine[];
}

export type SpinePhase =
  | "queued"
  | "thinking"
  | "tool"
  | "slow"
  | "stalled"
  | "awaiting_input"
  | "done"
  | "failed"
  | "cancelled";

/** The card's foot when the turn ended badly or stalled (D7, S11, S15). */
export interface SpineFoot {
  kind: "failed" | "stalled" | "stopped";
  /** Failed: how many times Jadwigo tried. */
  tries?: number;
  /** Stopped: the lesson version that stands. */
  versionStands?: number;
  /** Stopped: whether the stopped turn changed the lesson before it stopped. */
  changed?: boolean;
}

export interface TurnSpine {
  phase: SpinePhase;
  /**
   * The header's words: the turn title (§2.1, the first agent sentence trimmed to one clause, as
   * `text`) once there is one, else the phase words as a copy key.
   */
  title: { text: string } | Words;
  /** Epoch ms. */
  startedAt: number;
  endedAt?: number;
  /** Tool calls in the turn, for "{k} kroków". */
  stepCount: number;
  /** Empty when the plan has fewer than 3 stages: the lines go under the header instead. */
  stages: readonly Stage[];
  looseLines: readonly SpineLine[];
  foot?: SpineFoot;
  /** The turn's reply (D4): its last agent message with no tool call after it. */
  reply?: string;
}

interface CardBase {
  lessonId: string;
  version: number;
  title: string;
}

/** The lesson card (S16): ready, needs fixing, being changed, or superseded by a newer version. */
export type LessonCardState =
  | (CardBase & { kind: "ready"; count: number; first: string })
  | (CardBase & {
      kind: "fix";
      count: number;
      findings: readonly { step: number; words: Words }[];
    })
  | (CardBase & { kind: "working"; nextVersion: number; count: number; first: string })
  | (CardBase & { kind: "superseded" });
