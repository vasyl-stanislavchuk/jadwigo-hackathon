import type { Citation } from "@jadwigo/contracts";
import {
  type Attachment,
  BUDGET_STEER_SHARE,
  BUDGET_STOP_SHARE,
  type ChooseForm,
  type PlanEntry,
  type Run,
  type RunError,
  type RunEvent,
  type RunStatus,
  type ToolView,
  type VerbName,
} from "@jadwigo/contracts/run";

/**
 * The engine's pure functions (epic dl-z5ja, wave plan `docs/worklog/dl-z5ja/2026-10-31-wave-1.md`).
 * Step 0 (dl-z5ja.12) fixes these signatures; the fold lane (dl-z5ja.13) writes the bodies against
 * the golden logs in `packages/testing/src/runs/`. Pure: `now` is passed in.
 */

/**
 * A tool line: `pending` waits on an approval, `running` has no result yet, `rejected` is a call
 * the parent turned down before it ran (dl-z5ja.39).
 */
export type ToolState = "pending" | "running" | "failed" | "done" | "rejected";

/**
 * One row of the chat pane, in `seq` order of the event that opened it. The optional fields
 * (`citations`, `steer`, `view`, `choose`, `feedback`, `answers`) are present only when the log
 * carries them.
 */
export type ChatItem =
  | {
      kind: "message";
      seq: number;
      from: "parent" | "agent";
      text: string;
      attachments: readonly Attachment[];
      citations?: readonly Citation[];
      /**
       * Present only on a parent's steer (dl-z5ja.51): words sent while the turn ran, or an edit
       * in the lesson pane naming the questions it changed.
       */
      steer?: SteerMark;
    }
  | {
      kind: "tool";
      seq: number;
      call_id: string;
      verb: VerbName;
      state: ToolState;
      error: RunError | null;
      /** The result typed for its widget, from the call's `tool_result`. */
      view?: ToolView;
    }
  | { kind: "steer"; seq: number; level: "steer" | "stop"; spent_usd: number; cap_usd: number }
  | {
      kind: "approval";
      seq: number;
      call_id: string;
      verb: VerbName;
      summary: string;
      choose?: ChooseForm;
      /** Null until resolved; the first resolution pins it, with its feedback and answers. */
      decision: "approved" | "rejected" | null;
      feedback?: string;
      answers?: readonly string[];
    }
  | { kind: "error"; seq: number; error: RunError; attempt: number; retryable: boolean };

type SteerPayload = Extract<RunEvent, { type: "steer" }>["payload"];
/** Where a steer came from, and the questions a lesson edit names. */
type SteerMark = Pick<SteerPayload, "source" | "question_ids">;

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
  /** The last `plan` event's entries, each plan replacing the one before, or null before one. */
  plan: PlanEntry[] | null;
}

/** A run that has ended: no deadline is due on it, and the sweep leaves it alone. */
const ENDED: ReadonlySet<RunStatus> = new Set(["completed", "failed", "cancelled"]);

/** The first event of each key, in input order. */
function firstBy<K>(events: readonly RunEvent[], key: (e: RunEvent) => K): RunEvent[] {
  const seen = new Set<K>();
  const kept: RunEvent[] = [];
  for (const e of events) {
    const k = key(e);
    if (seen.has(k)) continue;
    seen.add(k);
    kept.push(e);
  }
  return kept;
}

/**
 * Deduped by `event_id` first, then the first event per `seq` in input order, then in `seq`
 * order. The store never writes 2 event_ids on one seq; this is the order the lead settled if one
 * shows up (dl-z5ja.13 notes). The one dedupe `foldRun` and `mergeLive` share, so the 2 can never
 * disagree on a duplicate.
 */
function normalize(events: readonly RunEvent[]): RunEvent[] {
  const byId = firstBy(events, (e) => e.event_id);
  return firstBy(byId, (e) => e.seq).sort((a, b) => a.seq - b.seq);
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
    plan: null,
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
      case "message": {
        const { from, text, attachments, citations } = e.payload;
        chat.push({
          kind: "message",
          seq: e.seq,
          from,
          text,
          attachments: attachments ?? [],
          ...(citations ? { citations } : {}),
        });
        break;
      }
      case "steer": {
        const { text, source, question_ids } = e.payload;
        chat.push({
          kind: "message",
          seq: e.seq,
          from: "parent",
          text,
          attachments: [],
          steer: { source, ...(question_ids ? { question_ids } : {}) },
        });
        break;
      }
      case "tool_call": {
        const line = toolLine(e.payload.call_id, e.payload.verb, e.seq, "running");
        if (line.state === "pending") line.state = "running";
        break;
      }
      case "tool_result": {
        const line = toolLine(e.payload.call_id, e.payload.verb, e.seq, "running");
        line.error = e.payload.error;
        line.state = e.payload.error ? "failed" : "done";
        if (e.payload.view) line.view = e.payload.view;
        break;
      }
      case "approval_request": {
        const { call_id, verb, summary, choose } = e.payload;
        if (approvals.has(call_id)) break;
        toolLine(call_id, verb, e.seq, "pending");
        const item: ApprovalItem = {
          kind: "approval",
          seq: e.seq,
          call_id,
          verb,
          summary,
          ...(choose ? { choose } : {}),
          decision: null,
        };
        approvals.set(call_id, item);
        chat.push(item);
        break;
      }
      case "approval_resolved": {
        const { call_id, decision, feedback, answers } = e.payload;
        const item = approvals.get(call_id);
        if (!item || item.decision !== null) break;
        item.decision = decision;
        if (feedback !== undefined) item.feedback = feedback;
        if (answers !== undefined) item.answers = answers;
        // A rejection closes a line still waiting on it; one already running or ended keeps its state.
        const line = tools.get(call_id);
        if (decision === "rejected" && line?.state === "pending") line.state = "rejected";
        break;
      }
      case "plan":
        view.plan = e.payload.entries;
        break;
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
 * How far below a share's threshold a spend may sit and still count as reaching it, relative to
 * the threshold. `0.1 * 0.9` is `0.09000000000000001`, so a plain `>=` reads a spend of exactly
 * 90% of the cap as below it (`dl-z5ja.38`). A billionth of the threshold is far below a cent on
 * any cap and far above a float's rounding error. A fixed threshold per cap keeps the guard
 * monotone in the spend.
 */
const SHARE_TOLERANCE = 1e-9;

/** Whether `spent_usd` has reached `share` of `cap_usd`, float error forgiven. */
function reached(spent_usd: number, cap_usd: number, share: number): boolean {
  return spent_usd >= cap_usd * share * (1 - SHARE_TOLERANCE);
}

/**
 * Before every Muse call: `steer` from half the cap, `stop` from 90% (`BUDGET_STEER_SHARE`,
 * `BUDGET_STOP_SHARE`). A spend that can't be read is `stop`: an unknown balance is no licence to
 * spend (`ff23c1ce7af`). So is a cap that can't be read or leaves nothing to spend.
 */
export function budgetGuard(spent_usd: number | null | undefined, cap_usd: number): BudgetLevel {
  if (spent_usd == null || !Number.isFinite(spent_usd)) return "stop";
  if (!Number.isFinite(cap_usd) || cap_usd <= 0) return "stop";
  if (reached(spent_usd, cap_usd, BUDGET_STOP_SHARE)) return "stop";
  if (reached(spent_usd, cap_usd, BUDGET_STEER_SHARE)) return "steer";
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
