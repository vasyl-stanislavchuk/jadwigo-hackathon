/**
 * The lesson column's pinned footer (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-
 * column-lesson-workspac, dl-xo0q; handoff §3 "Pinned column footer", §5.4–5.5): a muted status line
 * in words on the left; "Zapisz na później", then the one primary on the right: "Daj lekcję" with no
 * child, "Pokaż {imię}" with one. While the lesson is not ready the primary is quiet, with the
 * reason in the status line, never a silent grey.
 */

import type { Learner } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button } from "@jadwigo/ui";
import { type ReactElement, useId } from "react";
import { CATEGORY } from "../adult.ts";
import { Band } from "./Workspace.tsx";

export function LessonFooter({
  language,
  status,
  ready,
  child,
  onSave,
  onGive,
}: {
  language: Language;
  /** The lesson's state in words, such as "Gotowe zadania: 3 z 6". */
  status: string;
  /** Whether the lesson passed its check, so it can be given. */
  ready: boolean;
  /** The child the lesson is for, or null. */
  child: Learner | null;
  onSave: () => void;
  onGive: () => void;
}): ReactElement {
  const t = (key: CopyKey, vars: Record<string, string> = {}): string =>
    copy(language, key, vars, CATEGORY);
  const statusId = useId();
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
        onClick={() => ready && onGive()}
        data-give
      >
        {child === null ? t("parent_give") : t("parent_show", { name: child.first_name })}
      </Button>
    </Band>
  );
}
