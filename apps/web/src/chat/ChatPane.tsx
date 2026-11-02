/**
 * The chat pane (dl-z5ja.17), on the dev chat page and in the parent workspace, drawn from each
 * turn's `RunView`: the messages, the run's state as words in a polite live region, tool lines
 * folded under one line with a stuck one shown inline, the budget steer (PostHog never shows it),
 * the queued follow-ups, Stop and Stopping, an error row with Copy details (the run id and the
 * attempt), and a Restoring line while the page catches up. The pattern list is
 * `docs/research/posthog-ai-ux-patterns.md` 15.3. Every word a parent reads comes from
 * `@jadwigo/copy`.
 *
 * `variant="parent"` is the same pane inside the parent app's lesson workspace (dl-z5ja.108,
 * decision dl-xo0q): no heading (the panel has one), no starters (the first screen asked), no Stop
 * button (Esc still stops), the run's state in the workspace's band instead (`statusOf`), and a
 * Claude-like composer (design review 2026-11-02): one rounded box, "Możesz pisać dalej…" on top,
 * then Dla (`composerLead`) on the left and an explicit "Wyślij" button, quiet while empty.
 *
 * The two sides read apart (dl-uukj.47.28; owner's calls of 2026-11-02): the parent's words are a
 * quiet box in the soft paper fill on the right, "Ty" kept for screen readers; Jadwigo AI's turn is plain prose on
 * the left under one header (its crown mark and its name), its words drawn as markdown (ChatMarkdown.tsx), its tool lines folded into one small muted
 * line with a chevron, closed by default, and its widgets in the same column. In the workspace the
 * messages scroll and the composer stays at the panel's foot. A parent's steer keeps its label in view ("Ty · Twoja zmiana w lekcji"). Rows fade in
 * only when the system allows motion (chat.css).
 */

import {
  type MessageContext,
  RUN_ERROR_TYPE,
  type RunError,
  type RunId,
  type RunRatingCreate,
  type RunStatus,
} from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ChatItem } from "@jadwigo/core";
import { Button, cn, RegisterProvider } from "@jadwigo/ui";
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  LoaderCircleIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import {
  type FormEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChatMarkdown } from "./ChatMarkdown.tsx";
import { type ChooseAnswers, ChooseForm, recapOf } from "./ChooseForm.tsx";
import "./chat.css";
import { isOpen, type SendLimit, type Turn } from "./conversation.ts";
import { JadwigoAiMark } from "./JadwigoAiMark.tsx";
import { CitationChips } from "./objects/CitationChips.tsx";
import { LessonCard, wroteLesson } from "./objects/LessonCard.tsx";
import type { ObjectRef } from "./objects/ref.ts";
import { PLAN_MIN, PlanCard } from "./PlanCard.tsx";
import { elapsedSeconds, phaseAnnouncement, type RunPhase } from "./phase.ts";
import { Rating } from "./Rating.tsx";
import { type LineContext, sentenceOf, TOOL_ICON } from "./toolLine.ts";
import { ToolDetails, toolResult } from "./widgets/Widgets.tsx";

const STATUS_KEY: Record<RunStatus, CopyKey> = {
  queued: "chat_status_queued",
  in_progress: "chat_status_in_progress",
  awaiting_input: "chat_status_awaiting_input",
  completed: "chat_status_completed",
  failed: "chat_status_failed",
  cancelled: "chat_status_cancelled",
};

const STARTERS: readonly CopyKey[] = ["chat_starter_1", "chat_starter_2", "chat_starter_3"];

/** The parent's words: a quiet box in the soft paper fill on the right, Jadwigo AI's answer plain prose beside it. */
const PARENT_BOX =
  "rounded-jw-box border-jw border-jw-line bg-jw-act-quiet px-3.5 py-2.5 whitespace-pre-wrap text-jw-ink";

type ToolItem = Extract<ChatItem, { kind: "tool" }>;
type ApprovalItem = Extract<ChatItem, { kind: "approval" }>;

/** A turn's rows with each stretch of tool lines gathered into one group. */
type Row = { kind: "tools"; seq: number; tools: ToolItem[] } | Exclude<ChatItem, ToolItem>;

function rowsOf(chat: readonly ChatItem[]): Row[] {
  const rows: Row[] = [];
  for (const item of chat) {
    const last = rows.at(-1);
    if (item.kind !== "tool") rows.push(item);
    else if (last?.kind === "tools") last.tools.push(item);
    else rows.push({ kind: "tools", seq: item.seq, tools: [item] });
  }
  return rows;
}

/** A line's state in words: the state mark beside it is decorative. */
function stateWords(tool: ToolItem, language: Language): string {
  const say = (key: CopyKey, vars: Record<string, string> = {}) =>
    copy(language, key, vars, "adult");
  switch (tool.state) {
    case "failed":
      return say("chat_tool_stuck", { message: tool.error?.message ?? "" });
    case "running":
      return say("chat_tool_running");
    case "pending":
      return say("chat_tool_pending");
    case "rejected":
      return say("chat_tool_rejected");
    case "done":
      return say("chat_tool_done");
  }
}

/** The state mark: a spinner while it runs (turning only under motion-safe), a check, a red dot. */
function StateMark({ state }: { state: ToolItem["state"] }): ReactElement | null {
  if (state === "running")
    return (
      <LoaderCircleIcon
        aria-hidden
        className="size-3.5 shrink-0 text-jw-ink-soft motion-safe:animate-spin"
        data-mark="running"
      />
    );
  if (state === "done")
    return (
      <CheckIcon aria-hidden className="size-3.5 shrink-0 text-jw-right-ink" data-mark="done" />
    );
  if (state === "failed")
    return (
      <span
        aria-hidden
        className="size-2 shrink-0 rounded-full bg-jw-miss-edge"
        data-mark="failed"
      />
    );
  return null;
}

/**
 * One tool line (dl-uukj.47.30): its icon, its sentence from the call's input, and a state mark
 * with the state in text. Opening it shows "Co zostało zrobione" (the typed widget, or the line in
 * plain words), and the raw input and output one more tap away under "Szczegóły". A failed line
 * says its reason in view.
 */
function ToolLine({
  tool,
  language,
  context,
}: {
  tool: ToolItem;
  language: Language;
  context: LineContext;
}): ReactElement {
  const say = (key: CopyKey) => copy(language, key, {}, "adult");
  const sentence = sentenceOf(tool.verb, tool.input, context);
  const words = copy(language, sentence.key, sentence.vars, "adult");
  const Icon = TOOL_ICON[tool.verb];
  const result = toolResult(tool, language, context);
  const failed = tool.state === "failed";
  return (
    <li data-tool={tool.verb} data-state={tool.state}>
      <details data-tool-line>
        <summary className="flex cursor-pointer items-center gap-2">
          <Icon aria-hidden className="size-4 shrink-0 text-jw-ink-soft" data-tool-icon />
          <span className="min-w-0 text-jw-ink" data-sentence>
            {words}
          </span>
          <StateMark state={tool.state} />
          <span className={failed ? "text-jw-ink" : "sr-only"} data-state-words>
            {` · ${stateWords(tool, language)}`}
          </span>
        </summary>
        {/* Opened: the widget, if the step has one, then Szczegóły. The summary already says the
            step and its state, so the plain-words line is for screen readers only (design review
            2026-11-02: one structure, one small size). */}
        <div className="ml-6 flex flex-col gap-1.5 py-1 text-jw-page-small">
          <p className="sr-only">{say("chat_tool_what_done")}</p>
          {result?.kind === "widget" && !result.keepVisible ? (
            result.element
          ) : (
            // No widget here (none, or one kept in view under the fold, drawn once there): the line
            // in plain words, its sentence and where it stands, never only the state word
            // (dl-uukj.47.50).
            <p className="sr-only" data-what-done>
              <span>{words}</span>
              <span className="text-jw-ink-soft">{stateWords(tool, language)}</span>
            </p>
          )}
          {result !== null && <ToolDetails tool={tool} language={language} />}
        </div>
      </details>
    </li>
  );
}

/**
 * Tool lines folded under one summary, "{n} kroków · ostatni: {sentence}"; a failed line stays in
 * view under the fold, and so does each widget its registry entry keeps visible (dl-z5ja.24).
 */
function ToolGroup({
  tools,
  language,
  context,
}: {
  tools: ToolItem[];
  language: Language;
  context: LineContext;
}): ReactElement {
  const stuck = tools.filter((t) => t.state === "failed");
  const latest = tools.at(-1);
  const last = latest === undefined ? null : sentenceOf(latest.verb, latest.input, context);
  const head = copy(
    language,
    "chat_tool_summary",
    { n: tools.length, last: last === null ? "" : copy(language, last.key, last.vars, "adult") },
    "adult",
  );
  const shown = tools.flatMap((t) => {
    const result = toolResult(t, language, context);
    return result?.kind === "widget" && result.keepVisible
      ? [{ call_id: t.call_id, element: result.element }]
      : [];
  });
  return (
    <div className="flex flex-col gap-1 text-jw-page-body" data-tools>
      {/* Small and quiet (design review 2026-11-02): parents rarely open it, the lesson is the
          goal. One muted line, the steps under a thin rule on the left once opened. */}
      <details className="group text-jw-page-small text-jw-ink-soft" data-tool-group>
        <summary className="flex w-fit max-w-full cursor-pointer list-none items-center gap-1.5 rounded-jw-small py-0.5 hover:text-jw-ink [&::-webkit-details-marker]:hidden">
          <ZapIcon aria-hidden className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">{head}</span>
          <ChevronDownIcon
            aria-hidden
            className="size-3.5 shrink-0 transition-transform duration-jw-fast group-open:rotate-180"
          />
        </summary>
        <ul
          aria-label={copy(language, "chat_tool_lines", {}, "adult")}
          className="mt-1 ml-1.5 flex flex-col gap-1 border-l-jw border-jw-line pl-3"
        >
          {tools.map((t) => (
            <ToolLine key={t.call_id} tool={t} language={language} context={context} />
          ))}
        </ul>
      </details>
      {stuck.length > 0 && (
        <ul
          aria-label={copy(language, "chat_tool_lines_stuck", {}, "adult")}
          className="flex flex-col gap-1"
        >
          {stuck.map((t) => (
            <ToolLine key={t.call_id} tool={t} language={language} context={context} />
          ))}
        </ul>
      )}
      {shown.map((w) => (
        <div key={w.call_id}>{w.element}</div>
      ))}
    </div>
  );
}

/**
 * An error row's words (dl-z5ja.28, .83): the engine's own limits in plain words with what to do
 * next, a step delivered again as "trying again", and anything else as what went off track.
 */
function problemOf(error: RunError, retryable: boolean, language: Language): string {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  if (error.type === RUN_ERROR_TYPE.runTimedOut) return say("chat_limit_too_long");
  // An idle close (dl-z5ja.94): the turn is completed, so no retry; the parent writes what next.
  if (error.type === RUN_ERROR_TYPE.runIdle) return say("chat_limit_idle");
  if (error.type === RUN_ERROR_TYPE.stepTimedOut) return say("chat_problem_retrying");
  const line = say("chat_problem", { message: error.message });
  return retryable ? `${line} ${say("chat_problem_retrying")}` : line;
}

/** Copy details: the words to paste into a message to us, the run id first. */
function CopyDetails({ details, language }: { details: string; language: Language }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      data-details={details}
      onClick={() => {
        void navigator.clipboard?.writeText(details).then(() => setCopied(true));
      }}
    >
      {copied
        ? copy(language, "chat_copied", {}, "adult")
        : copy(language, "chat_copy_details", {}, "adult")}
    </Button>
  );
}

function ErrorRow({
  item,
  run,
  language,
}: {
  item: Extract<ChatItem, { kind: "error" }>;
  run: RunId;
  language: Language;
}): ReactElement {
  const details = `run ${run} attempt ${item.attempt}: ${item.error.type}`;
  return (
    <div
      role="alert"
      data-row="error"
      className="flex flex-col items-start gap-2 rounded-jw-card border-jw border-jw-line p-3 text-jw-page-body"
    >
      <p>{problemOf(item.error, item.retryable, language)}</p>
      <CopyDetails details={details} language={language} />
    </div>
  );
}

function RowView({
  row,
  run,
  language,
  context,
}: {
  row: Row;
  run: RunId;
  language: Language;
  context: LineContext;
}) {
  switch (row.kind) {
    case "message": {
      const steer =
        row.steer === undefined
          ? null
          : copy(
              language,
              row.steer.source === "lesson_edit" ? "chat_steered_edit" : "chat_steered",
              {},
              "adult",
            );
      if (row.from === "parent")
        return (
          <div
            data-from="parent"
            data-steer={row.steer?.source}
            className="flex max-w-[90%] flex-col items-end gap-1 self-end"
          >
            {/* "Ty" for a screen reader; a steer says what it was in view. */}
            <p className={cn("text-jw-page-small text-jw-ink-soft", steer === null && "sr-only")}>
              {copy(language, "chat_from_parent", {}, "adult")}
              {steer !== null && ` · ${steer}`}
            </p>
            <p className={PARENT_BOX} data-bubble>
              {row.text}
            </p>
          </div>
        );
      return (
        <div data-from={row.from} className="text-jw-ink" data-prose>
          <ChatMarkdown text={row.text} />
          {/* What the message rests on, each opening beside the chat (dl-uukj.47.62). */}
          {context.onOpen !== undefined && row.citations !== undefined && (
            <CitationChips citations={row.citations} language={language} onOpen={context.onOpen} />
          )}
        </div>
      );
    }
    case "tools":
      return <ToolGroup tools={row.tools} language={language} context={context} />;
    case "steer":
      return (
        <p data-row="steer" data-level={row.level} className="text-jw-page-body">
          {copy(
            language,
            row.level === "steer" ? "chat_budget_steer" : "chat_budget_stop",
            {},
            "adult",
          )}
          {row.level === "stop" && ` ${copy(language, "chat_budget_steer_note", {}, "adult")}`}
        </p>
      );
    case "approval": {
      const key: CopyKey =
        row.decision === null
          ? "chat_approval"
          : row.decision === "approved"
            ? "chat_approval_approved"
            : "chat_approval_rejected";
      // A choose form's answers stay in the thread as one line each (dl-uukj.47.35).
      const answers =
        context.chosen?.(row.call_id) ?? (row.decision === null ? undefined : row.answers);
      return (
        <div data-row="approval" className="flex flex-col gap-0.5 text-jw-page-body">
          <p>{copy(language, key, { summary: row.summary }, "adult")}</p>
          {row.choose !== undefined &&
            answers !== undefined &&
            recapOf(row.choose, answers, language).map((line) => (
              <p key={line} className="text-jw-ink-soft" data-choose-recap>
                {line}
              </p>
            ))}
        </div>
      );
    }
    case "error":
      return <ErrorRow item={row} run={run} language={language} />;
  }
}

/**
 * What the live region says (dl-z5ja.28): only when the turn finishes, stops or needs the parent,
 * never each step, so a screen reader is not read every tool line. Empty while the page restores.
 */
function announcementOf(last: Turn | undefined, restoring: boolean): CopyKey | null {
  if (last === undefined || restoring) return null;
  const status = last.view.status ?? last.run.status;
  const waiting = last.view.chat.some((i) => i.kind === "approval" && i.decision === null);
  if (isOpen(last))
    return status === "awaiting_input" || waiting ? "chat_announce_needs_you" : null;
  if (status === "cancelled") return "chat_announce_stopped";
  if (status === "failed") return "chat_turn_unfinished";
  return "chat_announce_done";
}

/**
 * What Jadwigo AI sees, from the last message the parent sent (dl-uukj.47.32): its page context
 * as it went out, never a choice not sent yet. Null before any message, or for a child the family
 * does not hold, whose name the page cannot say.
 */
function contextLine(
  turns: readonly Turn[],
  nameOf: ((learner: string) => string | null) | undefined,
  language: Language,
): string | null {
  let last: MessageContext | undefined | null = null;
  for (const turn of turns)
    for (const item of turn.view.chat)
      if (item.kind === "message" && item.from === "parent") last = item.context;
  if (last === null) return null;
  const say = (key: CopyKey, vars: Record<string, string> = {}) =>
    copy(language, key, vars, "adult");
  if (last === undefined) return say("chat_context_none");
  if ("lesson_id" in last) return say("chat_context_lesson");
  const child = nameOf?.(last.learner_id) ?? null;
  return child === null ? null : say("chat_context_child", { child });
}

/** The kinds of phase while Jadwigo AI is at work: the activity line shimmers then. */
const WORKING: ReadonlySet<RunPhase["kind"]> = new Set([
  "connecting",
  "queued",
  "thinking",
  "tool",
]);

/** The header over Jadwigo AI's rows: its crown mark and its name. */
function AiHeader({ language }: { language: Language }): ReactElement {
  return (
    <p
      className="mb-1 flex items-center gap-2 text-jw-page-small font-bold text-jw-ink"
      data-ai-header
    >
      <JadwigoAiMark />
      {copy(language, "chat_from_agent", {}, "adult")}
    </p>
  );
}

/**
 * The activity line under Jadwigo AI's turn (dl-uukj.47.29): the phase in words, a tool's own
 * words while it runs, the elapsed seconds, and a shimmer only when the system allows motion.
 * Stalled, it offers Spróbuj ponownie and Copy details with the run id.
 */
function ActivityLine({
  phase,
  now,
  still,
  onRetry,
  language,
}: {
  phase: RunPhase;
  now: number;
  still: boolean;
  onRetry?: (() => void) | undefined;
  language: Language;
}): ReactElement {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const seconds = phase.kind === "awaiting_input" ? null : elapsedSeconds(phase, now);
  const working = WORKING.has(phase.kind);
  return (
    <div className="flex flex-col gap-2" data-activity data-phase={phase.kind}>
      <p className="flex items-baseline gap-2 text-jw-page-small text-jw-ink-soft">
        <span {...(working && !still ? { "data-shimmer": "" } : {})}>{say(phase.copyKey)}</span>
        {seconds !== null && (
          <span className="tabular-nums" data-elapsed>
            {say("chat_phase_elapsed", { seconds })}
          </span>
        )}
      </p>
      {phase.kind === "stalled" && (
        <div className="flex flex-wrap items-center gap-2" data-row="stalled">
          {onRetry !== undefined && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              {say("chat_retry_turn")}
            </Button>
          )}
          {phase.run !== null && <CopyDetails details={`run ${phase.run}`} language={language} />}
        </div>
      )}
    </div>
  );
}

/** A turn that ended well: its rating band shows (dl-z5ja.63). */
function completed(turn: Turn): boolean {
  return !isOpen(turn) && (turn.view.status ?? turn.run.status) === "completed";
}

/** Try again on a turn: its own message, sent again as a new turn; none when it holds none. */
function retryOf(turn: Turn, resend: (text: string) => void): (() => void) | undefined {
  const text = parentTextOf(turn);
  return text === null ? undefined : () => resend(text);
}

function parentTextOf(turn: Turn): string | null {
  for (const item of turn.view.chat)
    if (item.kind === "message" && item.from === "parent") return item.text;
  return null;
}

/** The browser's word on the network, kept current. */
function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** Whether the parent asked the system for less motion. */
const lessMotion = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Smooth unless the parent asked the system for less motion. */
const scrollBehavior = (): ScrollBehavior => (lessMotion() ? "auto" : "smooth");

/** The open turn's last approval when it asks a choose form not yet answered here, else null. */
function openChoose(
  turns: readonly Turn[],
  chosen: Readonly<Record<string, ChooseAnswers>>,
): { call_id: string; choose: NonNullable<ApprovalItem["choose"]> } | null {
  const last = turns.at(-1);
  if (last === undefined || !isOpen(last)) return null;
  const approval = last.view.chat.findLast((i): i is ApprovalItem => i.kind === "approval");
  if (approval?.choose === undefined || approval.decision !== null) return null;
  if (chosen[approval.call_id] !== undefined) return null;
  return { call_id: approval.call_id, choose: approval.choose };
}

/** The newest finished turn that wrote the lesson: the one whose card carries the actions. */
function newestCard(turns: readonly Turn[]): Turn | undefined {
  return turns.findLast((t) => !isOpen(t) && t.view.lesson !== null && wroteLesson(t.view));
}

/** Whether a turn draws its plan (PlanCard.tsx: 3 or more entries). */
const hasPlan = (turn: Turn): boolean => (turn.view.plan?.length ?? 0) >= PLAN_MIN;

/** One entry of a turn as the pane draws it: a row, or the plan pinned above Jadwigo AI's rows. */
type TurnEntry = { kind: "row"; row: Row; header: boolean } | { kind: "plan"; header: boolean };

/**
 * A turn's rows, the first of Jadwigo AI's marked to carry its header: one header per turn, over
 * its prose, tool lines and widgets, however the parent's words fall between them. A plan of 3 or
 * more entries goes first among Jadwigo AI's rows, under the header (dl-uukj.47.31).
 */
function turnRows(turn: Turn): TurnEntry[] {
  let headed = false;
  const entries: TurnEntry[] = [];
  const plan = hasPlan(turn);
  for (const row of rowsOf(turn.view.chat)) {
    const ai = !(row.kind === "message" && row.from === "parent");
    if (ai && !headed && plan) entries.push({ kind: "plan", header: true });
    const header = ai && !headed && !plan;
    if (ai) headed = true;
    entries.push({ kind: "row", row, header });
  }
  if (plan && !headed) entries.push({ kind: "plan", header: true });
  return entries;
}

/** Each message limit's line: the minute's says wait a moment, the day's says come back tomorrow. */
const LIMIT_LINE: Readonly<Record<SendLimit, CopyKey>> = {
  minute: "chat_limit_busy",
  day: "chat_limit_daily",
};

export interface ChatPaneProps {
  language: Language;
  turns: readonly Turn[];
  queued: readonly string[];
  restoring: boolean;
  stopping: boolean;
  sendFailed: boolean;
  /** Which message limit refused the last send: its own line, no retry (dl-z5ja.100). */
  sendLimit?: SendLimit | null;
  onSend(text: string): void;
  onStop(): void;
  /**
   * Rates a completed turn by its run (dl-z5ja.63); Good, Bad and Try again show under each
   * completed turn only when it is given.
   */
  onRate?: ((run: RunId, body: RunRatingCreate) => Promise<unknown>) | undefined;
  /** The playground's pane, or the parent workspace's (see the header). */
  variant?: "playground" | "parent";
  /** The run's one state (phase.ts); the activity line and the status read it when given. */
  phase?: RunPhase | null;
  /** The clock the phase was read at, for the elapsed seconds. */
  now?: number;
  /** The words just sent, echoed until their event is in the log. */
  pending?: string | null;
  /** Spróbuj ponownie on a stalled turn. */
  onRetry?: (() => void) | undefined;
  /** A learner's first name by id, for a tool line about a child (toolLine.ts). */
  nameOf?: ((learner: string) => string | null) | undefined;
  /** The "Następne" queue (queue.ts): what waits to go once the turn ends. */
  next?: readonly string[];
  /**
   * "Spróbuj ponownie" after a failed send, from the conversation: the exact words that failed,
   * a queued row's included. Without it the pane sends its own last words again.
   */
  onResend?: (() => void) | undefined;
  /** "Wyślij teraz" on one waiting row. */
  onSendNow?: ((index: number) => void) | undefined;
  /** Takes one waiting row out, answering its words ("Zmień" puts them back in the composer). */
  onTakeNext?: ((index: number) => string | null) | undefined;
  /** The parent closed the context chip for this conversation: it stays closed. */
  contextClosed?: boolean;
  /** The chip's ×; without it the chip has none. */
  onCloseContext?: (() => void) | undefined;
  /**
   * A choose form's answers, by the approval's call (dl-uukj.47.35). A stand-in for now: no route
   * resolves an approval until dl-uukj.47.48.
   */
  onChoose?: ((call_id: string, answers: ChooseAnswers) => void) | undefined;
  /** The parent composer's bottom-left control, such as Dla, the child the lesson is for. */
  composerLead?: ReactNode;
  /**
   * The conversation's lesson as a thing to open (dl-uukj.47.58): with `onOpen`, a turn that wrote
   * the lesson ends in its card, and a click opens the lesson beside the chat.
   */
  lessonObject?: ObjectRef | undefined;
  /** Opens a thing beside the chat: the lesson card's click, and a widget's (WidgetActions). */
  onOpen?: ((object: ObjectRef) => void) | undefined;
  /** The lesson's actions (dl-uukj.47.55), in the foot of the newest lesson card only. */
  lessonActions?: ReactNode;
}

export function ChatPane({
  language,
  turns,
  queued,
  restoring,
  stopping,
  sendFailed,
  sendLimit = null,
  onSend,
  onStop,
  onRate,
  variant = "playground",
  phase,
  now = Date.now(),
  pending = null,
  onRetry,
  nameOf,
  next = [],
  onResend,
  onSendNow,
  onTakeNext,
  contextClosed = false,
  onCloseContext,
  onChoose,
  composerLead,
  lessonObject,
  onOpen,
  lessonActions,
}: ChatPaneProps): ReactElement {
  /** The choose forms answered on this page, by call: their recap shows until the log has one. */
  const [chosen, setChosen] = useState<Readonly<Record<string, ChooseAnswers>>>({});
  const composer = useRef<HTMLTextAreaElement>(null);
  const lineContext: LineContext = {
    ...(nameOf === undefined ? {} : { nameOf }),
    onAsk: (text: string) => onSend(text),
    ...(onOpen === undefined ? {} : { onOpen }),
    chosen: (call_id: string) => chosen[call_id],
  };
  const asking = openChoose(turns, chosen);
  // Back to the composer once the form is answered.
  const wasAsking = useRef(false);
  useEffect(() => {
    if (wasAsking.current && asking === null) composer.current?.focus();
    wasAsking.current = asking !== null;
  }, [asking]);
  const context = contextClosed ? null : contextLine(turns, nameOf, language);
  const parent = variant === "parent";
  const [draft, setDraft] = useState("");
  /** The last words sent, so a send that did not reach the server can go again. */
  const [lastSent, setLastSent] = useState<string | null>(null);
  const online = useOnline();
  /** Rows enter with a fade only when the system allows motion (chat.css). */
  const [still] = useState(lessMotion);
  // The list follows Jadwigo AI to the bottom as it writes (design review 2026-11-02): a new row,
  // a reply that grows, the echo, the activity line. Only while the parent is at the bottom: one
  // who scrolled up to read stays where they are until they come back down.
  const end = useRef<HTMLLIElement>(null);
  const atBottom = useRef(true);
  const rowCount = turns.reduce((n, t) => n + t.view.chat.length, 0);
  const lastItem = turns.at(-1)?.view.chat.at(-1);
  const growth = lastItem?.kind === "message" ? lastItem.text.length : 0;
  const follow = `${rowCount}:${growth}:${pending ?? ""}:${phase?.kind ?? ""}`;
  useEffect(() => {
    if (rowCount > 0 && atBottom.current)
      end.current?.scrollIntoView?.({ block: "end", behavior: scrollBehavior() });
  }, [follow]);
  const last = turns.at(-1);
  const open = last !== undefined && isOpen(last);
  const status: RunStatus | null =
    last === undefined ? null : (last.view.status ?? last.run.status);
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const send = (text: string) => {
    const trimmed = text.trim();
    if (trimmed === "") return;
    onSend(trimmed);
    setLastSent(trimmed);
    setDraft("");
  };
  /** Sends words again, leaving whatever the parent is typing alone. */
  const resend = (text: string) => {
    onSend(text);
    setLastSent(text);
  };
  const announce = phase === undefined ? announcementOf(last, restoring) : phaseAnnouncement(phase);
  const retryText = last !== undefined && status === "failed" ? parentTextOf(last) : null;
  /** Whether Jadwigo AI has a row in the last turn yet, so the activity line needs no header. */
  const aiSpoke =
    pending === null &&
    last !== undefined &&
    (hasPlan(last) || last.view.chat.some((i) => !(i.kind === "message" && i.from === "parent")));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  // An adult's surface: the kit's Button draws flat and at the parent's sizes here (D4), while a
  // lesson preview elsewhere keeps the child's register.
  const body = (
    <section
      aria-label={say("chat_title")}
      // The parent's pane fills its panel: the messages scroll, the composer stays at the foot.
      className={cn("flex min-h-0 flex-col", parent ? "flex-1 gap-2 px-3 pt-2 pb-3" : "gap-3")}
      data-variant={variant}
    >
      {!parent && <h2 className="text-jw-page-h2 font-semibold">{say("chat_title")}</h2>}
      {restoring && (
        <p data-row="restoring" className="text-jw-page-body text-muted-foreground">
          {say("chat_restoring")}
        </p>
      )}
      {/* In the workspace the list reaches the panel's edges, so its scrollbar sits on the right
        edge, and pads its rows back in line with the composer. */}
      <ol
        aria-label={say("chat_messages")}
        className={cn("flex flex-1 flex-col gap-3 overflow-y-auto", parent && "-mx-3 px-3")}
        onScroll={(e) => {
          const list = e.currentTarget;
          atBottom.current = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
        }}
      >
        {turns.map((turn) => [
          ...turnRows(turn).map((entry) =>
            entry.kind === "plan" ? (
              // A direct child of the scrolling list, so it pins while the turn runs and the
              // turn's tool lines scroll beneath it (dl-uukj.47.50); a sticky card inside a row as
              // tall as itself never pinned. Jadwigo AI's header pins with it.
              <li
                key={`${turn.run.id}-plan`}
                className={cn(
                  "flex flex-col",
                  isOpen(turn) && "sticky top-0 z-10 bg-jw-card",
                  // Its fill spans the list's padding too, so no row shows beside it.
                  isOpen(turn) && parent && "-mx-3 px-3",
                )}
                data-chat-row
                data-plan-row
              >
                {entry.header && <AiHeader language={language} />}
                <PlanCard plan={turn.view.plan ?? []} open={isOpen(turn)} language={language} />
              </li>
            ) : (
              <li
                key={`${turn.run.id}-${entry.row.seq}`}
                className={cn(
                  "flex flex-col",
                  entry.row.kind === "message" && entry.row.from === "parent"
                    ? "items-end"
                    : "items-stretch",
                )}
                data-chat-row
                {...(still ? {} : { "data-enter": "" })}
              >
                {entry.header && <AiHeader language={language} />}
                <RowView
                  row={entry.row}
                  run={turn.run.id}
                  language={language}
                  context={lineContext}
                />
              </li>
            ),
          ),
          // The lesson this turn wrote, as one card under its words (handoff moment 6).
          ...(lessonObject !== undefined &&
          onOpen !== undefined &&
          !isOpen(turn) &&
          turn.view.lesson !== null &&
          wroteLesson(turn.view)
            ? [
                <li key={`${turn.run.id}-lesson`} className="flex flex-col" data-chat-row>
                  <LessonCard
                    lesson={turn.view.lesson}
                    object={lessonObject}
                    language={language}
                    onOpen={onOpen}
                    {...(lessonActions !== undefined && turn === newestCard(turns)
                      ? { actions: lessonActions }
                      : {})}
                  />
                </li>,
              ]
            : []),
          ...(onRate !== undefined && completed(turn)
            ? [
                <li key={`${turn.run.id}-rating`} className="flex flex-col">
                  <Rating
                    language={language}
                    run={turn.run.id}
                    onRate={onRate}
                    onRetry={retryOf(turn, resend)}
                  />
                </li>,
              ]
            : []),
        ])}
        {pending !== null && (
          <li className="flex flex-col items-end" data-chat-row data-pending>
            <div className="flex max-w-[90%] flex-col items-end gap-1 self-end" data-from="parent">
              <p className="sr-only">{say("chat_from_parent")}</p>
              <p className={PARENT_BOX} data-bubble>
                {pending}
              </p>
            </div>
          </li>
        )}
        {phase != null && (phase.open || phase.kind === "stalled") && (
          <li className="flex flex-col" data-chat-row>
            {!aiSpoke && <AiHeader language={language} />}
            <ActivityLine
              phase={phase}
              now={now}
              still={still}
              onRetry={onRetry}
              language={language}
            />
          </li>
        )}
        <li ref={end} aria-hidden className="-mt-3" />
      </ol>
      {turns.length === 0 && !restoring && !parent && (
        <div data-row="empty" className="flex flex-col gap-2">
          <p className="text-muted-foreground">{say("chat_empty")}</p>
          <ul className="flex flex-col gap-1">
            {STARTERS.map((key) => (
              <li key={key}>
                <Button variant="outline" size="sm" onClick={() => send(say(key))}>
                  {say(key)}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {queued.length > 0 && (
        <ul aria-label={say("chat_queued")} className="text-jw-page-body text-muted-foreground">
          {queued.map((text, i) => (
            // A follow-up may repeat; its place in the queue does not.
            <li key={`${i}-${text}`} data-row="queued">
              {say("chat_queued")}: {text}
            </li>
          ))}
        </ul>
      )}
      {retryText !== null && (
        <div data-row="retry-turn" className="flex items-center gap-2 text-jw-page-body">
          <p>{say("chat_turn_unfinished")}</p>
          <Button variant="outline" size="sm" onClick={() => resend(retryText)}>
            {say("chat_retry_turn")}
          </Button>
        </div>
      )}
      {/* The run's state as words, never a coloured dot alone; the parent's is in the band. */}
      {!parent && (
        <>
          <p
            data-status={phase === undefined ? (status ?? "none") : (phase?.kind ?? "none")}
            className="text-jw-page-body"
          >
            {phase === undefined
              ? status === null
                ? ""
                : say(STATUS_KEY[status])
              : phase === null
                ? ""
                : say(phase.copyKey)}
          </p>
          <p role="status" aria-live="polite" data-live className="sr-only">
            {announce === null ? "" : say(announce)}
          </p>
        </>
      )}
      {!online && (
        <p data-row="offline" className="text-jw-page-body">
          {say("chat_offline")}
        </p>
      )}
      {sendFailed && sendLimit !== null && (
        <p
          role="alert"
          data-row="send-limited"
          data-limit={sendLimit}
          className="text-jw-page-body"
        >
          {say(LIMIT_LINE[sendLimit])}
        </p>
      )}
      {sendFailed && sendLimit === null && (
        <div
          role="alert"
          data-row="send-failed"
          className="flex items-center gap-2 text-jw-page-body"
        >
          <p>{say("chat_send_again")}</p>
          {(onResend !== undefined || lastSent !== null) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onResend !== undefined ? onResend() : lastSent !== null && resend(lastSent)
              }
            >
              {say("chat_retry_turn")}
            </Button>
          )}
        </div>
      )}
      {context !== null && (
        <p
          className="flex w-fit max-w-full items-center gap-1.5 self-start rounded-full border-jw border-jw-line bg-jw-card px-2.5 py-0.5 text-jw-page-small text-jw-ink-soft"
          data-context-chip
        >
          <EyeIcon aria-hidden className="size-3.5 shrink-0" />
          <span className="min-w-0 truncate">{context}</span>
          {onCloseContext !== undefined && (
            <button
              type="button"
              aria-label={say("chat_context_close")}
              onClick={onCloseContext}
              className="-mr-1 grid size-5 shrink-0 place-items-center rounded-full hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
              data-context-close
            >
              <XIcon aria-hidden className="size-3" />
            </button>
          )}
        </p>
      )}
      {asking !== null ? (
        <ChooseForm
          key={asking.call_id}
          form={asking.choose}
          language={language}
          onAnswer={(answers) => {
            setChosen((given) => ({ ...given, [asking.call_id]: answers }));
            onChoose?.(asking.call_id, answers);
          }}
        />
      ) : parent ? (
        // The parent's composer, Claude-like (design review 2026-11-02): one rounded box, the words
        // on top, then Dla on the left and an explicit Wyślij on the right.
        <form
          onSubmit={submit}
          className="flex flex-col gap-2 rounded-jw-box border-jw border-input bg-background px-3 pt-3 pb-2 transition-[border-color,box-shadow] duration-jw-fast focus-within:border-jw-focus focus-within:ring-2 focus-within:ring-selected"
          data-composer
        >
          <label className="flex flex-col">
            <span className="sr-only">{say("chat_composer_label")}</span>
            <textarea
              ref={composer}
              value={draft}
              rows={3}
              placeholder={say("parent_composer")}
              className="resize-none border-0 bg-transparent text-jw-page-body text-jw-ink outline-none placeholder:text-jw-placeholder"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
                // Stop from the keyboard, where the parent already is (dl-z5ja.28).
                if (e.key === "Escape" && open && !stopping) {
                  e.preventDefault();
                  onStop();
                }
              }}
            />
          </label>
          <div className="flex items-center gap-2">
            {composerLead}
            <span className="flex-1" />
            {/* The design system's action, as the first screen's "Zrób lekcję": quiet while empty. */}
            <Button type="submit" size="control" aria-disabled={draft.trim() === ""} data-send>
              {say("chat_send")}
              <ArrowRightIcon aria-hidden />
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={submit} className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-jw-page-body">
            <span>{say("chat_composer_label")}</span>
            <textarea
              ref={composer}
              value={draft}
              rows={2}
              className="rounded-jw-control border-jw border-input bg-background px-2.5 py-2 text-jw-page-body text-foreground outline-none focus-visible:border-jw-focus focus-visible:ring-2 focus-visible:ring-selected"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(draft);
                }
                // Stop from the keyboard, where the parent already is (dl-z5ja.28).
                if (e.key === "Escape" && open && !stopping) {
                  e.preventDefault();
                  onStop();
                }
              }}
            />
          </label>
          <Button type="submit" size="control">
            {say("chat_send")}
          </Button>
          {open && (
            <Button
              type="button"
              variant="outline"
              size="control"
              disabled={stopping}
              onClick={onStop}
            >
              {stopping ? say("chat_stopping") : say("chat_stop")}
            </Button>
          )}
        </form>
      )}
      {next.length > 0 && (
        <section aria-label={say("chat_queue_next")} className="flex flex-col gap-1" data-next>
          <h3 className="text-jw-page-small font-bold text-jw-ink-soft">
            {say("chat_queue_next")}
          </h3>
          <ol className="flex flex-col gap-1">
            {next.map((text, i) => (
              // A waiting row may repeat; its place in the queue does not.
              <li
                key={`${i}-${text}`}
                className="flex items-center gap-2 rounded-jw-small border-jw border-jw-line bg-jw-card px-2 py-1 text-jw-page-body"
                data-next-row
              >
                <span className="min-w-0 flex-1 truncate text-jw-ink">{text}</span>
                {onSendNow !== undefined && (
                  <Button variant="outline" size="sm" onClick={() => onSendNow(i)} data-send-now>
                    {say("chat_queue_send_now")}
                  </Button>
                )}
                {onTakeNext !== undefined && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const words = onTakeNext(i);
                        if (words !== null) setDraft(words);
                      }}
                      data-next-edit
                    >
                      {say("chat_queue_edit")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTakeNext(i)}
                      data-next-remove
                    >
                      {say("chat_queue_remove")}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
    </section>
  );
  return <RegisterProvider value="app">{body}</RegisterProvider>;
}
