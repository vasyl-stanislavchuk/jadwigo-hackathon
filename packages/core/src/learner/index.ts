import type {
  AnswerValue,
  AttemptAnswer,
  AttemptId,
  Brief,
  BriefEntry,
  BriefList,
  Citation,
  CurriculumTopicRow,
  GoalId,
  LearnerAttempt,
  LearnerMissedQuestion,
  LearnerMistake,
  LearnerReport,
  LearnerWeekCounts,
  LearnerWeekLesson,
  LessonIdea,
  SkillId,
} from "@jadwigo/contracts";
import type { Catalogue } from "../curriculum/index.ts";
import { rank } from "../mastery/fold.ts";
import type { GoalWithSkills } from "../mastery/types.ts";

/**
 * The learner query functions the engine's learner verbs run (dl-z5ja.25): pure reads of one
 * learner's record, each answer a shape of `@jadwigo/contracts`' tool views. What they may say is
 * the owner's answer on dl-z5ja.27: everything the record holds, each claim cited, and never a
 * level, a score, a comparison or a diagnosis. So none answers a `MasteryLevel`, a ratio or a
 * percentage: a level is read here only to tell whether a skill moved forward.
 */

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const skillCite = (skill_code: SkillId): Citation => ({ kind: "skill", skill_code });
const goalCite = (goal_id: GoalId): Citation => ({ kind: "goal", goal_id });
const attemptCite = (attempt_id: AttemptId): Citation => ({ kind: "attempt", attempt_id });

/** The most ideas `lessonIdeas` offers, and the most skills one idea holds. */
export const MAX_IDEAS = 3;
export const SKILLS_PER_IDEA = 3;

/** The brief's lists in the order an idea is offered: teach again first, school's never (code holds none yet). */
const IDEA_LISTS: readonly BriefList[] = ["reteach", "review", "recheck", "new"];

/**
 * Up to 3 ideas for the next lesson, read from the brief alone. An idea is one list of the brief
 * for one set of goals: its skills in brief order, at most 3 (a longer run gives the next idea),
 * the goals they serve and why code put them there, cited by skill and goal. Lists come in the
 * order teach again, review, check again, new, and goals in the order the brief first names them.
 * No entry, no idea.
 */
export function lessonIdeas(brief: Brief): LessonIdea[] {
  const ideas: LessonIdea[] = [];
  for (const list of IDEA_LISTS) {
    const groups = new Map<string, BriefEntry[]>();
    for (const e of brief.entries) {
      if (e.list !== list) continue;
      const key = e.goal_ids.join(" ");
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
    for (const entries of groups.values()) {
      for (let i = 0; i < entries.length; i += SKILLS_PER_IDEA) {
        const chunk = entries.slice(i, i + SKILLS_PER_IDEA);
        const first = chunk[0];
        if (first === undefined || ideas.length >= MAX_IDEAS) return ideas;
        const skill_codes = chunk.map((e) => e.skill_code);
        const goal_ids = [...first.goal_ids];
        ideas.push({
          id: `i${ideas.length + 1}`,
          list,
          why: first.why,
          skill_codes,
          goal_ids,
          citations: [...skill_codes.map(skillCite), ...goal_ids.map(goalCite)],
        });
      }
    }
  }
  return ideas;
}

/** The catalogue codes a brief entry or a goal names, once each, in the order first named. */
export function namedCodes(
  goals: readonly { skill_codes: readonly SkillId[] }[],
  entries: readonly BriefEntry[],
): SkillId[] {
  return [
    ...new Set([...goals.flatMap((g) => g.skill_codes), ...entries.map((e) => e.skill_code)]),
  ];
}

const DAY_MS = 86_400_000;
const WARSAW = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Warsaw",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The Monday of the Warsaw week `at` falls in, `YYYY-MM-DD`. */
export function mondayOf(at: string | Date): string {
  const day = new Date(`${WARSAW.format(new Date(at))}T00:00:00.000Z`);
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - sinceMonday * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The last `count` Warsaw weeks up to the one `now` falls in, oldest first, as the parent's week
 * strip counts them (apps/web's `weeksOf`, dl-e8ov.5.7): lessons played, skills that moved forward
 * by the reports' digests (each once a week, in its attempt's week), and what needed attention by
 * the week's newest report, null for a week no report ended in. With them, the real lessons played
 * in those weeks, newest first. Counts only, never a percentage.
 */
export function learnerWeeks(
  attempts: readonly LearnerAttempt[],
  reports: readonly LearnerReport[],
  now: Date,
  count: number,
): { weeks: LearnerWeekCounts[]; lessons: LearnerWeekLesson[] } {
  const last = new Date(`${mondayOf(now)}T00:00:00.000Z`).getTime();
  const weeks: LearnerWeekCounts[] = Array.from({ length: count }, (_, i) => ({
    monday: new Date(last - (count - 1 - i) * 7 * DAY_MS).toISOString().slice(0, 10),
    lessons: 0,
    moved_up: 0,
    attention: null,
  }));
  const byMonday = new Map(weeks.map((week) => [week.monday, week]));

  const real = attempts.filter((a) => a.attempt.mode === "real");
  const startedAt = new Map<AttemptId, string>();
  const lessons: LearnerWeekLesson[] = [];
  for (const { attempt, title, language, results } of real) {
    startedAt.set(attempt.id, attempt.started_at);
    const week = byMonday.get(mondayOf(attempt.started_at));
    if (week === undefined) continue;
    week.lessons += 1;
    lessons.push({
      attempt_id: attempt.id,
      title,
      language,
      started_at: attempt.started_at,
      finished: attempt.finished_at !== null,
      questions: results.length,
    });
  }
  lessons.sort(
    (a, b) => compare(b.started_at, a.started_at) || compare(a.attempt_id, b.attempt_id),
  );

  const moved = new Map<string, Set<SkillId>>();
  for (const report of reports) {
    for (const move of report.digest.skills_moved) {
      if (rank(move.to) <= rank(move.from)) continue;
      const monday = mondayOf(startedAt.get(move.attempt_id) ?? report.period_ends_at);
      const codes = moved.get(monday) ?? new Set<SkillId>();
      codes.add(move.skill_code);
      moved.set(monday, codes);
    }
  }
  for (const [monday, codes] of moved) {
    const week = byMonday.get(monday);
    if (week) week.moved_up = codes.size;
  }

  const newestFirst = [...reports].sort((a, b) => compare(b.period_ends_at, a.period_ends_at));
  for (const report of newestFirst) {
    const week = byMonday.get(mondayOf(report.period_ends_at));
    if (week && week.attention === null) week.attention = report.digest.needs_attention.length;
  }
  return { weeks, lessons };
}

/** A child's answer as the text they gave: what they typed or said, or the options they chose. */
export function answerText(value: AnswerValue): string {
  if ("entered" in value) return value.entered;
  if ("text" in value) return value.text;
  if ("chosen" in value) return value.chosen.join(", ");
  return JSON.stringify(value);
}

/**
 * The questions a learner missed or skipped, newest attempt first and in `seq` order within one,
 * at most `limit`: a question is missed when its first try was not right, it carries a mistake
 * class, or it was skipped. Each holds the child's own answers as text, in try order, from
 * `answers` (an attempt the caller could not read has none). With them, each mistake class over
 * every missed question (not only the `limit` shown): how many questions made it, most first, cited
 * by the attempts it was made in.
 */
export function learnerMistakes(
  attempts: readonly LearnerAttempt[],
  answers: ReadonlyMap<AttemptId, readonly AttemptAnswer[]>,
  limit: number,
): { mistakes: LearnerMistake[]; questions: LearnerMissedQuestion[] } {
  const missed: LearnerMissedQuestion[] = [];
  for (const { attempt, results } of attempts) {
    if (attempt.mode !== "real") continue;
    const given = answers.get(attempt.id) ?? [];
    for (const r of [...results].sort((a, b) => a.seq - b.seq)) {
      const skipped = r.skip_reason !== null;
      if (r.first_try_correct && r.mistake_classes.length === 0 && !skipped) continue;
      missed.push({
        attempt_id: attempt.id,
        seq: r.seq,
        say: r.say,
        mistake_classes: [...r.mistake_classes].sort(compare),
        tries: r.tries,
        skipped,
        answers: given
          .filter((a) => a.seq === r.seq && a.kind === "try" && a.value !== null)
          .sort((a, b) => a.try_no - b.try_no)
          .flatMap((a) => (a.value === null ? [] : [answerText(a.value)])),
      });
    }
  }

  const byClass = new Map<string, { times: number; attempts: Set<AttemptId> }>();
  for (const q of missed) {
    for (const mistake_class of q.mistake_classes) {
      const entry = byClass.get(mistake_class) ?? { times: 0, attempts: new Set<AttemptId>() };
      entry.times += 1;
      entry.attempts.add(q.attempt_id);
      byClass.set(mistake_class, entry);
    }
  }
  const mistakes = [...byClass.entries()]
    .sort(([a, x], [b, y]) => y.times - x.times || compare(a, b))
    .map(([mistake_class, e]) => ({
      mistake_class,
      times: e.times,
      citations: [...e.attempts].sort(compare).map(attemptCite),
    }));
  return { mistakes, questions: missed.slice(0, limit) };
}

/**
 * The curriculum's topics whose code, area or text holds any of `words` (every topic for none),
 * each with the catalogue skills under it, an alias counting as its skill, and the learner's goals
 * that hold any of them, in the curriculum's order.
 */
export function curriculumTopics(
  catalogue: Catalogue,
  words: readonly string[],
  goals: readonly GoalWithSkills[],
): CurriculumTopicRow[] {
  const needles = words.map((w) => w.trim().toLowerCase()).filter((w) => w !== "");
  return catalogue.topics
    .filter(
      (t) =>
        needles.length === 0 ||
        needles.some((w) => `${t.code} ${t.area} ${t.text}`.toLowerCase().includes(w)),
    )
    .map((t) => {
      const under = catalogue.skills.filter((s) => s.topic_code === t.code);
      const known = new Set(under.flatMap((s) => [s.code, ...s.aliases]));
      return {
        code: t.code,
        area: t.area,
        text: t.text,
        skill_codes: under.map((s) => s.code),
        goal_ids: goals
          .filter((g) => g.skill_codes.some((c) => known.has(c)))
          .map((g) => g.goal.id)
          .sort(compare),
      };
    });
}
