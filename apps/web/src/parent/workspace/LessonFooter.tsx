/**
 * The lesson column's pinned footer (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-
 * column-lesson-workspac, dl-xo0q; handoff §3 "Pinned column footer", §5.4–5.5): a muted status line
 * in words on the left; "Zapisz na później", then the one primary on the right: "Daj lekcję" with no
 * child, "Pokaż {imię}" with one. While the lesson is not ready the primary is quiet, with the
 * reason in the status line, never a silent grey.
 *
 * "Daj lekcję" with no child opens a small dialog with 2 choices (handoff §5.6, dl-z5ja.108.1.1):
 * "Otwórz na tym komputerze", and "Wydrukuj", which prints the lesson's sheet in place
 * (LessonPanePrint). Until a route turns the workspace's lesson into one the player plays, the first
 * is quiet with its reason.
 */

import type { Learner } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import type { RunView } from "@jadwigo/core";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter } from "@jadwigo/ui";
import { type ReactElement, useId, useState } from "react";
import { LessonPanePrint, printLesson } from "../../chat/LessonPanePrint.tsx";
import { CATEGORY } from "../adult.ts";
import { Band } from "./Workspace.tsx";

export function LessonFooter({
  language,
  status,
  ready,
  child,
  onSave,
  onGive,
  lesson = null,
  onOpenHere,
  print = () => window.print(),
}: {
  language: Language;
  /** The lesson's state in words, such as "Gotowe zadania: 3 z 6". */
  status: string;
  /** Whether the lesson passed its check, so it can be given. */
  ready: boolean;
  /** The child the lesson is for, or null. */
  child: Learner | null;
  onSave: () => void;
  /** "Pokaż {imię}", with a child. */
  onGive: () => void;
  /** The lesson shown, which "Wydrukuj" prints. */
  lesson?: RunView["lesson"];
  /** Opens the lesson here for the child; quiet with its reason while it is not given. */
  onOpenHere?: (() => void) | undefined;
  /** The browser's print; a test's own. */
  print?: () => void;
}): ReactElement {
  const t = (key: CopyKey, vars: Record<string, string> = {}): string =>
    copy(language, key, vars, CATEGORY);
  const statusId = useId();
  const hereId = useId();
  const [choosing, setChoosing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const give = (): void => {
    if (!ready) return;
    if (child === null) setChoosing(true);
    else onGive();
  };
  return (
    <Band data-lesson-footer>
      <p
        id={statusId}
        className="min-w-0 flex-1 truncate text-jw-page-small text-jw-ink-soft"
        data-status
      >
        {ready ? status : `${status} · ${t("parent_give_reason")}`}
      </p>
      <Button type="button" variant="outline" size="control" onClick={onSave} data-save>
        {t("parent_save")}
      </Button>
      <Button
        type="button"
        size="control"
        aria-disabled={!ready}
        aria-describedby={ready ? undefined : statusId}
        onClick={give}
        data-give
      >
        {child === null ? t("parent_give") : t("parent_give_child", { name: child.first_name })}
      </Button>
      <Dialog open={choosing} onOpenChange={setChoosing}>
        <DialogContent title={t("parent_give_title")} data-give-dialog>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                variant="outline"
                size="control"
                aria-disabled={onOpenHere === undefined}
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
                onClick={() => {
                  setChoosing(false);
                  setPrinting(true);
                  printLesson(print);
                }}
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
      {printing && lesson !== null && <LessonPanePrint language={language} lesson={lesson} />}
    </Band>
  );
}
