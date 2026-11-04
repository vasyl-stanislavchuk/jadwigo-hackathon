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
 * decision dl-xo0q): no heading (the panel has one), no starters (the first screen asked), the
 * run's state in the workspace's band instead (`statusOf`), and the composer of the chat handoff
 * (dl-uukj.47.71 §4.5, Composer.tsx): one rounded box with one focus ring, Dla on the left,
 * Zatrzymaj while a turn runs (Esc too) and Wyślij, quiet while empty; the waiting rows sit above it.
 *
 * The two sides read apart (dl-uukj.47.28; owner's calls of 2026-11-02): the parent's words are a
 * quiet box in the soft paper fill on the right, "Ty" kept for screen readers; Jadwigo AI's turn is plain prose on
 * the left under one header (its crown mark and its name), its words drawn as markdown (ChatMarkdown.tsx), its tool lines folded into one small muted
 * line with a chevron, closed by default, and its widgets in the same column. In the workspace the
 * messages scroll and the composer stays at the panel's foot. A parent's steer keeps its label in view ("Ty · Twoja zmiana w lekcji"). Rows fade in
 * only when the system allows motion (chat.css).
 */

import type { AttachmentId } from "@jadwigo/contracts";
import type { RunId, RunRatingCreate } from "@jadwigo/contracts/run";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { cn, RegisterProvider } from "@jadwigo/ui";
import { type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";
import type { ChooseAnswers } from "./ChooseForm.tsx";
import "./chat.css";
import type { ReadAttachment } from "./attachments/ThreadAttachments.tsx";
import type { UploadDeps } from "./attachments/upload.ts";
import { ChatThread, lessMotion } from "./ChatThread.tsx";
import { Composer, openChoose } from "./Composer.tsx";
import { ComposerLines } from "./ComposerLines.tsx";
import { isOpen, type SendLimit, type Turn } from "./conversation.ts";
import type { ObjectRef } from "./objects/ref.ts";
import type { RunPhase } from "./phase.ts";
import type { Waiting } from "./queue.ts";
import type { LineContext } from "./spine/lines.ts";

export interface ChatPaneProps {
  language: Language;
  turns: readonly Turn[];
  queued: readonly string[];
  restoring: boolean;
  stopping: boolean;
  sendFailed: boolean;
  /** Which message limit refused the last send: its own line, no retry (dl-z5ja.100). */
  sendLimit?: SendLimit | null;
  /** Sends a message: its words, and its photos' ids when the composer uploaded any. */
  onSend(text: string, attachmentIds?: readonly AttachmentId[]): void;
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
  /** A learner's first name by id, for a tool line about a child (spine/lines.ts). */
  nameOf?: ((learner: string) => string | null) | undefined;
  /**
   * The queue (queue.ts): what waits to go once the turn ends, drawn as rows above the composer
   * (D6). A row with photos reads their count when it has no words (dl-uukj.47.70).
   */
  next?: readonly (string | Waiting)[];
  /**
   * "Spróbuj ponownie" after a failed send, from the conversation: the exact words that failed,
   * a queued row's included. Without it the pane sends its own last words again.
   */
  onResend?: (() => void) | undefined;
  /** "Wyślij teraz" on one waiting row. */
  onSendNow?: ((index: number) => void) | undefined;
  /** Takes one waiting row out (its ×). */
  onTakeNext?: ((index: number) => string | null) | undefined;
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
  /** Saves a new title from the living lesson card (dl-1eieq.16). */
  onRenameLesson?: ((title: string) => Promise<CopyKey | null>) | undefined;
  /**
   * Reads a sent photo's link (dl-z5ja.11.6): with it, a parent's message shows what Jadwigo
   * received under the bubble.
   */
  readAttachment?: ReadAttachment | undefined;
  /**
   * What a photo's upload runs on (dl-uukj.47.71.8): with it, the parent's composer has its photo
   * button, and a message may carry photos, or be photos alone.
   */
  uploadDeps?: UploadDeps | undefined;
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
  onChoose,
  composerLead,
  lessonObject,
  onOpen,
  lessonActions,
  onRenameLesson,
  readAttachment,
  uploadDeps,
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
    // preventScroll: a focus scrolls the page's boxes to the field the way scrollIntoView does.
    if (wasAsking.current && asking === null) composer.current?.focus({ preventScroll: true });
    wasAsking.current = asking !== null;
  }, [asking]);
  const parent = variant === "parent";
  const [draft, setDraft] = useState("");
  /** The last words sent, so a send that did not reach the server can go again. */
  const [lastSent, setLastSent] = useState<string | null>(null);
  /** Rows enter with a fade only when the system allows motion (chat.css). */
  const [still] = useState(lessMotion);
  const last = turns.at(-1);
  const open = last !== undefined && isOpen(last);
  const say = (key: CopyKey, vars: Record<string, string | number> = {}) =>
    copy(language, key, vars, "adult");
  const send = (text: string, attachmentIds: readonly AttachmentId[] = []) => {
    const trimmed = text.trim();
    if (trimmed === "" && attachmentIds.length === 0) return;
    if (attachmentIds.length === 0) onSend(trimmed);
    else onSend(trimmed, attachmentIds);
    // A retry after a failed send repeats the words; the photos went with the first try.
    if (trimmed !== "") setLastSent(trimmed);
    setDraft("");
  };
  /** Sends words again, leaving whatever the parent is typing alone. */
  const resend = (text: string) => {
    onSend(text);
    setLastSent(text);
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
      <ChatThread
        language={language}
        turns={turns}
        parent={parent}
        phase={phase}
        now={now}
        pending={pending}
        still={still}
        lineContext={lineContext}
        onRetry={onRetry}
        onRate={onRate}
        resend={resend}
        lessonObject={lessonObject}
        onOpen={onOpen}
        lessonActions={lessonActions}
        onRenameLesson={onRenameLesson}
        readAttachment={readAttachment}
        stop={{ running: open, stopping, onStop }}
      />
      <ComposerLines
        language={language}
        turns={turns}
        parent={parent}
        restoring={restoring}
        queued={queued}
        phase={phase}
        sendFailed={sendFailed}
        sendLimit={sendLimit}
        onResend={onResend}
        lastSent={lastSent}
        send={send}
        resend={resend}
        next={next.map((row) =>
          typeof row === "string"
            ? { text: row, photos: 0 }
            : { text: row.text, photos: row.attachmentIds.length },
        )}
        onSendNow={onSendNow}
        onTakeNext={onTakeNext}
      />
      <Composer
        language={language}
        parent={parent}
        asking={asking}
        onAnswer={(answers) => {
          if (asking === null) return;
          setChosen((given) => ({ ...given, [asking.call_id]: answers }));
          onChoose?.(asking.call_id, answers);
        }}
        draft={draft}
        setDraft={setDraft}
        send={send}
        open={open}
        stopping={stopping}
        onStop={onStop}
        composerLead={composerLead}
        textarea={composer}
        uploadDeps={uploadDeps}
      />
    </section>
  );
  return <RegisterProvider value="app">{body}</RegisterProvider>;
}
