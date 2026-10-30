/**
 * Each goal of a learner as the parent reads it (dl-e8ov.5.7, decision david-learns
 * 2026-10-22-goals-have-no-stages-what-comes-next-is-computed-from-evidence): its name, where it
 * stands in one word, and 3 lists of can-do lines: what the learner can do now, what they are
 * working on, and what comes next. An empty list says so; nothing is guessed at.
 */

import type { GoalView, Skill, SkillId } from "@jadwigo/contracts";
import { type CopyKey, copy, type Language } from "@jadwigo/copy";
import { Card, CardContent, Heading } from "@jadwigo/ui";
import type { ReactElement } from "react";
import { CATEGORY } from "../adult.ts";
import { GOAL_STATUS, skillLine } from "./words.ts";

/** The 3 lists, in the order the parent reads them. */
const LISTS = [
  ["can_do_now", "parent_goal_can_do_now"],
  ["needs_attention", "parent_goal_needs_attention"],
  ["next", "parent_goal_next"],
] as const satisfies readonly (readonly [keyof GoalView, CopyKey])[];

export function GoalLists({
  goals,
  catalogue,
  language,
}: {
  goals: readonly GoalView[];
  catalogue: readonly Skill[];
  language: Language;
}): ReactElement {
  return (
    <section className="flex w-full flex-col gap-3" data-goals>
      <Heading level={3}>{copy(language, "parent_learner_goals", {}, CATEGORY)}</Heading>
      {goals.length === 0 ? (
        <p data-no-goals>{copy(language, "parent_learner_no_goals", {}, CATEGORY)}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {goals.map((view) => (
            <li key={view.goal.id} data-goal={view.goal.id} data-goal-status={view.status}>
              <Card size="compact">
                <CardContent className="items-start gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold break-words">{view.goal.name}</span>
                    <span className="text-jw-small text-jw-ink-soft" data-status-word>
                      {copy(language, GOAL_STATUS[view.status], {}, CATEGORY)}
                    </span>
                  </div>
                  {LISTS.map(([list, title]) => (
                    <SkillList
                      key={list}
                      list={list}
                      title={copy(language, title, {}, CATEGORY)}
                      codes={view[list]}
                      catalogue={catalogue}
                      language={language}
                    />
                  ))}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SkillList({
  list,
  title,
  codes,
  catalogue,
  language,
}: {
  list: string;
  title: string;
  codes: readonly SkillId[];
  catalogue: readonly Skill[];
  language: Language;
}): ReactElement {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1" data-list={list}>
      <span className="font-bold">{title}</span>
      {codes.length === 0 ? (
        <p className="text-jw-ink-soft" data-nothing-recorded>
          {copy(language, "parent_learner_nothing_recorded", {}, CATEGORY)}
        </p>
      ) : (
        <ul className="flex list-disc flex-col gap-1 ps-5">
          {codes.map((code) => (
            <li key={code} className="break-words" data-skill={code}>
              {skillLine(code, catalogue, language)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
