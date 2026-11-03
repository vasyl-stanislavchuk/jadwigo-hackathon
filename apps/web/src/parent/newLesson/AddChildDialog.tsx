/**
 * Dodaj dziecko, a dialog (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-column-
 * lesson-workspac, dl-xo0q; handoff dl-uukj.47.67 §6.10, S9): the first name, with the note that it
 * never goes into a lesson, and the class as compact Radio Cards, 1 to 6 with each one's age line.
 * Anuluj, Dodaj. It opens from the sidebar's "+" or from Dla's "Dodaj dziecko…", leaves the page as it
 * was, and gives the focus back to what opened it. Dodaj with no name says what is missing under the
 * field, in the ink with the alert mark (§6.2, S3), never the browser's own "Please fill out this
 * field", and puts the caret back in it. Klasa stays optional.
 * The class is asked but not stored yet: LearnerCreate takes no school_grade (dl-e8ov.2.90).
 */

import { track } from "@jadwigo/analytics";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  Field,
  Input,
  RadioCards,
} from "@jadwigo/ui";
import { type FormEvent, type ReactElement, useEffect, useRef, useState } from "react";
import { CATEGORY } from "../adult.ts";

const GRADES = [1, 2, 3, 4, 5, 6] as const;

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
  const t = (key: CopyKey, params: Record<string, number> = {}): string =>
    copy(language, key, params, CATEGORY);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  // Dodaj was pressed with no name: the field says so until there is one.
  const [tried, setTried] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  // What had the focus when the dialog opened: the "+" or Dla. A dialog opened from state has no
  // Radix trigger to give it back to, so it is kept here.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setName("");
    setGrade("");
    setFailed(false);
    setTried(false);
  }, [open]);

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    const firstName = name.trim();
    if (busy) return;
    if (firstName === "") {
      setTried(true);
      form.current?.querySelector<HTMLInputElement>("[data-first-name]")?.focus();
      return;
    }
    setBusy(true);
    setFailed(false);
    onAdd({ firstName, grade: grade === "" ? null : Number(grade) })
      .then(
        () => {
          track("learner_created", { has_school_grade: grade !== "" });
          onOpenChange(false);
        },
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
        <form ref={form} onSubmit={submit} noValidate className="flex flex-col gap-4">
          <Field
            label={t("parent_first_name")}
            description={t("parent_name_note")}
            problem={
              tried && name.trim() === ""
                ? t("parent_add_child_reason")
                : failed
                  ? t("parent_load_failed")
                  : undefined
            }
          >
            <Input
              kind="text"
              maxLength={60}
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-first-name
            />
          </Field>
          <RadioCards
            label={t("parent_grade")}
            compact
            value={grade}
            onChange={setGrade}
            options={GRADES.map((g) => ({
              value: String(g),
              label: String(g),
              // A first grader in Poland is 7.
              hint: t("parent_grade_age", { from: g + 6, to: g + 7 }),
            }))}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" size="control">
                {t("parent_cancel")}
              </Button>
            </DialogClose>
            <Button type="submit" size="control" aria-disabled={busy} aria-busy={busy} data-add>
              {t("parent_add")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
