import type { RunEvent } from "@jadwigo/contracts/run";

/**
 * The answer check (`dl-z5ja.26`, wave 2 lead decision 23): before the runner writes an agent
 * `message`, every number and status word in its text must be one a `tool_result` of the same turn
 * gave, and it names no mastery level in any language. Code computes every number, status and
 * level; the model only words them. On a miss the runner asks Muse to correct the message once,
 * then writes an `error` event. Pure: the caller passes the turn's events.
 *
 * The model is `apps/api/src/narrative.ts`'s `narrativeProblems`, the report narrative's check.
 */

/**
 * The closed vocabulary code assigns and the model may only repeat: a goal's `GoalProgress` and a
 * brief entry's `why` (`packages/contracts/src/records.ts`). `not_started` is a level name too, so
 * `LEVEL` refuses it in every form whatever a tool gave.
 */
export type StatusWord =
  | "needs_attention"
  | "on_its_way"
  | "good"
  | "review_due"
  | "prerequisites_met"
  | "second_day_owed"
  | "school_tag";

/** What the message says that no tool result of its turn gave. */
export type AnswerMiss =
  /** A number, as written in the message. */
  | { kind: "number"; said: string }
  /** A status word, as written, and the code it words. */
  | { kind: "status"; said: string; code: StatusWord }
  /** A mastery level name: refused even when a tool result holds it. */
  | { kind: "level"; said: string };

/**
 * A word stands alone: a letter, digit or underscore on either side makes it another word. Each
 * code matches as written (`on_its_way`), with spaces or hyphens for its underscores, and as the
 * parent reads it in `pl` and `en` (`packages/copy`, the `parent_goal_status_*` keys). `good`
 * matches only as "going well" and "idzie dobrze": the bare word is everyday English.
 */
const STATUS: readonly [StatusWord, RegExp][] = [
  ["needs_attention", words(String.raw`needs?[ _-]attention|potrzebuj\p{L}*\s+uwagi`)],
  ["on_its_way", words(String.raw`on[ _-]its[ _-]way|w\s+drodze`)],
  ["good", words(String.raw`going\s+well|idzie\s+dobrze`)],
  ["review_due", words("review[ _-]due")],
  ["prerequisites_met", words("prerequisites[ _-]met")],
  ["second_day_owed", words("second[ _-]day[ _-]owed")],
  ["school_tag", words("school[ _-]tag")],
];

/**
 * The level names (`MasteryLevel`) and their Polish forms, any case. A mirror of `LEVEL` in
 * `apps/api/src/narrative.ts` and `apps/cli/evals/report/narrative_check.py`: a widened stem goes
 * into all 3 (`dl-e8ov.5.64`).
 */
const LEVEL = words(
  String.raw`mastered|proficient|proficiency|familiar|attempted|not[ _-]started|opanow\p{L}*|biegł\p{L}*|biegl\p{L}*|zaznajom\p{L}*|nie\s*rozpocz\p{L}*|nierozpocz\p{L}*|podję\p{L}*\s+prób\p{L}*|podjet\p{L}*\s+prob\p{L}*|próbowan\p{L}*`,
);

/** A number: digits, with a decimal point or a Polish decimal comma. */
const NUMBER = /\d+(?:[.,]\d+)?/g;

function words(alternatives: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternatives})(?![\\p{L}\\p{N}_])`, "giu");
}

/**
 * The numbers and status words in `text` that no `tool_result` in `turn` gave, and every level
 * name it holds, in the order they appear, each once. Empty when the message may be written.
 *
 * A tool result gives what its `output` and `view.data` hold anywhere: each number, each array's
 * length (a draft of 8 questions gives 8), each number written inside a string (an id, a step
 * label), and each string as a status code. A failed result (`output` null) gives nothing.
 */
export function checkAnswer(text: string, turn: readonly RunEvent[]): AnswerMiss[] {
  const given = { numbers: new Set<number>(), strings: new Set<string>() };
  for (const event of turn) {
    if (event.type !== "tool_result" || event.payload.output === null) continue;
    collect(event.payload.output, given);
    if (event.payload.view !== undefined) collect(event.payload.view.data, given);
  }
  const found: { at: number; miss: AnswerMiss }[] = [];
  for (const match of text.matchAll(NUMBER)) {
    if (!given.numbers.has(numberOf(match[0]))) {
      found.push({ at: match.index, miss: { kind: "number", said: match[0] } });
    }
  }
  for (const [code, pattern] of STATUS) {
    if (given.strings.has(code)) continue;
    for (const match of text.matchAll(pattern)) {
      found.push({ at: match.index, miss: { kind: "status", said: match[0], code } });
    }
  }
  for (const match of text.matchAll(LEVEL)) {
    found.push({ at: match.index, miss: { kind: "level", said: match[0] } });
  }
  const seen = new Set<string>();
  return found
    .sort((a, b) => a.at - b.at)
    .map((f) => f.miss)
    .filter((miss) => {
      const key = `${miss.kind}:${miss.said.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function numberOf(written: string): number {
  return Number(written.replace(",", "."));
}

function collect(value: unknown, given: { numbers: Set<number>; strings: Set<string> }): void {
  if (typeof value === "number") given.numbers.add(Math.abs(value));
  else if (typeof value === "string") {
    given.strings.add(value);
    for (const digits of value.match(NUMBER) ?? []) given.numbers.add(numberOf(digits));
  } else if (Array.isArray(value)) {
    given.numbers.add(value.length);
    for (const inner of value) collect(inner, given);
  } else if (value !== null && typeof value === "object") {
    for (const inner of Object.values(value)) collect(inner, given);
  }
}
