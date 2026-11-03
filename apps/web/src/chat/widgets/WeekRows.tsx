/**
 * learner_week in the widget frame (handoff dl-uukj.47.71 §4.3, s08): "Tydzień: {imię}", the weeks'
 * range and how many lessons, then one row per lesson played, newest first: its day, its topic and
 * how many questions it asked. The result bar and "{r} z {n} dobrze" join the row once the view
 * carries each lesson's right / help / miss (`dl-uukj.47.71.11`); until then the count stands alone.
 * Phone: the date column narrows and the count goes under the topic.
 */

import type { LearnerWeekView } from "@jadwigo/contracts";
import { copy, type Language } from "@jadwigo/copy";
import { CalendarDaysIcon } from "lucide-react";
import type { ReactElement } from "react";
import { RowsFrame } from "./WidgetFrame.tsx";

const DAY_MS = 86_400_000;

/** "pon 27": the lesson's weekday and day of month, on Polish time. */
function dayOf(iso: string, language: Language): string {
  const parts = new Intl.DateTimeFormat(language, {
    weekday: "short",
    day: "numeric",
    timeZone: "Europe/Warsaw",
  }).formatToParts(new Date(iso));
  const weekday = parts.find((p) => p.type === "weekday")?.value.replace(/\.$/, "") ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${weekday} ${day}`;
}

/** "27 paź – 2 lis · 4 lekcje": from the first Monday to the last week's Sunday. */
function metaOf(view: LearnerWeekView, language: Language): string | undefined {
  const first = view.weeks.at(0);
  const last = view.weeks.at(-1);
  if (first === undefined || last === undefined) return undefined;
  // A week's Monday is a plain date, so it is read and shown on UTC, never shifted by a zone.
  const date = new Intl.DateTimeFormat(language, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const from = date.format(new Date(`${first.monday}T00:00:00Z`));
  const to = date.format(new Date(Date.parse(`${last.monday}T00:00:00Z`) + 6 * DAY_MS));
  return copy(language, "chat_week_meta", { from, to, n: view.lessons.length }, "adult");
}

function Row({
  lesson,
  language,
}: {
  lesson: LearnerWeekView["lessons"][number];
  language: Language;
}): ReactElement {
  return (
    <div
      className="flex items-center gap-3 text-jw-page-body max-sm:items-start"
      data-week-lesson={lesson.attempt_id}
    >
      <span
        className="w-11 shrink-0 text-jw-page-small text-jw-ink-soft tabular-nums max-sm:w-10"
        data-day
      >
        {dayOf(lesson.started_at, language)}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-3 max-sm:flex-col max-sm:items-start max-sm:gap-0">
        <span className="min-w-0 flex-1 truncate text-jw-ink max-sm:w-full" data-topic>
          {lesson.title}
        </span>
        <span className="shrink-0 text-jw-page-small text-jw-ink-soft tabular-nums" data-count>
          {copy(language, "chat_week_questions", { n: lesson.questions }, "adult")}
        </span>
      </div>
    </div>
  );
}

export function WeekRows({
  view,
  language,
}: {
  view: LearnerWeekView;
  language: Language;
}): ReactElement {
  return (
    <RowsFrame
      verb="learner_week"
      icon={CalendarDaysIcon}
      title={copy(language, "chat_week_title", { name: view.learner.first_name }, "adult")}
      meta={metaOf(view, language)}
      language={language}
      rows={view.lessons.map((lesson) => ({
        key: lesson.attempt_id,
        element: <Row lesson={lesson} language={language} />,
      }))}
    />
  );
}
