/**
 * The preview over the chat (dl-1eieq.1; decision 2026-11-03-the-lesson-opens-in-a-preview-modal-
 * from-an-expand-button-on-the): what the chat opens, the lesson from its card's expand button or a
 * thing a citation or a widget names, shown in a modal so the chat stays the one view. It fills the
 * screen on every size, so the lesson shows whole (design review 2026-11-03). Its body scrolls between the title
 * and the actions, and closing it (X, Escape, the scrim) leaves the chat exactly where it was, the
 * focus back on the button that opened it.
 *
 * While a turn changes the lesson, a band under the title says so, with no version number (chat
 * handoff dl-uukj.47.71 S20, in the modal by the owner's amendment; lesson card delta C5).
 */

import { copy, type Language } from "@jadwigo/copy";
import { Dialog, DialogClose, DialogContent } from "@jadwigo/ui";
import { LoaderIcon, XIcon } from "lucide-react";
import { type ReactElement, type ReactNode, useLayoutEffect, useRef } from "react";

export function PreviewDialog({
  open,
  onClose,
  title,
  language,
  actions,
  band,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  language: Language;
  /** The lesson's actions in the foot, the same the card has; none for another thing. */
  actions?: ReactNode;
  /** A running turn is changing the lesson: "Jadwigo zmienia tę lekcję. Zmiany pojawią się tutaj." */
  band?: boolean | undefined;
  children: ReactNode;
}): ReactElement {
  // It opens from the URL, not from a trigger Radix knows, so it keeps the control that had the
  // focus as it opened, and gives the focus back there on close without scrolling the chat.
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    if (open && document.activeElement instanceof HTMLElement)
      opener.current = document.activeElement;
  }, [open]);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent
        title={title}
        // The whole screen on every size, so the lesson renders at its full width and height.
        className="inset-0 top-0 max-h-none max-w-none translate-y-0 gap-0 rounded-none border-0 p-0 [&>div:first-child]:border-b-jw [&>div:first-child]:border-jw-line [&>div:first-child]:px-6 [&>div:first-child]:pt-5 [&>div:first-child]:pr-14 [&>div:first-child]:pb-4"
        data-preview-dialog
        onCloseAutoFocus={(event) => {
          const back = opener.current;
          opener.current = null;
          if (back === null || !back.isConnected) return;
          event.preventDefault();
          back.focus({ preventScroll: true });
        }}
      >
        <DialogClose
          aria-label={copy(language, "close", {}, "adult")}
          className="absolute top-3 right-3 grid size-10 place-items-center rounded-jw-small text-jw-ink-soft hover:bg-jw-act-quiet focus-visible:outline-3 focus-visible:outline-jw-focus"
          data-preview-close
        >
          <XIcon aria-hidden className="size-5" />
        </DialogClose>
        {band === true && (
          <p
            className="flex items-center gap-2 border-y-jw border-jw-line bg-jw-side px-6 py-2 text-jw-page-small text-jw-ink"
            data-preview-band
          >
            <LoaderIcon
              aria-hidden
              className="size-3.5 shrink-0 text-primary motion-safe:animate-spin"
            />
            {copy(language, "lesson_pane_band", {}, "adult")}
          </p>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-4" data-preview-body>
          {children}
        </div>
        {actions !== undefined && (
          <div
            className="flex min-h-16 shrink-0 items-center border-t-jw border-jw-line px-6 py-3"
            data-preview-actions
          >
            {actions}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
