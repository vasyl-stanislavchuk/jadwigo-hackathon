import {
  type Attachment,
  BUDGET_STEER_SHARE,
  BUDGET_STOP_SHARE,
  type Run,
  type RunError,
  type RunEvent,
  type RunStatus,
  type VerbName,
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

/** A run that has ended: no deadline is due on it, and the sweep leaves it alone. */
const ENDED: ReadonlySet<RunStatus> = new Set(["completed", "failed", "cancelled"]);

/**
 * One event per `seq` and per `event_id`, the first one seen winning, then in `seq` order. The
 * one dedupe both `foldRun` and `mergeLive` use, so the 2 can never disagree on a duplicate.
 */
function normalize(events: readonly RunEvent[]): RunEvent[] {
  const seqs = new Set<number>();
  const ids = new Set<string>();
  const kept: RunEvent[] = [];
  for (const e of events) {
    if (seqs.has(e.seq) || ids.has(e.event_id)) continue;
    seqs.add(e.seq);
    ids.add(e.event_id);
    kept.push(e);
  }
  return kept.sort((a, b) => a.seq - b.seq);
}

type ToolItem = Extract<ChatItem, { kind: "tool" }>;
type ApprovalItem = Extract<ChatItem, { kind: "approval" }>;

/**
 * Folds one run's events into its view. Order-free and duplicate-free by construction: it sorts by
 * `seq` and keeps one event per `event_id`, so a log with duplicates folds like one without.
 */
export function foldRun(events: readonly RunEvent[]): RunView {
  const chat: ChatItem[] = [];
  const tools = new Map<string, ToolItem>();
  const approvals = new Map<string, ApprovalItem>();
  const view: RunView = {
    chat,
    lesson: null,
    status: null,
    turn_open: true,
    spent_usd: 0,
    cap_usd: null,
    budget: "none",
    cursor: 0,
  };

  /** The call's tool line, opened at `seq` in `state` when the log has none yet. */
  const toolLine = (call_id: string, verb: VerbName, seq: number, state: ToolState): ToolItem => {
    const found = tools.get(call_id);
    if (found) return found;
    const line: ToolItem = { kind: "tool", seq, call_id, verb, state, error: null };
    tools.set(call_id, line);
    chat.push(line);
    return line;
  };

  for (const e of normalize(events)) {
    view.cursor = e.seq;
    switch (e.type) {
      case "message":
        chat.push({
          kind: "message",
          seq: e.seq,
          from: e.payload.from,
          text: e.payload.text,
          attachments: e.payload.attachments ?? [],
        });
        break;
      case "tool_call": {
        const line = toolLine(e.payload.call_id, e.payload.verb, e.seq, "running");
        if (line.state === "pending") line.state = "running";
        break;
      }
      case "tool_result": {
        const line = toolLine(e.payload.call_id, e.payload.verb, e.seq, "running");
        line.error = e.payload.error;
        line.state = e.payload.error ? "failed" : "done";
        break;
      }
      case "approval_request": {
        const { call_id, verb, summary } = e.payload;
        if (approvals.has(call_id)) break;
        toolLine(call_id, verb, e.seq, "pending");
        const item: ApprovalItem = {
          kind: "approval",
          seq: e.seq,
          call_id,
          verb,
          summary,
          decision: null,
        };
        approvals.set(call_id, item);
        chat.push(item);
        break;
      }
      case "approval_resolved": {
        const item = approvals.get(e.payload.call_id);
        if (item && item.decision === null) item.decision = e.payload.decision;
        break;
      }
      case "budget_steer":
        view.budget = e.payload.level;
        chat.push({ kind: "steer", seq: e.seq, ...e.payload });
        break;
      case "error":
        chat.push({ kind: "error", seq: e.seq, ...e.payload });
        break;
      case "usage":
        view.spent_usd = e.payload.spent_usd;
        view.cap_usd = e.payload.cap_usd;
        break;
      case "status":
        if (view.turn_open) view.status = e.payload.status;
        break;
      case "lesson_revision":
        if (view.lesson === null || e.payload.revision > view.lesson.revision) {
          view.lesson = {
            revision: e.payload.revision,
            lesson_file: e.payload.lesson_file as Record<string, unknown>,
          };
        }
        break;
      case "turn_complete":
        view.turn_open = false;
        break;
      case "model_response":
        break;
    }
  }
  return view;
}

/**
 * The page's merge after a reload: what the live channel buffered and what the fetch returned,
 * deduped by `seq` and `event_id`, in `seq` order, only those after `cursor`. So
 * `foldRun([...a, ...b])` equals `foldRun(mergeLive(a, b, 0))`.
 */
export function mergeLive(
  buffer: readonly RunEvent[],
  fetched: readonly RunEvent[],
  cursor: number,
): RunEvent[] {
  return normalize([...buffer, ...fetched]).filter((e) => e.seq > cursor);
}

/**
 * Before every Muse call: `steer` from half the cap, `stop` from 90% (`BUDGET_STEER_SHARE`,
 * `BUDGET_STOP_SHARE`). A spend that can't be read is `stop`: an unknown balance is no licence to
 * spend (`ff23c1ce7af`). So is a cap that can't be read or leaves nothing to spend.
 */
export function budgetGuard(spent_usd: number | null | undefined, cap_usd: number): BudgetLevel {
  if (spent_usd == null || !Number.isFinite(spent_usd)) return "stop";
  if (!Number.isFinite(cap_usd) || cap_usd <= 0) return "stop";
  if (spent_usd >= cap_usd * BUDGET_STOP_SHARE) return "stop";
  if (spent_usd >= cap_usd * BUDGET_STEER_SHARE) return "steer";
  return "none";
}

/**
 * Which deadline has passed at `now`, where a deadline equal to `now` has passed: `max` when
 * `max_deadline_at` has (it wins when both have), `idle` when `idle_deadline_at` has, else null.
 * A run that has ended (completed, failed, cancelled) is never due.
 */
export function deadlineDue(
  run: Pick<Run, "status" | "idle_deadline_at" | "max_deadline_at">,
  now: Date,
): "idle" | "max" | null {
  if (ENDED.has(run.status)) return null;
  const at = now.getTime();
  if (Date.parse(run.max_deadline_at) <= at) return "max";
  if (run.idle_deadline_at !== null && Date.parse(run.idle_deadline_at) <= at) return "idle";
  return null;
}
