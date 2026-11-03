/**
 * The lesson's actions in the foot of the newest lesson card, and again in the foot of its preview
 * (dl-1eieq.1): Daj lekcję, Drukuj, and Zapisz na później as a quiet link (dl-uukj.47.55; decision
 * 2026-11-02-the-parent-app-is-chat-first-account-in-the-top-bar-lesson-on-de, dl-hz9ks: "Actions
 * on how and when to give a lesson are going to be available directly within the chat"). What the
 * workspace's footer held before #740 (dl-z5ja.108.1.1), moved into the chat:
 *
 *   Dla kogo   who the lesson is for: the Dla child's name, or "Bez dziecka"
 *   Drukuj   the lesson's sheet, printed in place (LessonPrint), once the lesson's latest check
 *              passed: an unchecked sheet could reach a child on paper (steward, #747)
 *   Daj lekcję / Daj lekcję · {imię}   the one primary, quiet with its reason until the lesson's
 *              latest check passed, never a silent grey. With a child it gives the lesson to that
 *              child (POST /api/v1/conversations/{id}/lessons) and says where it waits. With no
 *              child it opens 2 choices: "Otwórz na tym komputerze" (gives it to nobody in
 *              particular and opens the player) and "Drukuj" (LessonPrint).
 *   Zapisz na później   to the family's lessons, a quiet link after the 2
 *
 * Drukuj prints in place until the server's PDF (dl-1eieq.2) replaces `print`.
 *
 * What the lesson practises is not here yet: the lesson file names skill ids, and wording them for a
 * parent needs the catalogue's can-do lines (dl-hin8.21).
 */

import type { Learner } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { RunView } from "@jadwigo/core";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter } from "@jadwigo/ui";
import { type ReactElement, useEffect, useId, useState } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { LessonPrint, printLesson } from "./LessonPrint.tsx";

/** Where giving the lesson stands: nothing yet, on its way, given, or refused with its reason. */
export type GiveState =
  | { kind: "idle" }
  | { kind: "giving" }
  | { kind: "given"; name: string; href: string }
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
  onSave,
  onGive,
  onOpenHere,
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
  /** Zapisz na później. */
  onSave: () => void;
  /** Daj lekcję · {imię}, with a child; absent where nothing can give (no sign-in). */
  onGive?: (() => void) | undefined;
  /** Opens the lesson here for the child; quiet with its reason while it is not given. */
  onOpenHere?: (() => void) | undefined;
  /** Where giving stands, said under the buttons. */
  given?: GiveState;
  /** The browser's print; a test's own. */
  print?: () => void;
}): ReactElement {
  const t = (key: CopyKey, vars: Record<string, string> = {}): string =>
    copy(language, key, vars, "adult");
  const reasonId = useId();
  const hereId = useId();
  const [choosing, setChoosing] = useState(false);
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
    setChoosing(false);
    setPrinting(true);
    printLesson(print);
  };
  const busy = given.kind === "giving";
  // With a child, the lesson goes to that child; with none, the dialog offers this computer or paper.
  const canGive = ready && !busy && (child === null || onGive !== undefined);
  const give = (): void => {
    if (!canGive) return;
    if (child === null) setChoosing(true);
    else onGive?.();
  };
  const giveReason = !ready
    ? t("parent_give_reason")
    : child !== null && onGive === undefined
      ? t("parent_give_unavailable")
      : null;
  return (
    <div className="flex w-full flex-col gap-2" data-lesson-actions>
      <p className="text-jw-page-small text-jw-ink-soft" data-for-whom>
        {`${t("parent_for_whom")}: `}
        <span className="font-bold text-jw-ink">{child?.first_name ?? t("parent_no_child")}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="control"
          aria-disabled={!canGive}
          aria-describedby={giveReason === null ? undefined : reasonId}
          // Quiet with its reason (handoff §3), never a silent grey.
          className={canGive ? undefined : "border-dashed"}
          onClick={give}
          data-give
        >
          {child === null ? t("parent_give") : t("parent_give_child", { name: child.first_name })}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="control"
          // Only a checked lesson goes on paper: the sheet reaches a child as surely as the player.
          aria-disabled={!ready || lesson === null}
          aria-describedby={ready ? undefined : reasonId}
          className={ready && lesson !== null ? undefined : "border-dashed text-jw-ink-soft"}
          onClick={() => {
            if (ready && lesson !== null) printNow();
          }}
          data-print
        >
          {t("parent_print")}
        </Button>
        {/* Quiet beside the 2 that act now (owner, 2026-11-03): the lesson is in Lekcje either way. */}
        <Button
          type="button"
          variant="link"
          size="control"
          className="ml-auto"
          onClick={onSave}
          data-save
        >
          {t("parent_save")}
        </Button>
      </div>
      {giveReason !== null && (
        <p id={reasonId} className="text-jw-page-small text-jw-ink-soft" data-give-reason>
          {giveReason}
        </p>
      )}
      <p role="status" className="text-jw-page-small text-jw-ink" data-give-state={given.kind}>
        {given.kind === "giving" && t("parent_giving")}
        {given.kind === "refused" && t(REFUSED[given.reason])}
        {given.kind === "given" && (
          <>
            {`${t("parent_given_child", { name: given.name })} `}
            <NavLink
              href={given.href}
              className="font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-jw-focus"
              data-given-link
            >
              {t("parent_given_link")}
            </NavLink>
          </>
        )}
      </p>
      <Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogContent title={t("parent_give_title")} data-give-dialog>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                variant="outline"
                size="control"
                aria-disabled={onOpenHere === undefined}
                className={onOpenHere === undefined ? "border-dashed text-jw-ink-soft" : undefined}
                aria-describedby={onOpenHere === undefined ? hereId : undefined}
                onClick={() => {
                  if (onOpenHere === undefined) return;
                  setChoosing(false);
                  onOpenHere();
                }}
                data-give-here
              >
                {t("parent_this_computer")}
              </Button>
              {onOpenHere === undefined && (
                <p id={hereId} className="text-jw-page-small text-jw-ink-soft">
                  {t("parent_this_computer_soon")}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                variant="outline"
                size="control"
                disabled={!ready || lesson === null}
                onClick={printNow}
                data-give-print
              >
                {t("parent_print")}
              </Button>
              <p className="text-jw-page-small text-jw-ink-soft">{t("parent_print_hint")}</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="control">
                {t("parent_cancel")}
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {printing && lesson !== null && <LessonPrint language={language} lesson={lesson} />}
    </div>
  );
}
