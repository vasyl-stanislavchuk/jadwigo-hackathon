/**
 * The learner's calendar: a day is a Europe/Warsaw calendar day, whatever zone the machine runs
 * in (ruling 58's "2 different days"). A constant here, never the machine's zone and never the
 * pod's: `pod.time_zone` was dropped (jadwigo-hackathon notes, mastery caching).
 */
export const LEARNER_TIME_ZONE = "Europe/Warsaw";

const DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: LEARNER_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const MS_PER_DAY = 86_400_000;

/** The Warsaw calendar date of an instant, as `YYYY-MM-DD`. */
export function warsawDate(at: string): string {
  return DAY_FORMAT.format(new Date(at));
}

/** The Warsaw calendar day of an instant as a day number, so 2 days' distance is a subtraction. */
export function warsawDay(at: string): number {
  return Math.round(Date.parse(`${warsawDate(at)}T00:00:00Z`) / MS_PER_DAY);
}
