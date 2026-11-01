/**
 * The chat pane of `/playground/chat` (dl-z5ja.17), drawn from each turn's `RunView`: the
 * messages, the run's state as words in a polite live region, tool lines folded under one line
 * with a stuck one shown inline, the budget steer (PostHog never shows it), the queued follow-ups,
 * Stop and Stopping, an error row with Copy details (the run id and the attempt), and a Restoring
 * line while the page catches up. The pattern list is `docs/research/posthog-ai-ux-patterns.md`
 * 15.3. Every word a parent reads comes from `@jadwigo/copy`.
 */

import type { RunId, RunStatus, VerbName } from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ChatItem } from "@jadwigo/core";
import { type FormEvent, type ReactElement, useState } from "react";
import { Button } from "../tool/button.tsx";
import { isOpen, type Turn } from "./conversation.ts";

const TOOL_KEY: Record<VerbName, CopyKey> = {
  lesson_draft: "chat_tool_lesson_draft",
  lesson_show: "chat_tool_lesson_show",
  lesson_edit: "chat_tool_lesson_edit",
  lesson_check: "chat_tool_lesson_check",
  question_search: "chat_tool_question_search",
};

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

function ToolLine({ tool, language }: { tool: ToolItem; language: Language }): ReactElement {
  const what = copy(language, TOOL_KEY[tool.verb], {}, "adult");
  const how =
    tool.state === "failed"
      ? copy(language, "chat_tool_stuck", { message: tool.error?.message ?? "" }, "adult")
      : tool.state === "running"
        ? copy(language, "chat_tool_running", {}, "adult")
        : tool.state === "pending"
          ? copy(language, "chat_tool_pending", {}, "adult")
          : null;
  return (
    <li data-tool={tool.verb} data-state={tool.state}>
      {what}
      {how === null ? null : `: ${how}`}
    </li>
  );
}

/** Tool lines folded under one line; a stuck one stays in view under the fold. */
function ToolGroup({ tools, language }: { tools: ToolItem[]; language: Language }): ReactElement {
  const stuck = tools.filter((t) => t.state === "failed");
  const latest = tools.at(-1);
  const head = latest === undefined ? "" : copy(language, TOOL_KEY[latest.verb], {}, "adult");
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
    </div>
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
  const [copied, setCopied] = useState(false);
  const details = `run ${run} attempt ${item.attempt}: ${item.error.type}`;
  return (
    <div role="alert" data-row="error" className="rounded-md border p-2 text-sm">
      <p>
        {copy(language, "chat_problem", { message: item.error.message }, "adult")}
        {item.retryable && ` ${copy(language, "chat_problem_retrying", {}, "adult")}`}
      </p>
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
        <div data-from={row.from} className={row.from === "parent" ? "self-end" : "self-start"}>
          <p className="text-muted-foreground text-xs">
            {copy(
              language,
              row.from === "parent" ? "chat_from_parent" : "chat_from_agent",
              {},
              "adult",
            )}
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

export interface ChatPaneProps {
  language: Language;
  turns: readonly Turn[];
  queued: readonly string[];
  restoring: boolean;
  stopping: boolean;
  sendFailed: boolean;
  onSend(text: string): void;
  onStop(): void;
}

export function ChatPane({
  language,
  turns,
  queued,
  restoring,
  stopping,
  sendFailed,
  onSend,
  onStop,
}: ChatPaneProps): ReactElement {
  const [draft, setDraft] = useState("");
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
    setDraft("");
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    send(draft);
  };

  return (
    <section aria-label={say("chat_title")} className="flex min-h-0 flex-col gap-3">
      <h2 className="text-base font-medium">{say("chat_title")}</h2>
      {restoring && (
        <p data-row="restoring" className="text-muted-foreground text-sm">
          {say("chat_restoring")}
        </p>
      )}
      <ol aria-label={say("chat_messages")} className="flex flex-1 flex-col gap-3 overflow-y-auto">
        {turns.map((turn) =>
          rowsOf(turn.view.chat).map((row) => (
            <li key={`${turn.run.id}-${row.seq}`} className="flex flex-col">
              <RowView row={row} run={turn.run.id} language={language} />
            </li>
          )),
        )}
      </ol>
      {turns.length === 0 && !restoring && (
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
      <p role="status" aria-live="polite" data-status={status ?? "none"} className="text-sm">
        {status === null ? "" : say(STATUS_KEY[status])}
      </p>
      {sendFailed && (
        <p role="alert" className="text-sm">
          {say("chat_send_again")}
        </p>
      )}
      <form onSubmit={submit} className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          {say("chat_composer_label")}
          <textarea
            value={draft}
            rows={2}
            className="rounded-md border px-2 py-1"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
          />
        </label>
        <Button type="submit">{say("chat_send")}</Button>
        {open && (
          <Button type="button" variant="outline" disabled={stopping} onClick={onStop}>
            {stopping ? say("chat_stopping") : say("chat_stop")}
          </Button>
        )}
      </form>
    </section>
  );
}
