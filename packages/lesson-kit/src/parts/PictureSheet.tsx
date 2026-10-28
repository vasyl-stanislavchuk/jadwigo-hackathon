/**
 * Part: a question picture the child can open larger (lesson-frame/README.md rule 16, §3 Picture
 * sheet; dl-uukj.29.5). On the card the picture is at most 40% of the scroll area's height, or a
 * thumbnail beside sound (96 on a phone, 120 on a laptop). A tap opens it on a full-screen sheet in
 * the page's own colour, with no dimming, and its close where the lesson's close sits, focused.
 * Esc, a tap anywhere or close returns, with focus back on the picture. stage.css draws the sizes,
 * through --picture-max-h, which Picture.tsx and a plain image both read.
 */

import { copy } from "@jadwigo/copy";
import { Button } from "@jadwigo/ui";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import type { Language } from "../stage/types.ts";

export function PictureView({
  language,
  alt,
  thumb = false,
  children,
}: {
  language: Language;
  alt?: string | undefined;
  thumb?: boolean | undefined;
  children: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const name = copy(language, "ds_open_picture");
  return (
    <>
      <button
        ref={opener}
        type="button"
        data-picture
        data-thumb={thumb || undefined}
        aria-label={alt ? `${name}: ${alt}` : name}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>
      {open && (
        <PictureSheet
          language={language}
          alt={alt}
          onClose={() => {
            setOpen(false);
            opener.current?.focus();
          }}
        >
          {children}
        </PictureSheet>
      )}
    </>
  );
}

function PictureSheet({
  language,
  alt,
  onClose,
  children,
}: {
  language: Language;
  alt?: string | undefined;
  onClose(): void;
  children: ReactNode;
}): JSX.Element {
  const sheet = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // React 18's Button takes no ref: the sheet finds its own close.
    sheet.current?.querySelector<HTMLElement>("[data-sheet-close]")?.focus();
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      ref={sheet}
      role="dialog"
      aria-modal="true"
      aria-label={alt || copy(language, "ds_open_picture")}
      className="kid-picture-sheet"
      // A tap anywhere closes, close included: its click reaches the sheet. Escape inside it closes
      // here; the document's listener catches an Escape from outside.
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        onClose();
      }}
    >
      <header data-topbar>
        <div data-topbar-inner>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            data-sheet-close
            aria-label={copy(language, "ds_close_picture")}
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </header>
      <div data-picture-sheet>{children}</div>
    </div>
  );
}
