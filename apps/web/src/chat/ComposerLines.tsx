/**
 * The lines above the composer (lane D of wave dl-uukj.47.71): the empty pane's starters, the
 * queue rows (D6), a failed turn's retry (until the spine's foot carries it, lane B), the
 * playground's status, and one line for offline, a refused or a failed send (§4.6). The page's one
 * live region is the band's (dl-uukj.47.71.10). The "Jadwigo AI widzi" chip is gone (S21): Dla in
 * the composer already says it.
 */

import type { RunStatus } from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, DisabledReason } from "@jadwigo/ui";
import { CornerDownRightIcon, InfoIcon, RotateCcwIcon, XIcon } from "lucide-react";
import { type ReactElement, useEffect, useState } from "react";
import { parentTextOf } from "./ChatThread.tsx";
import "./chat.css";
import type { SendLimit, Turn } from "./conversation.ts";
import type { RunPhase } from "./phase.ts";

const STATUS_KEY: Record<RunStatus, CopyKey> = {
  queued: "chat_status_queued",
  in_progress: "chat_status_in_progress",
  awaiting_input: "chat_status_awaiting_input",
  completed: "chat_status_completed",
  failed: "chat_status_failed",
  cancelled: "chat_status_cancelled",
};

const STARTERS: readonly CopyKey[] = ["chat_starter_1", "chat_starter_2", "chat_starter_3"];

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

/**
 * Offline, a refused send or a failed one (handoff dl-uukj.47.71 §4.6, last row): one muted line
 * above the composer with an info icon and at most one action, never inside the thread. A failed
 * send offers Spróbuj ponownie; a limit says when to come back and offers nothing; offline says the
 * words wait, and offers Spróbuj ponownie too when a send already failed.
 */
function SendLine({
  language,
  online,
  sendFailed,
  sendLimit,
  onRetry,
}: {
  language: Language;
  online: boolean;
  sendFailed: boolean;
  sendLimit: SendLimit | null;
  onRetry?: (() => void) | undefined;
}): ReactElement | null {
  const say = (key: CopyKey) => copy(language, key, {}, "adult");
  const line: { row: string; key: CopyKey; retry: boolean } | null = !online
    ? { row: "offline", key: "chat_offline", retry: sendFailed && sendLimit === null }
    : sendFailed && sendLimit !== null
      ? { row: "send-limited", key: LIMIT_LINE[sendLimit], retry: false }
      : sendFailed
        ? { row: "send-failed", key: "chat_send_again", retry: true }
        : null;
  if (line === null) return null;
  return (
    <div
      role={sendFailed ? "alert" : "status"}
      data-row={line.row}
      {...(line.row === "send-limited" && sendLimit !== null ? { "data-limit": sendLimit } : {})}
      className="flex items-center gap-2 text-jw-page-small text-muted-foreground"
    >
      <InfoIcon aria-hidden className="size-3.5 shrink-0" />
      <p className="min-w-0 flex-1">{say(line.key)}</p>
      {line.retry && onRetry !== undefined && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="shrink-0">
          <RotateCcwIcon aria-hidden />
          {say("chat_retry_turn")}
        </Button>
      )}
    </div>
  );
}

/** A waiting row as drawn: its words, and how many photos go with it. */
interface QueueRowData {
  text: string;
  photos: number;
}

/**
 * One waiting row above the composer (D6, §4.5, s17): the corner arrow, the words (or, for photos
 * alone, how many: dl-uukj.47.70), "Wyślę, gdy skończę", Wyślij teraz and ×. Photos can't go into a
 * running turn, so their Wyślij teraz says why instead. On a phone the buttons go under the words.
 */
function QueueRow({
  language,
  row,
  onSendNow,
  onRemove,
}: {
  language: Language;
  row: QueueRowData;
  onSendNow?: (() => void) | undefined;
  onRemove?: (() => void) | undefined;
}): ReactElement {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const words = row.text.trim() !== "" ? row.text : say("chat_steer_photos", { n: row.photos });
  const sendNow =
    onSendNow === undefined ? null : (
      <Button
        variant="ghost"
        size="sm"
        onClick={onSendNow}
        className="max-sm:min-h-9 font-semibold"
        data-send-now
      >
        {say("chat_queue_now")}
      </Button>
    );
  return (
    <li
      className="flex items-center gap-2 rounded-jw-small border-jw border-jw-line bg-jw-card py-1 pr-1 pl-3 text-jw-page-body max-sm:flex-wrap"
      data-row="queued"
      data-next-row
      data-photos={row.photos}
    >
      <CornerDownRightIcon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-jw-ink" data-queue-words>
        {words}
      </span>
      <span className="flex shrink-0 items-center gap-1 max-sm:w-full max-sm:pl-5.5">
        <span className="text-jw-page-small text-muted-foreground max-sm:flex-1">
          {say("chat_queue_label")}
        </span>
        {sendNow !== null &&
          (row.photos > 0 ? (
            <DisabledReason reason={say("chat_queue_photos_wait")}>{sendNow}</DisabledReason>
          ) : (
            sendNow
          ))}
        {onRemove !== undefined && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={say("chat_queue_remove")}
            onClick={onRemove}
            className="max-sm:size-9"
            data-next-remove
          >
            <XIcon aria-hidden />
          </Button>
        )}
      </span>
    </li>
  );
}

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
  /** The waiting rows (queue.ts): words, or photos alone, read as their count. */
  next: readonly QueueRowData[];
  onSendNow?: ((index: number) => void) | undefined;
  /** Takes one waiting row out (×). */
  onTakeNext?: ((index: number) => string | null) | undefined;
}

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
  next,
  onSendNow,
  onTakeNext,
}: ComposerLinesProps): ReactElement {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const online = useOnline();
  const last = turns.at(-1);
  const status: RunStatus | null =
    last === undefined ? null : (last.view.status ?? last.run.status);
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
      {(queued.length > 0 || next.length > 0) && (
        <ul aria-label={say("chat_queued")} className="flex flex-col gap-1.5" data-queue>
          {/* Sent and on their way: no action is left on them. A follow-up may repeat; its
              place in the queue does not. */}
          {queued.map((text, i) => (
            <QueueRow key={`sent-${i}-${text}`} language={language} row={{ text, photos: 0 }} />
          ))}
          {next.map((row, i) => (
            <QueueRow
              key={`next-${i}-${row.text}`}
              language={language}
              row={row}
              onSendNow={onSendNow === undefined ? undefined : () => onSendNow(i)}
              onRemove={onTakeNext === undefined ? undefined : () => onTakeNext(i)}
            />
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
      )}
      <SendLine
        language={language}
        online={online}
        sendFailed={sendFailed}
        sendLimit={sendLimit}
        onRetry={
          onResend !== undefined ? onResend : lastSent !== null ? () => resend(lastSent) : undefined
        }
      />
    </>
  );
}
