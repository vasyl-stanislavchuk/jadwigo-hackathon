/**
 * The chat's thread (split from ChatPane.tsx, dl-uukj.47.71.1, no change in behaviour): each turn's
 * rows, the plan, the tool groups, the lesson card and the rating, the pending echo and the activity
 * line, inside the one scrolling list that follows the bottom. Lane B of wave dl-uukj.47.71 turns
 * these rows into the turn spine.
 */

import {
  RUN_ERROR_TYPE,
  type RunError,
  type RunId,
  type RunRatingCreate,
} from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ChatItem } from "@jadwigo/core";
import { Button, cn } from "@jadwigo/ui";
import { CheckIcon, ChevronDownIcon, LoaderCircleIcon, ZapIcon } from "lucide-react";
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";
import { ChatMarkdown } from "./ChatMarkdown.tsx";
import { recapOf } from "./ChooseForm.tsx";
import "./chat.css";
import { type ReadAttachment, ThreadAttachments } from "./attachments/ThreadAttachments.tsx";
import { isOpen, type Turn } from "./conversation.ts";
import { JadwigoAiMark } from "./JadwigoAiMark.tsx";
import { CitationChips } from "./objects/CitationChips.tsx";
import { LessonCard, wroteLesson } from "./objects/LessonCard.tsx";
import type { ObjectRef } from "./objects/ref.ts";
import { PLAN_MIN, PlanCard } from "./PlanCard.tsx";
import { elapsedSeconds, type RunPhase } from "./phase.ts";
import { Rating } from "./Rating.tsx";
import { type LineContext, sentenceOf, TOOL_ICON } from "./toolLine.ts";
import { ToolDetails, toolResult } from "./widgets/Widgets.tsx";

/** The parent's words: a quiet box in the soft paper fill on the right, Jadwigo AI's answer plain prose beside it. */
const PARENT_BOX =
  "rounded-jw-box border-jw border-jw-line bg-jw-act-quiet px-3.5 py-2.5 whitespace-pre-wrap text-jw-ink";

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
  // Every try failed (dl-hin8.28): said plainly, never the engine's own words; the turn's
  // "Tej tury nie udało się dokończyć" line and its retry follow under it.
  if (error.type === RUN_ERROR_TYPE.stepFailed) return say("chat_problem_failed");
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
  readAttachment,
}: {
  row: Row;
  run: RunId;
  language: Language;
  context: LineContext;
  readAttachment?: ReadAttachment | undefined;
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
            {row.text !== "" && (
              <p className={PARENT_BOX} data-bubble>
                {row.text}
              </p>
            )}
            {readAttachment !== undefined && (
              <ThreadAttachments
                language={language}
                attachments={row.attachments}
                read={readAttachment}
              />
            )}
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

export function parentTextOf(turn: Turn): string | null {
  for (const item of turn.view.chat)
    if (item.kind === "message" && item.from === "parent") return item.text;
  return null;
}

/** Whether the parent asked the system for less motion. */
export const lessMotion = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Smooth unless the parent asked the system for less motion. */
const scrollBehavior = (): ScrollBehavior => (lessMotion() ? "auto" : "smooth");

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

export interface ChatThreadProps {
  language: Language;
  turns: readonly Turn[];
  parent: boolean;
  phase?: RunPhase | null | undefined;
  now: number;
  pending: string | null;
  still: boolean;
  lineContext: LineContext;
  onRetry?: (() => void) | undefined;
  onRate?: ((run: RunId, body: RunRatingCreate) => Promise<unknown>) | undefined;
  resend(text: string): void;
  lessonObject?: ObjectRef | undefined;
  onOpen?: ((object: ObjectRef) => void) | undefined;
  lessonActions?: ReactNode;
  readAttachment?: ReadAttachment | undefined;
}

export function ChatThread({
  language,
  turns,
  parent,
  phase,
  now,
  pending,
  still,
  lineContext,
  onRetry,
  onRate,
  resend,
  lessonObject,
  onOpen,
  lessonActions,
  readAttachment,
}: ChatThreadProps): ReactElement {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  // The list follows Jadwigo AI to the bottom as it writes (design review 2026-11-02): a new row,
  // a reply that grows, the echo, the activity line. Only while the parent is at the bottom: one
  // who scrolled up to read stays where they are until they come back down. Only the list's own box
  // moves: scrollIntoView scrolls every scrollable ancestor too, overflow-hidden ones and the window
  // included, which left the composer at the top of a wide window over blank space (dl-uukj.47.68).
  const list = useRef<HTMLOListElement>(null);
  const atBottom = useRef(true);
  const rowCount = turns.reduce((n, t) => n + t.view.chat.length, 0);
  const lastItem = turns.at(-1)?.view.chat.at(-1);
  const growth = lastItem?.kind === "message" ? lastItem.text.length : 0;
  const follow = `${rowCount}:${growth}:${pending ?? ""}:${phase?.kind ?? ""}`;
  useEffect(() => {
    const box = list.current;
    if (rowCount > 0 && atBottom.current && box !== null)
      box.scrollTo?.({ top: box.scrollHeight, behavior: scrollBehavior() });
  }, [follow]);
  const last = turns.at(-1);
  /** Whether Jadwigo AI has a row in the last turn yet, so the activity line needs no header. */
  const aiSpoke =
    pending === null &&
    last !== undefined &&
    (hasPlan(last) || last.view.chat.some((i) => !(i.kind === "message" && i.from === "parent")));
  return (
    <ol
      ref={list}
      aria-label={say("chat_messages")}
      data-chat-list
      // relative: the list is its sr-only lines' containing block, so on a long turn they stay
      // inside its clip rather than stretching the page below the window (steward on #778).
      className={cn("relative flex flex-1 flex-col gap-3 overflow-y-auto", parent && "-mx-3 px-3")}
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
                readAttachment={readAttachment}
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
    </ol>
  );
}
