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
 * button (Esc still stops), the run's state in the workspace's band instead (`statusOf`), and the
 * composer "Możesz pisać dalej…" with a 32 px round ink send button, quiet while empty.
 *
 * The two sides read apart (dl-uukj.47.28; owner's call of 2026-11-02): the parent's words are a
 * filled bubble on the right, "Ty" kept for screen readers; Jadwigo AI's turn is plain prose on the
 * left under one header (its crown mark and its name), its tool lines and widgets in the same
 * column. A parent's steer keeps its label in view ("Ty · Twoja zmiana w lekcji"). Rows fade in
 * only when the system allows motion (chat.css).
 */

import {
  RUN_ERROR_TYPE,
  type RunError,
  type RunId,
  type RunRatingCreate,
  type RunStatus,
} from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ChatItem } from "@jadwigo/core";
import { cn } from "@jadwigo/ui";
import { ArrowUpIcon, CheckIcon, LoaderCircleIcon } from "lucide-react";
import { type FormEvent, type ReactElement, useEffect, useRef, useState } from "react";
import { Button } from "./button.tsx";
import "./chat.css";
import { isOpen, type SendLimit, type Turn } from "./conversation.ts";
import { JadwigoAiMark } from "./JadwigoAiMark.tsx";
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

type ToolItem = Extract<ChatItem, { kind: "tool" }>;

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
  const result = toolResult(tool, language);
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
        <div className="ml-6 flex flex-col gap-2 py-1">
          <p className="text-jw-page-small font-bold text-jw-ink-soft">
            {say("chat_tool_what_done")}
          </p>
          {result?.kind === "widget" && !result.keepVisible ? (
            result.element
          ) : (
            <p data-what-done>{stateWords(tool, language)}</p>
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
    const result = toolResult(t, language);
    return result?.kind === "widget" && result.keepVisible
      ? [{ call_id: t.call_id, element: result.element }]
      : [];
  });
  return (
    <div className="flex flex-col gap-1 text-sm" data-tools>
      <details className="text-jw-ink-soft" data-tool-group>
        <summary className="cursor-pointer">{head}</summary>
        <ul
          aria-label={copy(language, "chat_tool_lines", {}, "adult")}
          className="mt-1 flex flex-col gap-1"
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
      size="xs"
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
    <div role="alert" data-row="error" className="rounded-md border p-2 text-sm">
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
            className="flex max-w-[85%] flex-col items-end gap-1 self-end"
          >
            {/* "Ty" for a screen reader; a steer says what it was in view. */}
            <p className={cn("text-jw-page-small text-jw-ink-soft", steer === null && "sr-only")}>
              {copy(language, "chat_from_parent", {}, "adult")}
              {steer !== null && ` · ${steer}`}
            </p>
            <p
              className="rounded-jw-dialog bg-jw-pick px-3 py-2 whitespace-pre-wrap text-jw-pick-ink"
              data-bubble
            >
              {row.text}
            </p>
          </div>
        );
      return (
        <p data-from={row.from} className="whitespace-pre-wrap text-jw-ink" data-prose>
          {row.text}
        </p>
      );
    }
    case "tools":
      return <ToolGroup tools={row.tools} language={language} context={context} />;
    case "steer":
      return (
        <p data-row="steer" data-level={row.level} className="text-sm">
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
      return (
        <p data-row="approval" className="text-sm">
          {copy(language, key, { summary: row.summary }, "adult")}
        </p>
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

/**
 * A turn's rows, the first of Jadwigo AI's marked to carry its header: one header per turn, over
 * its prose, tool lines and widgets, however the parent's words fall between them.
 */
function turnRows(turn: Turn): { row: Row; header: boolean }[] {
  let headed = false;
  return rowsOf(turn.view.chat).map((row) => {
    const ai = !(row.kind === "message" && row.from === "parent");
    const header = ai && !headed;
    if (ai) headed = true;
    return { row, header };
  });
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
}: ChatPaneProps): ReactElement {
  const lineContext: LineContext = nameOf === undefined ? {} : { nameOf };
  const parent = variant === "parent";
  const [draft, setDraft] = useState("");
  /** The last words sent, so a send that did not reach the server can go again. */
  const [lastSent, setLastSent] = useState<string | null>(null);
  const online = useOnline();
  /** Rows enter with a fade only when the system allows motion (chat.css). */
  const [still] = useState(lessMotion);
  const end = useRef<HTMLDivElement>(null);
  const rowCount = turns.reduce((n, t) => n + t.view.chat.length, 0);
  useEffect(() => {
    if (rowCount > 0) end.current?.scrollIntoView?.({ block: "end", behavior: scrollBehavior() });
  }, [rowCount]);
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
    last.view.chat.some((i) => !(i.kind === "message" && i.from === "parent"));
  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  return (
    <section
      aria-label={say("chat_title")}
      className={cn("flex min-h-0 flex-col gap-3", parent && "h-full p-4")}
      data-variant={variant}
    >
      {!parent && <h2 className="text-base font-medium">{say("chat_title")}</h2>}
      {restoring && (
        <p data-row="restoring" className="text-muted-foreground text-sm">
          {say("chat_restoring")}
        </p>
      )}
      <ol aria-label={say("chat_messages")} className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {turns.map((turn) => [
          ...turnRows(turn).map(({ row, header }) => (
            <li
              key={`${turn.run.id}-${row.seq}`}
              className={cn(
                "flex flex-col",
                row.kind === "message" && row.from === "parent" ? "items-end" : "items-stretch",
              )}
              data-chat-row
              {...(still ? {} : { "data-enter": "" })}
            >
              {header && <AiHeader language={language} />}
              <RowView row={row} run={turn.run.id} language={language} context={lineContext} />
            </li>
          )),
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
            <div className="flex max-w-[85%] flex-col items-end gap-1 self-end" data-from="parent">
              <p className="sr-only">{say("chat_from_parent")}</p>
              <p
                className="rounded-jw-dialog bg-jw-pick px-3 py-2 whitespace-pre-wrap text-jw-pick-ink"
                data-bubble
              >
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
      </ol>
      <div ref={end} aria-hidden />
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
        <ul aria-label={say("chat_queued")} className="text-muted-foreground text-sm">
          {queued.map((text, i) => (
            // A follow-up may repeat; its place in the queue does not.
            <li key={`${i}-${text}`} data-row="queued">
              {say("chat_queued")}: {text}
            </li>
          ))}
        </ul>
      )}
      {retryText !== null && (
        <div data-row="retry-turn" className="flex items-center gap-2 text-sm">
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
            className="text-sm"
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
        <p data-row="offline" className="text-sm">
          {say("chat_offline")}
        </p>
      )}
      {sendFailed && sendLimit !== null && (
        <p role="alert" data-row="send-limited" data-limit={sendLimit} className="text-sm">
          {say(LIMIT_LINE[sendLimit])}
        </p>
      )}
      {sendFailed && sendLimit === null && (
        <div role="alert" data-row="send-failed" className="flex items-center gap-2 text-sm">
          <p>{say("chat_send_again")}</p>
          {lastSent !== null && (
            <Button variant="outline" size="sm" onClick={() => resend(lastSent)}>
              {say("chat_retry_turn")}
            </Button>
          )}
        </div>
      )}
      <form
        onSubmit={submit}
        className={cn(
          "flex items-end gap-2",
          parent && "rounded-jw-control border-jw border-jw-line bg-jw-card p-2",
        )}
      >
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className={cn(parent && "sr-only")}>{say("chat_composer_label")}</span>
          <textarea
            value={draft}
            rows={2}
            placeholder={parent ? say("parent_composer") : undefined}
            className={cn(
              "rounded-md border px-2 py-1",
              parent &&
                "resize-none border-0 bg-transparent text-jw-page-body text-jw-ink outline-none placeholder:text-jw-placeholder",
            )}
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
        {parent ? (
          <button
            type="submit"
            aria-label={say("chat_send")}
            aria-disabled={draft.trim() === ""}
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full focus-visible:outline-3 focus-visible:outline-jw-focus",
              draft.trim() === "" ? "bg-jw-act-quiet text-jw-ink-soft" : "bg-jw-ink text-jw-card",
            )}
            data-send
          >
            <ArrowUpIcon aria-hidden className="size-4" />
          </button>
        ) : (
          <Button type="submit">{say("chat_send")}</Button>
        )}
        {open && !parent && (
          <Button type="button" variant="outline" disabled={stopping} onClick={onStop}>
            {stopping ? say("chat_stopping") : say("chat_stop")}
          </Button>
        )}
      </form>
    </section>
  );
}
