/**
 * The week strip (dl-e8ov.5.7): the last 4 weeks side by side, each with the lessons played, the
 * skills that moved forward and the skills that needed attention, as digits. A week no report
 * ended in says so rather than showing a 0 it does not know. 2 columns on a phone, 4 from `sm`.
 */

import { copy, type Language } from "@jadwigo/copy";
import { Heading } from "@jadwigo/ui";
import type { ReactElement } from "react";
import { CATEGORY } from "../adult.ts";
import type { WeekCounts } from "./weeks.ts";

export function WeekStrip({
  weeks,
  language,
}: {
  weeks: readonly WeekCounts[];
  language: Language;
}): ReactElement {
  // The Monday is a calendar day, so it is drawn in UTC, where its midnight is.
  const day = new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return (
    <section className="flex w-full flex-col gap-3" data-week-strip>
      <Heading level={3}>{copy(language, "parent_week_title", {}, CATEGORY)}</Heading>
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {weeks.map((week) => (
          <li
            key={week.monday}
            className="flex min-w-0 flex-col gap-1 rounded-jw-card border-2 border-jw-line bg-jw-card p-3 text-jw-small"
            data-week={week.monday}
          >
            <span className="font-bold">
              {copy(
                language,
                "parent_week_of",
                { day: day.format(new Date(`${week.monday}T00:00:00.000Z`)) },
                CATEGORY,
              )}
            </span>
            <span data-lessons={week.lessons}>
              {copy(language, "parent_week_lessons", { n: week.lessons }, CATEGORY)}
            </span>
            <span data-moved-up={week.movedUp}>
              {copy(language, "parent_week_moved_up", { n: week.movedUp }, CATEGORY)}
            </span>
            {week.attention === null ? (
              <span className="text-jw-ink-soft" data-attention="none">
                {copy(language, "parent_week_no_report", {}, CATEGORY)}
              </span>
            ) : (
              <span data-attention={week.attention}>
                {copy(language, "parent_week_attention", { n: week.attention }, CATEGORY)}
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
