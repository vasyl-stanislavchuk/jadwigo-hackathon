/**
 * The lesson's actions in the foot of the living lesson card, and again in the foot of its preview
 * (dl-1eieq.1; chat handoff dl-uukj.47.71 §4.4): Dla · the print icon · Daj lekcję. What the
 * workspace's footer held before #740 (dl-z5ja.108.1.1), moved into the chat (decision
 * 2026-11-02-the-parent-app-is-chat-first-account-in-the-top-bar-lesson-on-de, dl-hz9ks):
 *
 *   Dla   who the lesson is for: the composer's Dla select when the page gives it (`forWhom`),
 *              else the child's name or "Bez dziecka" in words
 *   Drukuj   an icon button with its name as a tooltip: the lesson's sheet, printed in place
 *              (LessonPrint), once the lesson's latest check passed: an unchecked sheet could reach
 *              a child on paper (steward, #747)
 *   Daj lekcję / Daj lekcję · {imię}   the one primary. Until it can give, it is quiet with its
 *              reason as a tooltip (DS S5, `DisabledReason`), never `disabled`. With a child it gives
 *              the lesson (POST /api/v1/conversations/{id}/lessons), to that child or to nobody in
 *              particular, and shows its one link to copy or open (decision
 *              2026-11-03-a-play-link-opens-on-a-first-screen-title-and-question-count-the).
 *
 * No "Zapisz na później": every lesson is already in Lekcje (owner, 2026-11-03).
 * Drukuj prints in place until the server's PDF (dl-1eieq.2) replaces `print`.
 */

import type { Learner } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { RunView } from "@jadwigo/core";
import {
  Button,
  cn,
  DisabledReason,
  Input,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@jadwigo/ui";
import { PrinterIcon } from "lucide-react";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";
import { LessonPrint, printLesson } from "./LessonPrint.tsx";

/** Where giving the lesson stands: nothing yet, on its way, given, or refused with its reason. */
export type GiveState =
  | { kind: "idle" }
  | { kind: "giving" }
  /** `name` is the child it waits for, or null for a link anyone may play. */
  | { kind: "given"; name: string | null; href: string }
  | { kind: "refused"; reason: "changed" | "child" | "failed" };

const REFUSED: Readonly<Record<Extract<GiveState, { kind: "refused" }>["reason"], CopyKey>> = {
  changed: "parent_give_refused_changed",
  child: "parent_give_refused_child",
  failed: "parent_give_failed",
};

export function LessonActions({
  language,
  ready,
  child,
  lesson,
  forWhom,
  onGive,
  given = { kind: "idle" },
  print = () => window.print(),
}: {
  language: Language;
  /** Whether the lesson's latest check passed, so it can be given. */
  ready: boolean;
  /** The Dla child, or null. */
  child: Learner | null;
  /** The lesson shown, which "Wydrukuj" prints. */
  lesson: RunView["lesson"];
  /** The Dla select (the composer's); without it, who the lesson is for in words. */
  forWhom?: ReactNode;
  /** Daj lekcję; absent where nothing can give (no sign-in). */
  onGive?: (() => void) | undefined;
  /** Where giving stands, said under the buttons. */
  given?: GiveState;
  /** The browser's print; a test's own. */
  print?: () => void;
}): ReactElement {
  const t = (key: CopyKey, vars: Record<string, string> = {}): string =>
    copy(language, key, vars, "adult");
  const [printing, setPrinting] = useState(false);
  // Once the browser is done printing, the sheet leaves the page, and so does its print rule.
  useEffect(() => {
    if (!printing) return;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done);
    return () => window.removeEventListener("afterprint", done);
  }, [printing]);
  const printNow = (): void => {
    if (!ready) return;
    setPrinting(true);
    printLesson(print);
  };
  const busy = given.kind === "giving";
  const canGive = ready && !busy && onGive !== undefined;
  const give = (): void => {
    if (canGive) onGive();
  };
  const giveReason = !ready
    ? t("parent_give_reason")
    : onGive === undefined
      ? t("parent_give_unavailable")
      : null;
  // Printing waits for the same check as giving.
  const printReason = ready && lesson !== null ? null : t("parent_give_reason");
  const quietGive = canGive ? null : (giveReason ?? t("parent_giving"));
  return (
    <div className="flex w-full flex-col gap-2" data-lesson-actions>
      {/* On a phone: Dla on its own row, then Daj lekcję full width and print, both 44 tall (chat
          handoff §4.4, delta card-ready-390). */}
      <div className="flex flex-wrap items-center gap-2 max-sm:flex-col max-sm:items-start">
        {forWhom ?? (
          <p className="text-jw-page-small text-jw-ink-soft" data-for-whom>
            {`${t("parent_for_whom")}: `}
            <span className="font-bold text-jw-ink">
              {child?.first_name ?? t("parent_no_child")}
            </span>
          </p>
        )}
        <div className="ml-auto flex items-center gap-2 max-sm:ml-0 max-sm:w-full">
          <Quiet reason={printReason} className="max-sm:order-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("parent_print")}
              className="size-8 min-h-8 min-w-8 max-sm:size-11 max-sm:min-h-11 max-sm:min-w-11"
              onClick={() => {
                if (ready && lesson !== null) printNow();
              }}
              data-print
            >
              <PrinterIcon aria-hidden className="size-4" />
            </Button>
          </Quiet>
          <Quiet reason={quietGive} className="max-sm:order-1 max-sm:flex-1">
            <Button
              type="button"
              // Quiet while it can't give (§4.4): stone fill, faint words, its reason as a tooltip.
              variant={quietGive === null ? "default" : "secondary"}
              size="control"
              className={cn(
                "max-sm:min-h-11 max-sm:w-full",
                quietGive !== null && "text-jw-placeholder",
              )}
              onClick={give}
              data-give
            >
              {child === null
                ? t("parent_give")
                : t("parent_give_child", { name: child.first_name })}
            </Button>
          </Quiet>
        </div>
      </div>
      <div role="status" className="text-jw-page-small text-jw-ink" data-give-state={given.kind}>
        {given.kind === "giving" && t("parent_giving")}
        {given.kind === "refused" && t(REFUSED[given.reason])}
        {given.kind === "given" && (
          <GivenLink language={language} name={given.name} href={given.href} />
        )}
      </div>
      {printing && lesson !== null && <LessonPrint language={language} lesson={lesson} />}
    </div>
  );
}

/** How long "Skopiowano" stands before the button says "Kopiuj" again. */
const COPIED_MS = 2000;

/**
 * The lesson's one link: what the parent sends or opens. It opens in a new tab, whose empty
 * sessionStorage starts the child's own attempt, and the chat stays where it was.
 */
function GivenLink({
  language,
  name,
  href,
}: {
  language: Language;
  name: string | null;
  href: string;
}): ReactElement {
  const t = (key: CopyKey, vars: Record<string, string> = {}): string =>
    copy(language, key, vars, "adult");
  const url = new URL(href, window.location.origin).href;
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <div className="flex flex-col gap-2" data-given>
      <p>{name === null ? t("parent_given_anyone") : t("parent_given_child", { name })}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          kind="text"
          readOnly
          value={url}
          aria-label={t("parent_given_link")}
          className="min-w-0 flex-1 basis-56"
          onFocus={(event) => event.currentTarget.select()}
          data-given-url
        />
        <Button
          type="button"
          variant="outline"
          size="control"
          onClick={() => {
            // Refused (no permission, no secure page): the field is there to select by hand.
            navigator.clipboard.writeText(url).then(
              () => setCopied(true),
              () => undefined,
            );
          }}
          data-given-copy
        >
          {t(copied ? "parent_given_copied" : "parent_given_copy")}
        </Button>
        <Button asChild size="control">
          <a href={href} target="_blank" rel="noopener" data-given-link>
            {t("parent_given_open")}
          </a>
        </Button>
      </div>
    </div>
  );
}

/**
 * One control in the foot: quiet with its reason as a tooltip while it can't act (DS S5, never
 * `disabled`); an icon-only one names itself in a tooltip when it can.
 */
function Quiet({
  reason,
  className,
  children,
}: {
  reason: string | null;
  /** Where the control sits in the foot's row (its order on a phone). */
  className?: string;
  children: ReactElement<{ "aria-label"?: string }>;
}): ReactElement {
  if (reason !== null)
    return (
      <DisabledReason reason={reason} {...(className === undefined ? {} : { className })}>
        {children}
      </DisabledReason>
    );
  const name = children.props["aria-label"];
  // A plain span carries the place in the row, as DisabledReason's does when it is quiet.
  const placed = <span className={cn("inline-flex", className)}>{children}</span>;
  if (name === undefined) return placed;
  return (
    <span className={cn("inline-flex", className)}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>{name}</TooltipContent>
      </Tooltip>
    </span>
  );
}
