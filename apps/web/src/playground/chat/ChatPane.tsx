/**
 * The chat pane of `/playground/chat` (dl-z5ja.17), drawn from each turn's `RunView`: the
 * messages, the run's state as words in a polite live region, tool lines folded under one line
 * with a stuck one shown inline, the budget steer (PostHog never shows it), the queued follow-ups,
 * Stop and Stopping, an error row with Copy details (the run id and the attempt), and a Restoring
 * line while the page catches up. The pattern list is `docs/research/posthog-ai-ux-patterns.md`
 * 15.3. Every word a parent reads comes from `@jadwigo/copy`.
 *
 * `variant="parent"` is the same pane inside the parent app's lesson workspace (dl-z5ja.108,
 * decision dl-xo0q): no heading (the panel has one), no starters (the first screen asked), no Stop
 * button (Esc still stops), the run's state in the workspace's band instead (`statusOf`), and the
 * composer "Możesz pisać dalej…" with a 32 px round ink send button, quiet while empty.
 */

import {
  RUN_ERROR_TYPE,
  type RunError,
  type RunId,
  type RunRatingCreate,
  type RunStatus,
  type VerbName,
} from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ChatItem } from "@jadwigo/core";
import { cn } from "@jadwigo/ui";
import { ArrowUpIcon } from "lucide-react";
import { type FormEvent, type ReactElement, useEffect, useRef, useState } from "react";
import { Button } from "../tool/button.tsx";
import { isOpen, type SendLimit, type Turn } from "./conversation.ts";
import { Rating } from "./Rating.tsx";
import { toolResult } from "./widgets/Widgets.tsx";

const TOOL_KEY: Record<VerbName, CopyKey> = {
  lesson_draft: "chat_tool_lesson_draft",
  lesson_show: "chat_tool_lesson_show",
  lesson_edit: "chat_tool_lesson_edit",
  lesson_check: "chat_tool_lesson_check",
  question_search: "chat_tool_question_search",
  learner_skills: "chat_tool_learner_skills",
  learner_week: "chat_tool_learner_week",
  learner_mistakes: "chat_tool_learner_mistakes",
  curriculum_topics: "chat_tool_curriculum_topics",
  lesson_ideas: "chat_tool_lesson_ideas",
};

export const STATUS_KEY: Record<RunStatus, CopyKey> = {
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

function ToolLine({ tool, language }: { tool: ToolItem; language: Language }): ReactElement {
  const what = copy(language, TOOL_KEY[tool.verb], {}, "adult");
  const how =
    tool.state === "failed"
      ? copy(language, "chat_tool_stuck", { message: tool.error?.message ?? "" }, "adult")
      : tool.state === "running"
        ? copy(language, "chat_tool_running", {}, "adult")
        : tool.state === "pending"
          ? copy(language, "chat_tool_pending", {}, "adult")
          : tool.state === "rejected"
            ? copy(language, "chat_tool_rejected", {}, "adult")
            : null;
  const result = toolResult(tool, language);
  return (
    <li data-tool={tool.verb} data-state={tool.state}>
      {what}
      {how === null ? null : `: ${how}`}
      {result !== null && (result.kind === "plain" || !result.keepVisible) && result.element}
    </li>
  );
}

/**
 * Tool lines folded under one line; a stuck one stays in view under the fold, and so does each
 * widget its registry entry keeps visible (dl-z5ja.24). The plain card stays inside the fold.
 */
function ToolGroup({ tools, language }: { tools: ToolItem[]; language: Language }): ReactElement {
  const stuck = tools.filter((t) => t.state === "failed");
  const latest = tools.at(-1);
  const head = latest === undefined ? "" : copy(language, TOOL_KEY[latest.verb], {}, "adult");
  const shown = tools.flatMap((t) => {
    const result = toolResult(t, language);
    return result?.kind === "widget" && result.keepVisible
      ? [{ call_id: t.call_id, element: result.element }]
      : [];
  });
  return (
    <div className="flex flex-col gap-1 text-sm">
      <details className="text-muted-foreground">
        <summary>
          {head} · {copy(language, "chat_tool_count", { n: tools.length }, "adult")}
        </summary>
        <ul aria-label={copy(language, "chat_tool_lines", {}, "adult")} className="ml-4 list-disc">
          {tools.map((t) => (
            <ToolLine key={t.call_id} tool={t} language={language} />
          ))}
        </ul>
      </details>
      {stuck.length > 0 && (
        <ul
          aria-label={copy(language, "chat_tool_lines_stuck", {}, "adult")}
          className="font-medium"
        >
          {stuck.map((t) => (
            <ToolLine key={t.call_id} tool={t} language={language} />
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

function ErrorRow({
  item,
  run,
  language,
}: {
  item: Extract<ChatItem, { kind: "error" }>;
  run: RunId;
  language: Language;
}): ReactElement {
  const [copied, setCopied] = useState(false);
  const details = `run ${run} attempt ${item.attempt}: ${item.error.type}`;
  return (
    <div role="alert" data-row="error" className="rounded-md border p-2 text-sm">
      <p>{problemOf(item.error, item.retryable, language)}</p>
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
    </div>
  );
}

function RowView({ row, run, language }: { row: Row; run: RunId; language: Language }) {
  switch (row.kind) {
    case "message":
      return (
        <div
          data-from={row.from}
          data-steer={row.steer?.source}
          className={row.from === "parent" ? "self-end" : "self-start"}
        >
          <p className="text-muted-foreground text-xs">
            {copy(
              language,
              row.from === "parent" ? "chat_from_parent" : "chat_from_agent",
              {},
              "adult",
            )}
            {row.steer !== undefined &&
              ` · ${copy(
                language,
                row.steer.source === "lesson_edit" ? "chat_steered_edit" : "chat_steered",
                {},
                "adult",
              )}`}
          </p>
          <p className="rounded-md border px-3 py-2 whitespace-pre-wrap">{row.text}</p>
        </div>
      );
    case "tools":
      return <ToolGroup tools={row.tools} language={language} />;
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

/** The last turn's state, which the pane, or the parent workspace's band, writes in words. */
export function statusOf(turns: readonly Turn[]): RunStatus | null {
  const last = turns.at(-1);
  return last === undefined ? null : (last.view.status ?? last.run.status);
}

/** What the live region says, for the parent workspace's band (the pane's own logic). */
export function announcementFor(turns: readonly Turn[], restoring: boolean): CopyKey | null {
  return announcementOf(turns.at(-1), restoring);
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

/** Smooth unless the parent asked the system for less motion. */
const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

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
}: ChatPaneProps): ReactElement {
  const parent = variant === "parent";
  const [draft, setDraft] = useState("");
  /** The last words sent, so a send that did not reach the server can go again. */
  const [lastSent, setLastSent] = useState<string | null>(null);
  const online = useOnline();
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
  const announce = announcementOf(last, restoring);
  const retryText = last !== undefined && status === "failed" ? parentTextOf(last) : null;
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
          ...rowsOf(turn.view.chat).map((row) => (
            <li key={`${turn.run.id}-${row.seq}`} className="flex flex-col">
              <RowView row={row} run={turn.run.id} language={language} />
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
          <p data-status={status ?? "none"} className="text-sm">
            {status === null ? "" : say(STATUS_KEY[status])}
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
