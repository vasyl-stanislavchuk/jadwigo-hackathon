/**
 * Dodaj dziecko, a dialog (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-column-
 * lesson-workspac, dl-xo0q; handoff §5.3): the first name, with the note that it never goes into a
 * lesson, and the class as one row of 1 to 6. Anuluj, Dodaj. It opens from the sidebar's "+" or from
 * Dla's "Dodaj dziecko…", leaves the page as it was, and gives the focus back to what opened it.
 * The class is asked but not stored yet: LearnerCreate takes no school_grade (dl-e8ov.2.90).
 */

import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Field,
  Input,
  SegmentedControl,
} from "@jadwigo/ui";
import { type FormEvent, type ReactElement, useEffect, useId, useRef, useState } from "react";
import { CATEGORY } from "../adult.ts";

const GRADES = ["1", "2", "3", "4", "5", "6"] as const;

export function AddChildDialog({
  language,
  open,
  onOpenChange,
  onAdd,
}: {
  language: Language;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Adds the child; the dialog closes once it resolves, and stays open with its words if it fails. */
  onAdd: (child: { firstName: string; grade: number | null }) => Promise<void>;
}): ReactElement {
  const t = (key: CopyKey): string => copy(language, key, {}, CATEGORY);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const noteId = useId();
  // What had the focus when the dialog opened: the "+" or Dla. A dialog opened from state has no
  // Radix trigger to give it back to, so it is kept here.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setName("");
    setGrade("");
    setFailed(false);
  }, [open]);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const firstName = name.trim();
    if (firstName === "" || busy) return;
    setBusy(true);
    setFailed(false);
    onAdd({ firstName, grade: grade === "" ? null : Number(grade) })
      .then(
        () => onOpenChange(false),
        () => setFailed(true),
      )
      .finally(() => setBusy(false));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={t("parent_add_child")}
        description={t("parent_add_child_hint")}
        onCloseAutoFocus={(event) => {
          if (opener.current === null || !opener.current.isConnected) return;
          event.preventDefault();
          opener.current.focus();
        }}
        data-add-child-dialog
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Field
              label={t("parent_first_name")}
              problem={failed ? t("parent_load_failed") : undefined}
            >
              <Input
                kind="text"
                required
                maxLength={60}
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-describedby={noteId}
                data-first-name
              />
            </Field>
            <p id={noteId} className="text-jw-page-small text-jw-ink-soft">
              {t("parent_name_note")}
            </p>
          </div>
          <SegmentedControl
            label={t("parent_grade")}
            size="sm"
            value={grade}
            onChange={setGrade}
            options={GRADES.map((g) => ({ value: g, label: g }))}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" size="control">
                {t("parent_cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" size="control" disabled={busy} data-add>
              {t("parent_add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
