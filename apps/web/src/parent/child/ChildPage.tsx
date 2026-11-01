/**
 * One child's page, /parent/children/<learner> (dl-uukj.47.3; decision 2026-11-01-the-parent-app-is-
 * a-sidebar-shell-and-a-3-column-lesson-workspac, dl-xo0q; handoff §6, docs/worklog/dl-uukj.47):
 * a header with the disc, the name, the class and "Nowa lekcja dla" as the page's own action (never
 * in the top bar's corner), then the design system's Tabs: Przegląd · Umiejętności · Lekcje ·
 * Historia. The tab set is agreed; what each holds is open. Przegląd holds what the old home's card
 * held: the child's goals, weeks and report (LearnerKnowledge), and their lessons as tiles. The
 * others show their place and one muted line until their content is decided.
 */

import type { ParentClient } from "@jadwigo/api-client";
import type { Learner } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, Disc, Heading, Notice, Page, Tabs } from "@jadwigo/ui";
import { type ReactElement, useState } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import { parentPath } from "../route.ts";
import { LearnerOverview } from "./LearnerOverview.tsx";

type Tab = "overview" | "skills" | "lessons" | "history";

function Muted({ children }: { children: string }): ReactElement {
  return <p className="text-jw-ink-soft">{children}</p>;
}

export function ChildPage({
  api,
  learner,
  language,
  notice = null,
}: {
  api: ParentClient;
  learner: Learner;
  language: Language;
  /** A line about what just happened, such as a claim the API refused calmly. */
  notice?: string | null;
}): ReactElement {
  const [tab, setTab] = useState<Tab>("overview");
  const t = (key: CopyKey, vars: Record<string, string | number> = {}): string =>
    copy(language, key, vars, CATEGORY);
  const grade = learner.school_grade;
  return (
    <Page width="prose" data-parent data-learner-card={learner.id}>
      <header className="flex flex-wrap items-center gap-3" data-child-header>
        <Disc name={learner.first_name} className="size-10 text-jw-page-body" />
        <div className="flex min-w-0 flex-1 flex-col">
          <Heading>{learner.first_name}</Heading>
          {grade !== null && (
            <span className="text-jw-page-small text-jw-ink-soft">
              {t("parent_child_grade", { grade })}
            </span>
          )}
        </div>
        <Button asChild variant="outline" size="control">
          <NavLink
            href={parentPath({ forLearner: learner.id, lang: pageLang() })}
            data-new-lesson-for
          >
            {t("parent_new_lesson_for", { name: learner.first_name })}
          </NavLink>
        </Button>
      </header>
      {notice !== null && <Notice>{notice}</Notice>}
      <Tabs
        label={t("parent_child_tabs")}
        value={tab}
        onChange={(value) => setTab(value as Tab)}
        tabs={[
          {
            value: "overview",
            label: t("parent_tab_overview"),
            panel: <LearnerOverview api={api} learner={learner} language={language} />,
          },
          {
            value: "skills",
            label: t("parent_tab_skills"),
            panel: <Muted>{t("parent_child_skills_empty")}</Muted>,
          },
          {
            value: "lessons",
            label: t("parent_nav_lessons"),
            panel: <Muted>{t("parent_child_lessons_empty")}</Muted>,
          },
          {
            value: "history",
            label: t("parent_nav_history"),
            panel: <Muted>{t("parent_child_history_empty")}</Muted>,
          },
        ]}
      />
    </Page>
  );
}
