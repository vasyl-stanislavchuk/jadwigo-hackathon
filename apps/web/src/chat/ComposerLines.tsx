/**
 * The lines around the composer (split from ChatPane.tsx, dl-uukj.47.71.1, no change in
 * behaviour): the empty pane's starters, the queued follow-ups, a failed turn's retry, the status
 * and live region of the playground, offline, a refused or failed send, the context chip, and the
 * "Następne" queue under the composer. Lane D of wave dl-uukj.47.71 owns them.
 */

import type { MessageContext, RunStatus } from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button } from "@jadwigo/ui";
import { EyeIcon, XIcon } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";
import { parentTextOf } from "./ChatThread.tsx";
import "./chat.css";
import { isOpen, type SendLimit, type Turn } from "./conversation.ts";
import { phaseAnnouncement, type RunPhase } from "./phase.ts";

const STATUS_KEY: Record<RunStatus, CopyKey> = {
  queued: "chat_status_queued",
  in_progress: "chat_status_in_progress",
  awaiting_input: "chat_status_awaiting_input",
  completed: "chat_status_completed",
  failed: "chat_status_failed",
  cancelled: "chat_status_cancelled",
};

const STARTERS: readonly CopyKey[] = ["chat_starter_1", "chat_starter_2", "chat_starter_3"];

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

/** Each message limit's line: the minute's says wait a moment, the day's says come back tomorrow. */
const LIMIT_LINE: Readonly<Record<SendLimit, CopyKey>> = {
  minute: "chat_limit_busy",
  day: "chat_limit_daily",
};

export interface ComposerLinesProps {
  language: Language;
  turns: readonly Turn[];
  parent: boolean;
  restoring: boolean;
  queued: readonly string[];
  phase?: RunPhase | null | undefined;
  sendFailed: boolean;
  sendLimit: SendLimit | null;
  onResend?: (() => void) | undefined;
  lastSent: string | null;
  send(text: string): void;
  resend(text: string): void;
  context: string | null;
  onCloseContext?: (() => void) | undefined;
}

export { contextLine };

/** Everything between the thread and the composer. */
export function ComposerLines({
  language,
  turns,
  parent,
  restoring,
  queued,
  phase,
  sendFailed,
  sendLimit,
  onResend,
  lastSent,
  send,
  resend,
  context,
  onCloseContext,
}: ComposerLinesProps): ReactElement {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const online = useOnline();
  const last = turns.at(-1);
  const status: RunStatus | null =
    last === undefined ? null : (last.view.status ?? last.run.status);
  const announce = phase === undefined ? announcementOf(last, restoring) : phaseAnnouncement(phase);
  const retryText = last !== undefined && status === "failed" ? parentTextOf(last) : null;
  return (
    <>
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
    </>
  );
}

export interface NextQueueProps {
  language: Language;
  next: readonly string[];
  onSendNow?: ((index: number) => void) | undefined;
  onTakeNext?: ((index: number) => string | null) | undefined;
  setDraft(text: string): void;
}

/** The "Następne" queue under the composer (queue.ts). */
export function NextQueue({
  language,
  next,
  onSendNow,
  onTakeNext,
  setDraft,
}: NextQueueProps): ReactElement | null {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  if (next.length === 0) return null;
  return (
    <section aria-label={say("chat_queue_next")} className="flex flex-col gap-1" data-next>
      <h3 className="text-jw-page-small font-bold text-jw-ink-soft">{say("chat_queue_next")}</h3>
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
                <Button variant="outline" size="sm" onClick={() => onTakeNext(i)} data-next-remove>
                  {say("chat_queue_remove")}
                </Button>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
