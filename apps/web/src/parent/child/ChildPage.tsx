/**
 * One child's page, /parent/children/<learner> (dl-uukj.47.3; decision 2026-11-01-the-parent-app-is-
 * a-sidebar-shell-and-a-3-column-lesson-workspac, dl-xo0q; handoff §6, docs/worklog/dl-uukj.47):
 * a header with the disc, the name, the class and "Nowa lekcja · {name}" as the page's own action (never
 * in the top bar's corner), then the design system's Tabs: Przegląd · Umiejętności · Lekcje ·
 * Historia. The tab set is agreed; what each holds is open. Przegląd holds what the old home's card
 * held: the child's goals, weeks and report (LearnerKnowledge), and their lessons as tiles. The
 * others show their place and one muted line until their content is decided.
 *
 * On the adult frame (dl-uukj.47.67 §8, §12.6): the wide page, a title block with the disc 32 in the
 * child's tone, the h1 and the class as its muted line, "Nowa lekcja · {name}" as the one primary,
 * and the kit's underline tabs. The tab set stays today's (the handoff draws Przegląd · Cele · Raport
 * · Lekcje), and the tab stays in the page's state, not the URL, until a tab route exists. No ⋯
 * menu: the child has no secondary action yet.
 */

import type { ParentClient } from "@jadwigo/api-client";
import type { Learner } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Button, Disc, Notice, Tabs } from "@jadwigo/ui";
import { type ReactElement, useState } from "react";
import { NavLink } from "../../nav/NavLink.tsx";
import { CATEGORY, pageLang } from "../adult.ts";
import { TitleBlock, WidePage } from "../overview/frame.tsx";
import { parentPath } from "../route.ts";
import { LearnerOverview } from "./LearnerOverview.tsx";

type Tab = "overview" | "skills" | "lessons" | "history";

function Muted({ children }: { children: string }): ReactElement {
  return <p className="text-muted-foreground">{children}</p>;
}

export function ChildPage({
  api,
  learner,
  language,
  notice = null,
  tone,
}: {
  api: ParentClient;
  learner: Learner;
  language: Language;
  /** A line about what just happened, such as a claim the API refused calmly. */
  notice?: string | null;
  /** The child's tone (../tone.ts learnerTone); stone without it. */
  tone?: number;
}): ReactElement {
  const [tab, setTab] = useState<Tab>("overview");
  const t = (key: CopyKey, vars: Record<string, string | number> = {}): string =>
    copy(language, key, vars, CATEGORY);
  const grade = learner.school_grade;
  return (
    <WidePage data-parent data-learner-card={learner.id}>
      <TitleBlock
        data-child-header
        disc={
          <Disc name={learner.first_name} size={32} {...(tone === undefined ? {} : { tone })} />
        }
        title={learner.first_name}
        {...(grade === null ? {} : { line: t("parent_child_grade", { grade }) })}
        action={
          // Under the name on a phone, so it never crowds it (dl-uukj.47.21).
          <Button asChild size="control" className="w-full sm:w-auto">
            <NavLink
              href={parentPath({ forLearner: learner.id, lang: pageLang() })}
              data-new-lesson-for
            >
              {t("parent_new_lesson_child", { name: learner.first_name })}
            </NavLink>
          </Button>
        }
      />
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
    </WidePage>
  );
}
