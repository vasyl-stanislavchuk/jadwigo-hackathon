/**
 * The preview over the chat (dl-1eieq.1; decision 2026-11-03-the-lesson-opens-in-a-preview-modal-
 * from-an-expand-button-on-the): what the chat opens, the lesson from its card's expand button or a
 * thing a citation or a widget names, shown in a modal so the chat stays the one view. On a laptop
 * it is a wide box over a scrim; on a phone it fills the screen. Its body scrolls between the title
 * and the actions, and closing it (X, Escape, the scrim) leaves the chat exactly where it was, the
 * focus back on the button that opened it.
 */

import { copy, type Language } from "@jadwigo/copy";
import { Dialog, DialogClose, DialogContent } from "@jadwigo/ui";
import { XIcon } from "lucide-react";
import { type ReactElement, type ReactNode, useLayoutEffect, useRef } from "react";

export function PreviewDialog({
  open,
  onClose,
  title,
  language,
  actions,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  language: Language;
  /** The lesson's actions in the foot, the same the card has; none for another thing. */
  actions?: ReactNode;
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
        className="max-h-[calc(100dvh-4rem)] max-w-5xl gap-3 p-0 max-lg:top-0 max-lg:right-0 max-lg:bottom-0 max-lg:left-0 max-lg:max-h-none max-lg:max-w-none max-lg:translate-y-0 max-lg:rounded-none max-lg:border-0 [&>div:first-child]:px-6 [&>div:first-child]:pt-5 [&>div:first-child]:pr-14"
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
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4" data-preview-body>
          {children}
        </div>
        {actions !== undefined && (
          <div className="shrink-0 border-t-jw border-jw-line px-6 py-3" data-preview-actions>
            {actions}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
