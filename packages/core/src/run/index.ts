import type {
  Attachment,
  Run,
  RunError,
  RunEvent,
  RunStatus,
  VerbName,
} from "@jadwigo/contracts/run";

/**
 * The engine's pure functions (epic dl-z5ja, wave plan `docs/worklog/dl-z5ja/2026-10-31-wave-1.md`).
 * Step 0 (dl-z5ja.12) fixes these signatures; the fold lane (dl-z5ja.13) writes the bodies against
 * the golden logs in `packages/testing/src/runs/`. Pure: `now` is passed in.
 */

/** A tool line: `pending` waits on an approval, `running` has no result yet. */
export type ToolState = "pending" | "running" | "failed" | "done";

/** One row of the chat pane, in `seq` order of the event that opened it. */
export type ChatItem =
  | {
      kind: "message";
      seq: number;
      from: "parent" | "agent";
      text: string;
      attachments: readonly Attachment[];
    }
  | {
      kind: "tool";
      seq: number;
      call_id: string;
      verb: VerbName;
      state: ToolState;
      error: RunError | null;
    }
  | { kind: "steer"; seq: number; level: "steer" | "stop"; spent_usd: number; cap_usd: number }
  | {
      kind: "approval";
      seq: number;
      call_id: string;
      verb: VerbName;
      summary: string;
      /** Null until resolved; the first resolution pins it. */
      decision: "approved" | "rejected" | null;
    }
  | { kind: "error"; seq: number; error: RunError; attempt: number; retryable: boolean };

export type BudgetLevel = "none" | "steer" | "stop";

/** What the 2 panes draw from one run's log. */
export interface RunView {
  chat: ChatItem[];
  /** The highest `lesson_revision`, the lesson file opaque, or null before the first. */
  lesson: { revision: number; lesson_file: Record<string, unknown> } | null;
  /** The last `status` event's, or null before one. A late event never moves it off an ended turn. */
  status: RunStatus | null;
  /** False once `turn_complete` is in the log; nothing after it reopens the turn. */
  turn_open: boolean;
  /** From the last `usage` event; 0 and null before one. */
  spent_usd: number;
  cap_usd: number | null;
  /** The last `budget_steer`'s level, or `none`. */
  budget: BudgetLevel;
  /** The highest `seq` folded, 0 for an empty log: where a reload fetches after. */
  cursor: number;
}

const WAITS = "waits on dl-z5ja.13 (the fold lane)";

/**
 * Folds one run's events into its view. Order-free and duplicate-free by construction: it sorts by
 * `seq` and keeps one event per `event_id`, so a log with duplicates folds like one without.
 */
export function foldRun(_events: readonly RunEvent[]): RunView {
  throw new Error(`foldRun ${WAITS}`);
}

/**
 * The page's merge after a reload: what the live channel buffered and what the fetch returned,
 * deduped by `seq` and `event_id`, in `seq` order, only those after `cursor`. So
 * `foldRun([...a, ...b])` equals `foldRun(mergeLive(a, b, 0))`.
 */
export function mergeLive(
  _buffer: readonly RunEvent[],
  _fetched: readonly RunEvent[],
  _cursor: number,
): RunEvent[] {
  throw new Error(`mergeLive ${WAITS}`);
}

/**
 * Before every Muse call: `steer` from half the cap, `stop` from 90% (`BUDGET_STEER_SHARE`,
 * `BUDGET_STOP_SHARE`). A spend that can't be read is `stop`: an unknown balance is no licence to
 * spend (`ff23c1ce7af`).
 */
export function budgetGuard(_spent_usd: number | null | undefined, _cap_usd: number): BudgetLevel {
  throw new Error(`budgetGuard ${WAITS}`);
}

/**
 * Which deadline has passed at `now`, where a deadline equal to `now` has passed: `max` when
 * `max_deadline_at` has (it wins when both have), `idle` when `idle_deadline_at` has, else null.
 * A run that has ended (completed, failed, cancelled) is never due.
 */
export function deadlineDue(
  _run: Pick<Run, "status" | "idle_deadline_at" | "max_deadline_at">,
  _now: Date,
): "idle" | "max" | null {
  throw new Error(`deadlineDue ${WAITS}`);
}
