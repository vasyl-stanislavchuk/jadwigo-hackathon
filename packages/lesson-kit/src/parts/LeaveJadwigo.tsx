/**
 * Part: a link that leaves Jadwigo, and the confirmation that stands before it (owner, 2026-10-27,
 * docs/plan/handoff-source-credit.md; dl-uukj.29.136). A child never leaves the app on one tap: the
 * link first opens a confirmation in the page, in the Zeszyt look and never the browser's
 * confirm(). It says the link leaves Jadwigo and where it goes, with a button to stay (the focus
 * starts there) and one to go on, which opens the page in a new tab.
 *
 * `LeaveGuard` holds the confirmation for every `OutsideLink` inside it, and shows it in place of
 * what it wraps, so the confirmation sits where the link was (the credit card's lines). Stay, Esc,
 * and going on all bring the wrapped lines back with the focus on the link that was pressed. Any
 * surface with an outside link wraps its lines in one guard.
 */

import { copy } from "@jadwigo/copy";
import { Button } from "@jadwigo/ui";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { Language } from "../stage/types.ts";

/** Ask the nearest guard to confirm leaving for `href`; `from` gets the focus back. */
type Ask = (href: string, from: HTMLElement) => void;

const Guard = createContext<Ask | null>(null);

/** Where a link goes, as the confirmation names it: the address's host ('www.khanacademy.org'). */
export function whereOf(href: string): string {
  try {
    return new URL(href).host;
  } catch {
    return href;
  }
}

export function LeaveGuard({
  language,
  children,
}: {
  language: Language;
  children: ReactNode;
}): JSX.Element {
  const [asked, setAsked] = useState<{ href: string; from: HTMLElement } | null>(null);
  const back = (): void => {
    const from = asked?.from;
    setAsked(null);
    // The lines come back on the next paint; the focus returns to the link that was pressed.
    if (from) requestAnimationFrame(() => from.focus());
  };
  return (
    <Guard.Provider value={(href, from) => setAsked({ href, from })}>
      <div data-leave-guarded hidden={asked !== null || undefined}>
        {children}
      </div>
      {asked !== null && (
        <LeaveConfirm
          language={language}
          href={asked.href}
          onStay={back}
          onGo={() => {
            window.open(asked.href, "_blank", "noopener,noreferrer");
            back();
          }}
        />
      )}
    </Guard.Provider>
  );
}

/** The confirmation itself: what leaving means, Zostań (the default) and Otwórz. */
export function LeaveConfirm({
  language,
  href,
  onStay,
  onGo,
}: {
  language: Language;
  href: string;
  onStay(): void;
  onGo(): void;
}): JSX.Element {
  const title = useId();
  const where = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.querySelector<HTMLElement>("[data-leave-stay]")?.focus();
  }, []);
  return (
    <div
      ref={box}
      role="alertdialog"
      aria-labelledby={title}
      aria-describedby={where}
      data-leave-confirm
      onKeyDown={(event) => {
        // Esc is "stay": the confirmation closes, and whatever holds it stays open.
        if (event.key !== "Escape") return;
        event.preventDefault();
        event.stopPropagation();
        onStay();
      }}
    >
      <p id={title} data-leave-title>
        {copy(language, "leave_title")}
      </p>
      <p id={where} data-leave-where>
        {copy(language, "leave_where", { where: whereOf(href) })}
      </p>
      <div data-leave-actions>
        <Button type="button" data-leave-stay className="kid-action" onClick={onStay}>
          {copy(language, "leave_stay")}
        </Button>
        <Button type="button" variant="outline" data-leave-go onClick={onGo}>
          {copy(language, "leave_go")}
        </Button>
      </div>
    </div>
  );
}

/**
 * A link out of Jadwigo. It is a real link (a screen reader names it a link, and its address shows
 * on a hover), but a press opens the nearest guard's confirmation instead of the page. It must sit
 * inside a `LeaveGuard`: without one a press does nothing, so no link ever leaves unconfirmed.
 */
export function OutsideLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}): JSX.Element {
  const ask = useContext(Guard);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      data-outside-link
      onClick={(event) => {
        event.preventDefault();
        ask?.(href, event.currentTarget);
      }}
    >
      {children}
    </a>
  );
}
