/**
 * The week strip's counts (dl-e8ov.5.7): for each of the last weeks, Monday to Sunday in Warsaw,
 * the lessons the learner played, the skills that moved forward and the skills that needed
 * attention. Lessons come from the learner's attempts; the skills from the reports' digests. Counts
 * only, never a percentage (decision jadwigo-hackathon 2026-10-29-a-parent-sees-the-full-answer-
 * record-of-a-finished-lesson-and-th).
 */

import {
  type AttemptId,
  type LearnerAttempt,
  type LearnerReport,
  MasteryLevel,
} from "@jadwigo/contracts";

/** One week of the strip. `attention` is null for a week no report ended in. */
export interface WeekCounts {
  /** The week's Monday, `YYYY-MM-DD`. */
  monday: string;
  lessons: number;
  movedUp: number;
  attention: number | null;
}

const DAY_MS = 86_400_000;
const warsaw = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Monday of the Warsaw week `at` falls in, `YYYY-MM-DD`. */
export function mondayOf(at: string | Date): string {
  const day = new Date(`${warsaw.format(new Date(at))}T00:00:00.000Z`);
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - sinceMonday * DAY_MS).toISOString().slice(0, 10);
}

const rank = (level: MasteryLevel): number => MasteryLevel.options.indexOf(level);

/** The last `count` weeks up to the one `now` falls in, oldest first. */
export function weeksOf(
  attempts: readonly LearnerAttempt[],
  reports: readonly LearnerReport[],
  now: Date,
  count = 4,
): WeekCounts[] {
  const last = new Date(`${mondayOf(now)}T00:00:00.000Z`).getTime();
  const weeks: WeekCounts[] = Array.from({ length: count }, (_, i) => ({
    monday: new Date(last - (count - 1 - i) * 7 * DAY_MS).toISOString().slice(0, 10),
    lessons: 0,
    movedUp: 0,
    attention: null,
  }));
  const byMonday = new Map(weeks.map((week) => [week.monday, week]));

  const startedAt = new Map<AttemptId, string>();
  for (const { attempt } of attempts) {
    startedAt.set(attempt.id, attempt.started_at);
    const week = byMonday.get(mondayOf(attempt.started_at));
    if (week) week.lessons += 1;
  }

  // Reports overlap, so a skill that moved on one attempt is counted once, in that attempt's week,
  // and once a week however many times it moved.
  const moved = new Map<string, Set<string>>();
  for (const report of reports) {
    for (const move of report.digest.skills_moved) {
      if (rank(move.to) <= rank(move.from)) continue;
      const monday = mondayOf(startedAt.get(move.attempt_id) ?? report.period_ends_at);
      const codes = moved.get(monday) ?? new Set<string>();
      codes.add(move.skill_code);
      moved.set(monday, codes);
    }
  }
  for (const [monday, codes] of moved) {
    const week = byMonday.get(monday);
    if (week) week.movedUp = codes.size;
  }

  // Attention is a standing, not an event: the week's newest report says it.
  const newestFirst = [...reports].sort((a, b) => b.period_ends_at.localeCompare(a.period_ends_at));
  for (const report of newestFirst) {
    const week = byMonday.get(mondayOf(report.period_ends_at));
    if (week && week.attention === null) week.attention = report.digest.needs_attention.length;
  }
  return weeks;
}
