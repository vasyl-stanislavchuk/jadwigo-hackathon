/**
 * Dla, the first screen's optional pick of the child a lesson is for (decision 2026-11-01-the-parent-
 * app-is-a-sidebar-shell-and-a-3-column-lesson-workspac, dl-xo0q), on the adult kit's Combobox
 * (handoff dl-uukj.47.67 §6.5, S8): the trigger says "Dla", the child's disc in its tone and the name,
 * or a dashed disc and "Bez dziecka". The list starts with "Bez dziecka", then each child with "klasa
 * N", and ends with "+ Dodaj dziecko…". A lesson belongs to the family, so no child is a full answer.
 * The Combobox gives the focus back to the trigger before "Dodaj dziecko…" runs, so the dialog gives
 * it back there when it closes (dl-uukj.47.20).
 */

import type { Learner, LearnerId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Combobox, Disc } from "@jadwigo/ui";
import { PlusIcon } from "lucide-react";
import type { ReactElement } from "react";
import { CATEGORY } from "../adult.ts";
import { learnerTone } from "../tone.ts";

interface Row {
  /** The learner's id, or "" for "Bez dziecka". */
  value: string;
  label: string;
  learner?: Learner;
}

export function DlaSelect({
  language,
  learners,
  value,
  onChange,
  onAddChild,
}: {
  language: Language;
  learners: readonly Learner[];
  /** The child the lesson is for, or null for none. */
  value: LearnerId | null;
  onChange: (learner: LearnerId | null) => void;
  onAddChild: () => void;
}): ReactElement {
  const t = (key: CopyKey, params: Record<string, string | number> = {}): string =>
    copy(language, key, params, CATEGORY);
  const rows: Row[] = [
    { value: "", label: t("parent_no_child") },
    ...learners.map((learner) => ({ value: learner.id, label: learner.first_name, learner })),
  ];
  const disc = (row: Row | undefined): ReactElement =>
    row?.learner === undefined ? (
      <Disc kind="none" size={20} />
    ) : (
      <Disc name={row.learner.first_name} tone={learnerTone(learners, row.learner.id)} size={20} />
    );
  return (
    <Combobox
      label={t("parent_for")}
      options={rows}
      value={value ?? ""}
      onChange={(next) => onChange(learners.find((learner) => learner.id === next)?.id ?? null)}
      renderValue={(row) => (
        <>
          <span className="text-muted-foreground">{t("parent_for")}</span>
          {disc(row)}
          <span className="truncate font-medium">{row?.label ?? t("parent_no_child")}</span>
        </>
      )}
      renderOption={(row) => (
        <span className="flex min-w-0 items-center gap-2">
          {disc(row)}
          <span className="truncate">{row.label}</span>
          {row.learner?.school_grade != null && (
            <span className="text-muted-foreground">
              {t("parent_grade_n", { grade: row.learner.school_grade })}
            </span>
          )}
        </span>
      )}
      footer={{
        label: (
          <span className="flex items-start gap-2">
            <PlusIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span className="flex flex-col">
              <span>{t("parent_add_child_menu")}</span>
              <span className="text-jw-page-small text-muted-foreground">
                {t("parent_add_child_hint")}
              </span>
            </span>
          </span>
        ),
        onSelect: onAddChild,
      }}
    />
  );
}
