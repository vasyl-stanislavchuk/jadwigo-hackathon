import type { AttemptId, MasteryLevel, SkillKind } from "@jadwigo/contracts";
import { warsawDay } from "./days.ts";
import { AGAIN, GOOD, HARD, type Review, replay } from "./fsrs.ts";
import type { SkillEvent, SkillMastery } from "./types.ts";

/**
 * What one question did for one skill, decided by its first try: right without help, right with
 * help, wrong (a held-verdict miss included), or only skipped.
 */
type Outcome = "clean" | "assisted" | "miss" | "skip";

/** One (attempt, seq) of one skill, as the level machine reads it. */
interface Happening {
  readonly attempt_id: AttemptId;
  readonly seq: number;
  readonly outcome: Outcome;
  readonly at: string;
  readonly ms: number;
  readonly mixed: boolean;
}

const LEVELS: readonly MasteryLevel[] = [
  "not_started",
  "attempted",
  "familiar",
  "proficient",
  "mastered",
];

/** A level's rank, so "never lowers" and "one level down" are arithmetic. */
export function rank(level: MasteryLevel): number {
  return LEVELS.indexOf(level);
}

function oneDown(level: MasteryLevel): MasteryLevel {
  return LEVELS[Math.max(rank("attempted"), rank(level) - 1)] ?? "attempted";
}

const WORST: Readonly<Record<Exclude<Outcome, "skip">, number>> = {
  clean: 0,
  assisted: 1,
  miss: 2,
};

function byTime(a: { ms: number; attempt_id: string }, b: { ms: number; attempt_id: string }) {
  return a.ms - b.ms || (a.attempt_id < b.attempt_id ? -1 : a.attempt_id > b.attempt_id ? 1 : 0);
}

/**
 * One happening per (attempt, seq), in answered order. The first judged try decides; a question
 * with only skip rows is a skip; a try the view left unjudged decides nothing.
 */
export function happenings(events: readonly SkillEvent[]): Happening[] {
  const groups = new Map<string, SkillEvent[]>();
  for (const event of events) {
    const key = `${event.attempt_id}#${event.seq}`;
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [event]);
    else group.push(event);
  }
  const out: Happening[] = [];
  for (const group of groups.values()) {
    const tries = group
      .filter((e) => e.kind === "try" && e.correct !== null)
      .sort((a, b) => a.try_no - b.try_no || Date.parse(a.answered_at) - Date.parse(b.answered_at));
    const first = tries[0];
    if (first !== undefined) {
      const outcome: Outcome =
        first.correct === true ? (first.help_used === 0 ? "clean" : "assisted") : "miss";
      out.push(happening(first, outcome));
      continue;
    }
    const skip = group
      .filter((e) => e.kind === "skip")
      .sort((a, b) => Date.parse(a.answered_at) - Date.parse(b.answered_at))[0];
    if (skip !== undefined) out.push(happening(skip, "skip"));
  }
  return out.sort((a, b) => byTime(a, b) || a.seq - b.seq);
}

function happening(event: SkillEvent, outcome: Outcome): Happening {
  return {
    attempt_id: event.attempt_id,
    seq: event.seq,
    outcome,
    at: event.answered_at,
    ms: Date.parse(event.answered_at),
    mixed: event.mixed,
  };
}

/**
 * The level after `happenings`, in order (decision 2026-10-22 point 6, ruling 58): any non-skip
 * event lifts not_started to attempted, then applies. A clean lifts attempted to familiar,
 * familiar to proficient once the cleans since the last miss fall on 2 Warsaw days, and proficient
 * to mastered on a clean in a mixed attempt 2 or more Warsaw days after proficient (accuracy
 * skills only). A miss drops one level, never below attempted, at most once per attempt; a drop
 * to proficient restarts the 2 days. Assisted and skip change nothing.
 */
function levelOf(all: readonly Happening[], kind: SkillKind): MasteryLevel {
  return levelSteps(all, kind).at(-1)?.level ?? "not_started";
}

/** One step of the level machine: the happening, the level after it, and whether it dropped. */
export interface LevelStep {
  readonly happening: Happening;
  readonly level: MasteryLevel;
  readonly dropped: boolean;
}

/** The level after each happening in turn, under `levelOf`'s rules. */
export function levelSteps(all: readonly Happening[], kind: SkillKind): LevelStep[] {
  const steps: LevelStep[] = [];
  let level: MasteryLevel = "not_started";
  const cleanDays = new Set<number>();
  let proficientDay = 0;
  const dropped = new Set<AttemptId>();
  for (const h of all) {
    if (h.outcome === "skip") {
      steps.push({ happening: h, level, dropped: false });
      continue;
    }
    if (level === "not_started") level = "attempted";
    let drop = false;
    const day = warsawDay(h.at);
    if (h.outcome === "clean") {
      cleanDays.add(day);
      if (level === "attempted") level = "familiar";
      else if (level === "familiar" && cleanDays.size >= 2) {
        level = "proficient";
        proficientDay = day;
      } else if (
        level === "proficient" &&
        kind === "accuracy" &&
        h.mixed &&
        day - proficientDay >= 2
      ) {
        level = "mastered";
      }
    } else if (h.outcome === "miss") {
      cleanDays.clear();
      if (level !== "attempted" && !dropped.has(h.attempt_id)) {
        level = oneDown(level);
        dropped.add(h.attempt_id);
        drop = true;
        if (level === "proficient") proficientDay = day;
      }
    }
    steps.push({ happening: h, level, dropped: drop });
  }
  return steps;
}

/** Each attempt that judged the skill: its non-skip happenings, its worst one, its last answer. */
function attemptsOf(all: readonly Happening[], events: readonly SkillEvent[]) {
  const last = new Map<AttemptId, number>();
  for (const e of events) {
    const ms = Date.parse(e.answered_at);
    if (ms > (last.get(e.attempt_id) ?? Number.NEGATIVE_INFINITY)) last.set(e.attempt_id, ms);
  }
  const attempts = new Map<AttemptId, { worst: number; ms: number; at: string; judged: number }>();
  for (const h of all) {
    if (h.outcome === "skip") continue;
    const seen = attempts.get(h.attempt_id);
    const ms = last.get(h.attempt_id) ?? h.ms;
    attempts.set(h.attempt_id, {
      worst: Math.max(seen?.worst ?? 0, WORST[h.outcome]),
      ms,
      at: new Date(ms).toISOString(),
      judged: Math.max(seen?.judged ?? h.ms, h.ms),
    });
  }
  return [...attempts.entries()].map(([attempt_id, a]) => ({ attempt_id, ...a }));
}

const RATING = [GOOD, HARD, AGAIN] as const;

/** The whole row for one skill from its events alone: `now` reaches nothing in it. */
export function foldSkill(events: readonly SkillEvent[], kind: SkillKind): SkillMastery {
  const all = happenings(events);
  const attempts = attemptsOf(all, events);
  const latest = [...attempts]
    .sort((a, b) =>
      byTime(
        { ms: a.judged, attempt_id: a.attempt_id },
        { ms: b.judged, attempt_id: b.attempt_id },
      ),
    )
    .slice(-2);
  const reviews: Review[] = [...attempts]
    .sort(byTime)
    .map((a) => ({ at: a.at, rating: RATING[a.worst] ?? GOOD }));
  const card = replay(reviews);
  const tries = new Set(
    events.filter((e) => e.kind === "try").map((e) => `${e.attempt_id}#${e.seq}#${e.try_no}`),
  );
  let lastAnswered: SkillEvent | undefined;
  for (const e of events) {
    if (
      lastAnswered === undefined ||
      Date.parse(e.answered_at) > Date.parse(lastAnswered.answered_at)
    )
      lastAnswered = e;
  }
  return {
    level: levelOf(all, kind),
    needs_attention: latest.some((a) => a.worst === WORST.miss),
    tries: tries.size,
    last_answered_at: lastAnswered?.answered_at ?? null,
    due_at: card?.due ?? null,
    card,
  };
}
