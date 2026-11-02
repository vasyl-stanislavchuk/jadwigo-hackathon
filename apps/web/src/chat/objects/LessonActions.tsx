/**
 * The lesson's actions in the foot of the newest lesson card (dl-uukj.47.55; decision
 * 2026-11-02-the-parent-app-is-chat-first-account-in-the-top-bar-lesson-on-de, dl-hz9ks: "Actions
 * on how and when to give a lesson are going to be available directly within the chat"). What the
 * workspace's footer held before #740 (dl-z5ja.108.1.1), moved into the chat:
 *
 *   Dla kogo   who the lesson is for: the Dla child's name, or "Bez dziecka"
 *   Zapisz na później   to the family's lessons
 *   Wydrukuj   the lesson's sheet, printed in place (LessonPrint)
 *   Daj lekcję / Daj lekcję · {imię}   the one primary, quiet with its reason until the lesson's
 *              latest check passed, never a silent grey. With no child it opens 2 choices:
 *              "Otwórz na tym komputerze" (quiet with its reason until a route opens the lesson for
 *              the player) and "Wydrukuj", which prints the lesson's sheet in place (LessonPrint).
 *
 * What the lesson practises is not here yet: the lesson file names skill ids, and wording them for a
 * parent needs the catalogue's can-do lines (dl-hin8.21).
 */

import type { Learner } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { RunView } from "@jadwigo/core";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter } from "@jadwigo/ui";
import { type ReactElement, useEffect, useId, useState } from "react";
import { LessonPrint, printLesson } from "./LessonPrint.tsx";

export function LessonActions({
  language,
  ready,
  child,
  lesson,
  onSave,
  onGive,
  onOpenHere,
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
  /** Daj lekcję · {imię}, with a child. */
  onGive: () => void;
  /** Opens the lesson here for the child; quiet with its reason while it is not given. */
  onOpenHere?: (() => void) | undefined;
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
    setChoosing(false);
    setPrinting(true);
    printLesson(print);
  };
  const give = (): void => {
    if (!ready) return;
    if (child === null) setChoosing(true);
    else onGive();
  };
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
          aria-disabled={!ready}
          aria-describedby={ready ? undefined : reasonId}
          // Quiet with its reason (handoff §3), never a silent grey.
          className={ready ? undefined : "border-dashed"}
          onClick={give}
          data-give
        >
          {child === null ? t("parent_give") : t("parent_give_child", { name: child.first_name })}
        </Button>
        <Button type="button" variant="outline" size="control" onClick={onSave} data-save>
          {t("parent_save")}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="control"
          disabled={lesson === null}
          onClick={printNow}
          data-print
        >
          {t("parent_print")}
        </Button>
      </div>
      {!ready && (
        <p id={reasonId} className="text-jw-page-small text-jw-ink-soft" data-give-reason>
          {t("parent_give_reason")}
        </p>
      )}
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
                disabled={lesson === null}
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
