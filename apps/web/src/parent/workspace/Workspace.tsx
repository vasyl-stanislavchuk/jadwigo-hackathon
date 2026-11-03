/**
 * The lesson workspace: the chat, alone (decision 2026-11-03-the-lesson-opens-in-a-preview-modal-
 * from-an-expand-button-on-the, which amends 2026-11-02-the-parent-app-is-chat-first-account-in-the-
 * top-bar-lesson-on-de; dl-1eieq.1):
 *
 *   ┌─ chat ───────────────────────────────────────┐
 *   │        messages, a readable 48rem column      │
 *   │        the lesson card: expand · Daj · Druk   │ → the preview, a modal over the chat
 *   │        composer                               │
 *   └───────────────────────────────────────────────┘
 *
 * The chat is the main and only view, on a laptop and a phone alike: no lesson column beside it,
 * no "Pokaż lekcję", no Rozmowa / Lekcja tabs (owner, 2026-11-03). The lesson, or a thing a citation
 * or a child's widget names, opens in the preview over it (PreviewDialog), from the chat itself.
 *
 * No details panel and no footer (design review 2026-11-02): who the lesson is for, how and when to
 * give it live in the chat's widgets. The chat has no band of its own: its composer sits at the
 * foot, and the run's state is read out from a screen-reader-only slot.
 */

import type { Language } from "@jadwigo/copy";
import type { ReactElement, ReactNode } from "react";
import { PreviewDialog } from "../../chat/objects/PreviewDialog.tsx";

/** What the preview shows while it is open. */
export interface Preview {
  title: ReactNode;
  body: ReactNode;
  /** The lesson's actions, the same the card has; none for another thing. */
  actions?: ReactNode;
  /** The version a running turn is writing: the band under the title (S20). */
  band?: number | undefined;
}

export function Workspace({
  language,
  chat,
  chatBand,
  preview,
  onClosePreview,
}: {
  language: Language;
  /** The messages and the composer. */
  chat: ReactNode;
  /** The run's state in words and its live region, for screen readers only: no visible band. */
  chatBand: ReactNode;
  /** What is open over the chat, or null. */
  preview: Preview | null;
  onClosePreview: () => void;
}): ReactElement {
  return (
    <div className="flex h-full min-h-0 flex-col bg-jw-card" data-workspace>
      {/* The chat scrolls its own messages, so its composer stays at the foot; alone, it keeps a
          readable column in the middle (chat.css). */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-chat-body data-chat-wide>
        {chat}
      </div>
      <div className="sr-only" data-chat-band>
        {chatBand}
      </div>
      <PreviewDialog
        open={preview !== null}
        onClose={onClosePreview}
        title={preview?.title ?? ""}
        language={language}
        {...(preview?.actions === undefined ? {} : { actions: preview.actions })}
        band={preview?.band}
      >
        {preview?.body}
      </PreviewDialog>
    </div>
  );
}
