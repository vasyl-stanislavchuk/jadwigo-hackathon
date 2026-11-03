/**
 * The chat's thread (wave dl-uukj.47.71 lane B, handoff D1-D5, D7, S9, S19, §3): each turn drawn as
 * the parent's bubble · Jadwigo AI's spine · its reply · the lesson card · the rating. The spine is
 * the turn's one working indicator: it appears at send, grows in place (never sticky), and folds to
 * one summary row when the turn is done. There are no tool groups, no Szczegóły, no activity line
 * and no error boxes: a retry is a line in its stage and a failed turn is the spine's foot (D7).
 * Older turns keep their bubble, the folded row and the reply clamped to 2 lines; a day divider
 * separates sessions. The one scrolling list follows the bottom while the parent is within 80 px of
 * it; scrolled up, it holds still and "Najnowsze" brings them back down.
 */

import type { RunEvent, RunId, RunRatingCreate } from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { ChatItem, RunView } from "@jadwigo/core";
import { Button, cn, Separator, showToast } from "@jadwigo/ui";
import { ArrowDownIcon } from "lucide-react";
import {
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { ChatMarkdown } from "./ChatMarkdown.tsx";
import { recapOf } from "./ChooseForm.tsx";
import "./chat.css";
import { type ReadAttachment, ThreadAttachments } from "./attachments/ThreadAttachments.tsx";
import { isOpen, type Turn } from "./conversation.ts";
import { JadwigoAiMark } from "./JadwigoAiMark.tsx";
import { CitationChips } from "./objects/CitationChips.tsx";
import { LessonCard, wroteLesson } from "./objects/LessonCard.tsx";
import type { ObjectRef } from "./objects/ref.ts";
import type { RunPhase } from "./phase.ts";
import { Rating } from "./Rating.tsx";
import { cardStatesOf } from "./spine/card.ts";
import type { LineContext } from "./spine/lines.ts";
import { spineOf } from "./spine/spineOf.ts";
import type { LessonCardState, TurnSpine as Spine } from "./spine/types.ts";
import { type SpineActions, TurnSpine } from "./TurnSpine.tsx";
import { TurnSummary } from "./TurnSummary.tsx";
import { type StopKey, useStopKey } from "./useStopKey.ts";
import { toolResult } from "./widgets/Widgets.tsx";

/** The parent's words: a quiet box in the soft paper fill on the right. */
const PARENT_BOX =
  "rounded-jw-box border-jw border-jw-line bg-jw-act-quiet px-3.5 py-2.5 whitespace-pre-wrap text-jw-ink";

/** Within this many pixels of the bottom, the thread follows what arrives (§3). */
const FOLLOW_PX = 80;

type ToolItem = Extract<ChatItem, { kind: "tool" }>;
type Message = Extract<ChatItem, { kind: "message" }>;

/** A turn's run log: the spine and Kopiuj szczegóły read it; a hand-built turn has none. */
const eventsOf = (turn: Turn): readonly RunEvent[] => turn.events ?? [];

/**
 * The spine of one turn. The foot follows the page's own phase when the fold gives none: a stall
 * is only known to the page's clock, and a turn that ended badly always says so in its card (D7).
 */
function spineFor(turn: Turn, phase: RunPhase | null, now: number): Spine {
  const spine = spineOf(eventsOf(turn), phase, now);
  if (spine.foot !== undefined) return spine;
  if (spine.phase === "stalled") return { ...spine, foot: { kind: "stalled" } };
  if (spine.phase === "failed") return { ...spine, foot: { kind: "failed" } };
  if (spine.phase === "cancelled") return { ...spine, foot: { kind: "stopped" } };
  return spine;
}

/** The spine drawn at send, before the server named the run (S9): "W kolejce · 0 s". */
const queuedSpine = (since: number): Spine => ({
  phase: "queued",
  title: { copyKey: "chat_phase_queued", values: {} },
  startedAt: since,
  stepCount: 0,
  stages: [],
  looseLines: [],
});

/**
 * The turn's reply (D4), as the fold says it: its last agent message with no tool call after it,
 * once the turn ended. A turn stopped or failed mid-call has none: its last sentence stays a line in
 * its stage (§2 item 5, dl-uukj.47.71.38). While the turn runs, Jadwigo's sentences are the now line.
 */
function replyOf(turn: Turn, spine: Spine): Message | null {
  if (spine.reply === undefined) return null;
  const agent = turn.view.chat.filter(
    (i): i is Message => i.kind === "message" && i.from === "agent",
  );
  return agent.findLast((m) => m.text === spine.reply) ?? { ...messageStub, text: spine.reply };
}

const messageStub: Message = { kind: "message", seq: 0, from: "agent", text: "", attachments: [] };

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

/** Whether the parent asked the system for less motion. */
export const lessMotion = (): boolean =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/** Smooth unless the parent asked the system for less motion. */
const scrollBehavior = (): ScrollBehavior => (lessMotion() ? "auto" : "smooth");

/**
 * Where a turn's card comes from: lane A's fold over its log, or, for a turn built without its log
 * (a test's), the revision it wrote once it ended.
 */
function cardOf(
  turn: Turn,
  state: LessonCardState | null,
): { state: LessonCardState } | { lesson: NonNullable<RunView["lesson"]> } | null {
  if (turn.events !== undefined) return state === null ? null : { state };
  const lesson = turn.view.lesson;
  return !isOpen(turn) && lesson !== null && wroteLesson(turn.view) ? { lesson } : null;
}

/** Whether a card is the living one, which alone carries the actions (S7). */
const living = (card: NonNullable<ReturnType<typeof cardOf>>, newest: boolean): boolean =>
  "state" in card ? card.state.kind !== "superseded" : newest;

/** The newest finished turn that wrote the lesson: the one whose card carries the actions. */
function newestCard(turns: readonly Turn[]): Turn | undefined {
  return turns.findLast((t) => !isOpen(t) && t.view.lesson !== null && wroteLesson(t.view));
}

/** The calendar day of an instant, by the page's clock: "2026-11-03". */
const dayOf = (ms: number): string => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

/** A day divider's words (S19): "Dziś", "Wczoraj", else the date. */
function dayWords(at: number, now: number, language: Language): string {
  if (dayOf(at) === dayOf(now)) return copy(language, "day_today", {}, "adult");
  if (dayOf(at) === dayOf(now - 86_400_000)) return copy(language, "day_yesterday", {}, "adult");
  return new Intl.DateTimeFormat(language, { day: "numeric", month: "long" }).format(at);
}

/** The header over Jadwigo AI's part of a turn: its crown mark and its name. */
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

function ParentBubble({
  message,
  language,
  readAttachment,
}: {
  message: Message;
  language: Language;
  readAttachment?: ReadAttachment | undefined;
}): ReactElement {
  return (
    <div data-from="parent" className="flex max-w-[90%] flex-col items-end gap-1 self-end">
      {/* "Ty" for a screen reader. */}
      <p className="sr-only">{copy(language, "chat_from_parent", {}, "adult")}</p>
      {message.text !== "" && (
        <p className={PARENT_BOX} data-bubble>
          {message.text}
        </p>
      )}
      {readAttachment !== undefined && (
        <ThreadAttachments
          language={language}
          attachments={message.attachments}
          read={readAttachment}
        />
      )}
    </div>
  );
}

/**
 * The reply (D4): plain prose under the spine. An older turn's is clamped to 2 lines in muted ink
 * and opens on a click, Enter or Space (S19).
 */
function Reply({
  message,
  older,
  language,
  context,
}: {
  message: Message;
  older: boolean;
  language: Language;
  context: LineContext;
}): ReactElement {
  const [open, setOpen] = useState(false);
  const clamped = older && !open;
  const toggle = older
    ? {
        role: "button",
        tabIndex: 0,
        "aria-expanded": open,
        onClick: () => setOpen((o) => !o),
        onKeyDown: (e: KeyboardEvent) => {
          if (e.key !== "Enter" && e.key !== " ") return;
          e.preventDefault();
          setOpen((o) => !o);
        },
      }
    : {};
  return (
    <div data-from="agent" data-reply={older ? "older" : "current"}>
      <div
        {...toggle}
        className={cn(
          "text-jw-ink",
          older &&
            "cursor-pointer rounded-jw-control outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
          clamped && "line-clamp-2 text-jw-ink-soft",
        )}
        data-prose
      >
        <ChatMarkdown text={message.text} />
      </div>
      {/* What the reply rests on, each opening beside the chat (dl-uukj.47.62, P3). */}
      {context.onOpen !== undefined && message.citations !== undefined && (
        <CitationChips citations={message.citations} language={language} onOpen={context.onOpen} />
      )}
    </div>
  );
}

/** What a turn says in the thread besides its spine: a choose form's recap, the budget's steer. */
function Aside({
  item,
  language,
  context,
}: {
  item: ChatItem;
  language: Language;
  context: LineContext;
}): ReactElement | null {
  if (item.kind === "steer")
    return (
      <p data-row="steer" data-level={item.level} className="text-jw-page-body">
        {copy(
          language,
          item.level === "steer" ? "chat_budget_steer" : "chat_budget_stop",
          {},
          "adult",
        )}
        {item.level === "stop" && ` ${copy(language, "chat_budget_steer_note", {}, "adult")}`}
      </p>
    );
  if (item.kind !== "approval") return null;
  const key: CopyKey =
    item.decision === null
      ? "chat_approval"
      : item.decision === "approved"
        ? "chat_approval_approved"
        : "chat_approval_rejected";
  // A choose form's answers stay in the thread as one line each (dl-uukj.47.35).
  const answers =
    context.chosen?.(item.call_id) ?? (item.decision === null ? undefined : item.answers);
  return (
    <div data-row="approval" className="flex flex-col gap-0.5 text-jw-page-body">
      <p>{copy(language, key, { summary: item.summary }, "adult")}</p>
      {item.choose !== undefined &&
        answers !== undefined &&
        recapOf(item.choose, answers, language).map((line) => (
          <p key={line} className="text-jw-ink-soft" data-choose-recap>
            {line}
          </p>
        ))}
    </div>
  );
}

/** The learner widgets a turn keeps in view (S1): its answers, not its work. */
function shownWidgets(turn: Turn, language: Language, context: LineContext) {
  return turn.view.chat.flatMap((item) => {
    if (item.kind !== "tool") return [];
    const result = toolResult(item as ToolItem, language, context);
    return result?.kind === "widget" && result.keepVisible
      ? [{ call_id: item.call_id, element: result.element }]
      : [];
  });
}

/**
 * What Kopiuj szczegóły dla pomocy copies (S3, dl-uukj.47.71.28): enough for support to find the
 * run, and no learner data. The run id, its attempt and status, each error's type (with its verb and
 * attempt), and each plan stage's place and status. Never a message, a tool's input or output, an
 * answer, an error's own message (it can quote input), nor the plan's words (the model's prose may
 * name the child). Only these fields are read, so nothing new in the log can leak in.
 */
function supportDetails(turn: Turn): string {
  const events = eventsOf(turn);
  const errors = events.flatMap((e) => {
    if (e.type === "error") return [`${e.payload.error.type} (attempt ${e.payload.attempt})`];
    if (e.type === "tool_result" && e.payload.error !== null)
      return [`${e.payload.verb} ${e.payload.error.type}`];
    return [];
  });
  const plan = events.findLast((e) => e.type === "plan");
  const stages =
    plan?.type === "plan" ? plan.payload.entries.map((s, i) => `${i + 1} ${s.status}`) : [];
  return [
    `run ${turn.run.id}`,
    `attempt ${turn.run.attempt}`,
    `status ${turn.view.status ?? turn.run.status}`,
    `errors: ${errors.length === 0 ? "none" : errors.join(", ")}`,
    `plan: ${stages.length === 0 ? "none" : stages.join(" · ")}`,
  ].join("\n");
}

/** Kopiuj szczegóły dla pomocy: the support details to the parent's clipboard, then "Skopiowane". */
function copyDetails(turn: Turn, language: Language): () => void {
  return () => {
    void navigator.clipboard
      ?.writeText(supportDetails(turn))
      .then(() => showToast({ kind: "done", text: copy(language, "chat_copied", {}, "adult") }));
  };
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
  /** Esc stops a running turn with focus anywhere in the thread (S6, §3; lane D's hook). */
  stop: StopKey;
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
  stop,
}: ChatThreadProps): ReactElement {
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  /** The done turns the parent opened from their summary row, by run. */
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  // The list follows the bottom while the parent is within 80 px of it (§3). One who scrolled up
  // to read stays where they are, the growing card anchored, and "Najnowsze" brings them back.
  // Only the list's own box moves: scrollIntoView scrolls every scrollable ancestor too, the window
  // included (dl-uukj.47.68).
  const list = useRef<HTMLOListElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useStopKey(root, stop);
  const atBottom = useRef(true);
  const [away, setAway] = useState(false);
  const rowCount = turns.reduce((n, t) => n + t.view.chat.length, 0);
  const lastItem = turns.at(-1)?.view.chat.at(-1);
  const growth = lastItem?.kind === "message" ? lastItem.text.length : 0;
  const follow = `${rowCount}:${growth}:${pending ?? ""}:${phase?.kind ?? ""}`;
  const toBottom = (behavior: ScrollBehavior) => {
    const box = list.current;
    box?.scrollTo?.({ top: box.scrollHeight, behavior });
  };
  useEffect(() => {
    if ((rowCount > 0 || pending !== null) && atBottom.current) toBottom(scrollBehavior());
  }, [follow]);
  const multiDay = new Set(turns.map((t) => dayOf(Date.parse(t.run.created_at)))).size > 1;
  const newest = newestCard(turns);
  const cards = cardStatesOf(turns.map(eventsOf));
  const lastTurn = turns.at(-1);
  const lastOpen = lastTurn !== undefined && isOpen(lastTurn);

  const turnEntries = (turn: Turn, index: number): ReactElement[] => {
    const last = index === turns.length - 1;
    const id = turn.run.id;
    const spine = spineFor(turn, last ? (phase ?? null) : null, now);
    const reply = replyOf(turn, spine);
    const entries: ReactElement[] = [];
    const at = Date.parse(turn.run.created_at);
    const before = turns[index - 1];
    if (
      multiDay &&
      (before === undefined || dayOf(Date.parse(before.run.created_at)) !== dayOf(at))
    )
      entries.push(
        <li key={`${id}-day`} className="flex items-center gap-3 py-1" data-day-divider>
          <Separator className="flex-1 bg-jw-line" />
          <span className="text-jw-page-small text-jw-ink-soft">{dayWords(at, now, language)}</span>
          <Separator className="flex-1 bg-jw-line" />
        </li>,
      );
    // The parent's words; a steer is a line in the spine's active stage instead (S17).
    for (const item of turn.view.chat)
      if (item.kind === "message" && item.from === "parent" && item.steer === undefined)
        entries.push(
          <li key={`${id}-${item.seq}`} className="flex flex-col items-end" data-chat-row>
            <ParentBubble message={item} language={language} readAttachment={readAttachment} />
          </li>,
        );
    const done = spine.phase === "done";
    const actions: SpineActions = {
      onRetry: last && spine.foot?.kind === "stalled" ? onRetry : retryOf(turn, resend),
      onCopyDetails: copyDetails(turn, language),
    };
    entries.push(
      <li
        key={`${id}-spine`}
        className="flex flex-col"
        data-chat-row
        data-turn={last ? "current" : "older"}
        {...(still ? {} : { "data-enter": "" })}
      >
        <AiHeader language={language} />
        {done ? (
          <TurnSummary
            spine={spine}
            now={now}
            language={language}
            open={opened.has(id)}
            onOpenChange={(open) =>
              setOpened((was) => {
                const next = new Set(was);
                if (open) next.add(id);
                else next.delete(id);
                return next;
              })
            }
          />
        ) : (
          <TurnSpine spine={spine} now={now} language={language} actions={actions} />
        )}
      </li>,
    );
    for (const item of turn.view.chat)
      if (item.kind === "approval" || item.kind === "steer")
        entries.push(
          <li key={`${id}-${item.seq}`} className="flex flex-col" data-chat-row>
            <Aside item={item} language={language} context={lineContext} />
          </li>,
        );
    for (const w of shownWidgets(turn, language, lineContext))
      entries.push(
        <li key={`${id}-${w.call_id}`} className="flex flex-col" data-chat-row>
          {w.element}
        </li>,
      );
    if (reply !== null)
      entries.push(
        <li key={`${id}-reply`} className="flex flex-col" data-chat-row>
          <Reply message={reply} older={!last} language={language} context={lineContext} />
        </li>,
      );
    // The lesson this turn wrote, as one card under its words (S7, S16): its state from the fold,
    // the newest version living with the actions, every older one a superseded row.
    const card = cardOf(turn, cards[index] ?? null);
    if (lessonObject !== undefined && onOpen !== undefined && card !== null)
      entries.push(
        <li key={`${id}-lesson`} className="flex flex-col" data-chat-row>
          <LessonCard
            {...card}
            object={lessonObject}
            language={language}
            onOpen={onOpen}
            onFix={() => resend(copy(language, "card_fix_action", {}, "adult"))}
            {...(lessonActions !== undefined && living(card, turn === newest)
              ? { actions: lessonActions }
              : {})}
          />
        </li>,
      );
    if (onRate !== undefined && completed(turn))
      entries.push(
        <li key={`${id}-rating`} className="flex flex-col">
          <Rating
            language={language}
            run={turn.run.id}
            onRate={onRate}
            onRetry={retryOf(turn, resend)}
          />
        </li>,
      );
    return entries;
  };

  return (
    <div ref={root} className="relative flex min-h-0 flex-1 flex-col" data-thread>
      <ol
        ref={list}
        aria-label={say("chat_messages")}
        data-chat-list
        // relative: the list is its sr-only lines' containing block, so on a long turn they stay
        // inside its clip rather than stretching the page below the window (steward on #778).
        className={cn(
          "relative flex flex-1 flex-col gap-3 overflow-y-auto",
          parent && "-mx-3 px-3",
        )}
        onScroll={(e) => {
          const box = e.currentTarget;
          const near = box.scrollHeight - box.scrollTop - box.clientHeight <= FOLLOW_PX;
          atBottom.current = near;
          setAway(!near);
        }}
      >
        {turns.flatMap(turnEntries)}
        {pending !== null && (
          <>
            <li className="flex flex-col items-end" data-chat-row data-pending>
              <div
                className="flex max-w-[90%] flex-col items-end gap-1 self-end"
                data-from="parent"
              >
                <p className="sr-only">{say("chat_from_parent")}</p>
                <p className={PARENT_BOX} data-bubble>
                  {pending}
                </p>
              </div>
            </li>
            {/* S9: the spine appears at send, before the run has a row. */}
            {!lastOpen && (
              <li className="flex flex-col" data-chat-row data-pending-spine>
                <AiHeader language={language} />
                <TurnSpine spine={queuedSpine(phase?.since ?? now)} now={now} language={language} />
              </li>
            )}
          </>
        )}
      </ol>
      {away && (
        <Button
          variant="outline"
          size="sm"
          className="absolute bottom-2 left-1/2 -translate-x-1/2 shadow-float"
          onClick={() => {
            atBottom.current = true;
            setAway(false);
            toBottom(scrollBehavior());
          }}
          data-newest
        >
          <ArrowDownIcon aria-hidden />
          {say("chat_newest")}
        </Button>
      )}
    </div>
  );
}
