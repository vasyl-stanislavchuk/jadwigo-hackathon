/**
 * The lesson's actions in the foot of the living lesson card, and again in the foot of its preview
 * (dl-1eieq.1; chat handoff dl-uukj.47.71 §4.4): Dla, then print · (once given) Kopiuj link · Daj
 * lekcję or Otwórz w nowej karcie (owner, 2026-11-04, dl-1eieq.7.3). What the
 * workspace's footer held before #740 (dl-z5ja.108.1.1), moved into the chat (decision
 * 2026-11-02-the-parent-app-is-chat-first-account-in-the-top-bar-lesson-on-de, dl-hz9ks):
 *
 *   Dla   who the lesson is for: the composer's Dla select when the page gives it (`forWhom`),
 *              else the child's name or "Bez dziecka" in words
 *   Drukuj   an icon button with its name as a tooltip: the lesson's PDF, made on the server
 *              (dl-1eieq.8.11, the print routes of dl-1eieq.8.4), once the lesson's latest check
 *              passed: an unchecked sheet could reach a child on paper (steward, #747). It opens
 *              a tab inside the click, so no popup blocker stops it, says "Przygotowuję kartkę…"
 *              while the PDF is made, and sends the tab to the PDF; a failure closes the tab and
 *              says so under the buttons, and pressing Drukuj again is the retry.
 *   Daj lekcję / Daj lekcję · {imię}   the one primary. Until it can give, it is quiet with its
 *              reason as a tooltip (DS S5, `DisabledReason`), never `disabled`. It gives
 *              the lesson (POST /api/v1/conversations/{id}/lessons), to that child or to nobody in
 *              particular (decision
 *              2026-11-03-a-play-link-opens-on-a-first-screen-title-and-question-count-the). It
 *              opens nothing by itself: it spins while giving, then becomes the link that opens
 *              the lesson in a new tab.
 *   Kopiuj link   once given, for sending the lesson to another device. If the browser refuses the
 *              clipboard, the link shows in a field below to select by hand.
 *
 * No "Zapisz na później": every lesson is already in Lekcje (owner, 2026-11-03).
 */

import type { Learner } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { RunView } from "@jadwigo/core";
import {
  Button,
  cn,
  DisabledReason,
  Input,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@jadwigo/ui";
import { CheckIcon, CopyIcon, ExternalLinkIcon, PrinterIcon } from "lucide-react";
import { type ReactElement, type ReactNode, useEffect, useState } from "react";

/** Where giving the lesson stands: nothing yet, on its way, given, or refused with its reason. */
export type GiveState =
  | { kind: "idle" }
  | { kind: "giving" }
  /** `name` is the child it waits for, or null for a link anyone may play. */
  | { kind: "given"; name: string | null; href: string }
  | { kind: "refused"; reason: "changed" | "child" | "failed" };

/** Why the PDF did not come: no print route here, the route failed, or it took too long. */
export class PrintFailed extends Error {
  constructor(readonly why: "unavailable" | "failed" | "slow") {
    super(`the print ${why}`);
    this.name = "PrintFailed";
  }
}

/** Where printing stands: nothing yet, the PDF on its way, or why it did not come. */
type PrintState = { kind: "idle" } | { kind: "preparing" } | { kind: PrintFailed["why"] };

const PRINT_SAID: Readonly<Record<Exclude<PrintState["kind"], "idle">, CopyKey>> = {
  preparing: "parent_print_preparing",
  unavailable: "parent_print_failed",
  failed: "parent_print_failed",
  slow: "parent_print_slow",
};

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
  print,
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
  /**
   * Makes the lesson's PDF and answers its address (the print routes, through waitForPrint), or
   * throws `PrintFailed`; absent where there is no route to print through.
   */
  print?: (() => Promise<string>) | undefined;
}): ReactElement {
  const t = (key: CopyKey, vars: Record<string, string> = {}): string =>
    copy(language, key, vars, "adult");
  const [printed, setPrinted] = useState<PrintState>({ kind: "idle" });
  const printNow = (): void => {
    if (!ready || lesson === null || print === undefined || printed.kind === "preparing") return;
    // The PDF's tab opens inside the click, so no popup blocker stops it.
    const opened = window.open("about:blank", "_blank");
    setPrinted({ kind: "preparing" });
    print().then(
      (url) => {
        setPrinted({ kind: "idle" });
        if (opened === null) {
          window.open(url, "_blank", "noopener");
          return;
        }
        try {
          opened.opener = null;
        } catch {
          // Left as it is.
        }
        opened.location.href = url;
      },
      (e: unknown) => {
        opened?.close();
        setPrinted({ kind: e instanceof PrintFailed ? e.why : "failed" });
      },
    );
  };
  const busy = given.kind === "giving";
  const canGive = ready && !busy && onGive !== undefined;
  const give = (): void => {
    if (canGive) onGive();
  };
  // The link the clipboard refused, shown to select by hand; a new link starts clean.
  const [uncopied, setUncopied] = useState<string | null>(null);
  const giveReason = !ready
    ? t("parent_give_reason")
    : onGive === undefined
      ? t("parent_give_unavailable")
      : null;
  // Printing waits for the same check as giving, and for a route to print through.
  const printReason =
    !ready || lesson === null
      ? t("parent_give_reason")
      : print === undefined
        ? t("parent_give_unavailable")
        : null;
  // While giving it stays the primary, with its spinner; quiet only when it can't give at all.
  const quietGive = busy || canGive ? null : giveReason;
  return (
    <div className="flex w-full flex-col" data-lesson-actions>
      {/* On a phone: Dla on its own row, then print and the rest, all 44 tall (chat handoff §4.4,
          delta card-ready-390); once given, the wide link to the lesson takes a row of its own. */}
      <div className="flex flex-wrap items-center gap-2 max-sm:flex-col max-sm:items-start">
        {forWhom ?? (
          <p className="text-jw-page-small text-jw-ink-soft" data-for-whom>
            {`${t("parent_for_whom")}: `}
            <span className="font-bold text-jw-ink">
              {child?.first_name ?? t("parent_no_child")}
            </span>
          </p>
        )}
        <div className="ml-auto flex items-center gap-2 max-sm:ml-0 max-sm:w-full max-sm:flex-wrap">
          <Quiet reason={printReason}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={t("parent_print")}
              className="size-8 min-h-8 min-w-8 max-sm:size-11 max-sm:min-h-11 max-sm:min-w-11"
              onClick={printNow}
              aria-busy={printed.kind === "preparing"}
              data-print
              data-print-state={printed.kind}
            >
              <PrinterIcon aria-hidden className="size-4" />
            </Button>
          </Quiet>
          {given.kind === "given" ? (
            <>
              <CopyLink
                language={language}
                href={given.href}
                onRefused={setUncopied}
                className="max-sm:flex-1"
              />
              <Button asChild size="control" className="max-sm:min-h-11 max-sm:w-full">
                <a href={given.href} target="_blank" rel="noopener" data-given-link>
                  {t("parent_given_open")}
                  <ExternalLinkIcon aria-hidden className="size-4" />
                </a>
              </Button>
            </>
          ) : (
            <Quiet reason={quietGive} className="max-sm:flex-1">
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
                aria-busy={busy}
                data-give
              >
                {busy && (
                  <Spinner aria-hidden label={t("parent_giving")} className="size-4 text-current" />
                )}
                {child === null
                  ? t("parent_give")
                  : t("parent_give_child", { name: child.first_name })}
              </Button>
            </Quiet>
          )}
        </div>
      </div>
      {given.kind === "given" && uncopied === given.href && (
        <Input
          kind="text"
          readOnly
          value={new URL(given.href, window.location.origin).href}
          aria-label={t("parent_given_link")}
          className="mt-2 h-8 min-h-8 w-full text-jw-page-small"
          onFocus={(event) => event.currentTarget.select()}
          data-given-url
        />
      )}
      <div
        role="status"
        // Who the link is for is said to a screen reader; the row shows the link itself.
        // Empty, it takes no room, so the row stays centred in a foot (design review 2026-11-03).
        className={cn(
          "text-jw-page-small text-jw-ink not-empty:mt-2",
          (given.kind === "given" || given.kind === "giving") && "sr-only",
        )}
        data-give-state={given.kind}
      >
        {given.kind === "giving" && t("parent_giving")}
        {given.kind === "refused" && t(REFUSED[given.reason])}
        {given.kind === "given" &&
          (given.name === null
            ? t("parent_given_anyone")
            : t("parent_given_child", { name: given.name }))}
      </div>
      <div
        role="status"
        className="text-jw-page-small text-jw-ink not-empty:mt-2"
        data-print-said={printed.kind}
      >
        {printed.kind !== "idle" && t(PRINT_SAID[printed.kind])}
      </div>
    </div>
  );
}

/** How long "Skopiowano" stands before the button says "Kopiuj link" again. */
const COPIED_MS = 2000;

/** Copies the lesson's link, for the parent to send it to another device. */
function CopyLink({
  language,
  href,
  onRefused,
  className,
}: {
  language: Language;
  href: string;
  /** The browser refused the clipboard (no permission, no secure page). */
  onRefused: (href: string) => void;
  /** Its place in the row on a phone. */
  className?: string;
}): ReactElement {
  const t = (key: CopyKey): string => copy(language, key, {}, "adult");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="control"
          className={cn("max-sm:min-h-11", className)}
          onClick={() => {
            navigator.clipboard.writeText(new URL(href, window.location.origin).href).then(
              () => setCopied(true),
              () => onRefused(href),
            );
          }}
          data-given-copy
          data-copied={copied}
        >
          {copied ? (
            <CheckIcon aria-hidden className="size-4 text-jw-right-ink" />
          ) : (
            <CopyIcon aria-hidden className="size-4" />
          )}
          {t(copied ? "parent_given_copied" : "parent_given_copy")}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{t("parent_given_share")}</TooltipContent>
    </Tooltip>
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
