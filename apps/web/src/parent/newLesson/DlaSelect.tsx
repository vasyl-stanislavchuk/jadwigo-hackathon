/**
 * "Dla: Bez dziecka ▾", the first screen's optional selector (decision 2026-11-01-the-parent-app-is-
 * a-sidebar-shell-and-a-3-column-lesson-workspac, dl-xo0q; handoff §3 "Optional selector", §5.2): it
 * sits inline, defaults to the no-choice value, and its menu ends with "Dodaj dziecko…". A lesson
 * belongs to the family, so no child is a full answer.
 */

import type { Learner, LearnerId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { cn, Popover, PopoverContent, PopoverTrigger } from "@jadwigo/ui";
import { CheckIcon, ChevronDownIcon, PlusIcon } from "lucide-react";
import { type ReactElement, type ReactNode, useState } from "react";
import { CATEGORY } from "../adult.ts";

const ROW =
  "flex min-h-jw-control w-full items-center gap-2 rounded-jw-small px-2 text-left text-jw-ink hover:bg-jw-act-quiet focus-visible:outline-3 focus-visible:outline-jw-focus";

function Option({
  checked,
  onPick,
  children,
}: {
  checked: boolean;
  onPick: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={checked}
      onClick={onPick}
      className={cn(ROW, checked && "font-bold")}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {checked && <CheckIcon aria-hidden className="size-4 shrink-0 text-jw-pick-ink" />}
    </button>
  );
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
  const [open, setOpen] = useState(false);
  const t = (key: CopyKey): string => copy(language, key, {}, CATEGORY);
  const chosen = learners.find((l) => l.id === value);
  const pick = (learner: LearnerId | null): void => {
    onChange(learner);
    setOpen(false);
  };
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-h-jw-control items-center gap-1.5 rounded-jw-small px-2 text-jw-ink hover:bg-jw-act-quiet focus-visible:outline-3 focus-visible:outline-jw-focus"
          data-dla
        >
          <span className="text-jw-ink-soft">{t("parent_for")}</span>
          <span className="font-bold">{chosen?.first_name ?? t("parent_no_child")}</span>
          <ChevronDownIcon aria-hidden className="size-4 text-jw-ink-soft" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 gap-0.5 p-1.5" data-dla-menu>
        <div role="menu" aria-label={t("parent_for")} className="flex flex-col gap-0.5">
          <Option checked={value === null} onPick={() => pick(null)}>
            {t("parent_no_child")}
          </Option>
          {learners.map((learner) => (
            <Option key={learner.id} checked={value === learner.id} onPick={() => pick(learner.id)}>
              {learner.first_name}
            </Option>
          ))}
          <div className="my-1 border-t-jw border-jw-line" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onAddChild();
            }}
            className={cn(ROW, "items-start py-1.5")}
            data-dla-add
          >
            <PlusIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-jw-ink-soft" />
            <span className="flex flex-col">
              <span>{t("parent_add_child_menu")}</span>
              <span className="text-jw-page-small text-jw-ink-soft">
                {t("parent_add_child_hint")}
              </span>
            </span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
