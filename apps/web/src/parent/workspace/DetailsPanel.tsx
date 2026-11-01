/**
 * The workspace's details (decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-column-
 * lesson-workspac, dl-xo0q; handoff §5.5): Dla kogo ("Bez dziecka" with "Dodaj dziecko", or the
 * child with "Zmień"); Co ćwiczy ta lekcja, only with a child; O lekcji. Their content fills as the
 * engine writes the lesson (dl-z5ja.108); here is their place.
 */

import type { Learner } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, Disc } from "@jadwigo/ui";
import type { ReactElement, ReactNode } from "react";
import { CATEGORY } from "../adult.ts";

function Section({ title, children }: { title: string; children: ReactNode }): ReactElement {
  return (
    <section className="flex flex-col gap-2 border-t-jw border-jw-line py-4 first:border-t-0 first:pt-1">
      <h3 className="text-jw-page-small leading-tight font-bold tracking-wider text-jw-ink-soft uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function DetailsPanel({
  language,
  child,
  onAddChild,
  changeMenu,
}: {
  language: Language;
  child: Learner | null;
  onAddChild: () => void;
  /** Wraps "Zmień" in the menu that picks another child or none (DlaSelect with a trigger). */
  changeMenu: (trigger: ReactElement) => ReactElement;
}): ReactElement {
  const t = (key: CopyKey): string => copy(language, key, {}, CATEGORY);
  return (
    <div className="flex flex-col" data-details>
      <Section title={t("parent_for_whom")}>
        {child === null ? (
          <div className="flex items-center justify-between gap-2">
            <span>{t("parent_no_child")}</span>
            <Button type="button" variant="outline" size="control" onClick={onAddChild}>
              {t("parent_add_child")}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2" data-for-child={child.id}>
            <Disc name={child.first_name} />
            <span className="min-w-0 flex-1 truncate font-bold">{child.first_name}</span>
            {changeMenu(
              <Button type="button" variant="outline" size="control" data-change-child>
                {t("parent_change")}
              </Button>,
            )}
          </div>
        )}
      </Section>
      {child !== null && (
        <Section title={t("parent_lesson_skills")}>
          <p className="text-jw-page-small text-jw-ink-soft">{t("parent_lesson_skills_empty")}</p>
        </Section>
      )}
      <Section title={t("parent_about_lesson")}>
        <p className="text-jw-page-small text-jw-ink-soft">{t("parent_about_lesson_empty")}</p>
      </Section>
    </div>
  );
}
