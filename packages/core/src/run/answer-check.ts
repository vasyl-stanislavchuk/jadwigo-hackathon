import type { RunEvent } from "@jadwigo/contracts/run";

/**
 * The answer check (`dl-z5ja.26`, wave 2 lead decision 23): before the runner writes an agent
 * `message`, every status word in its text must be one a `tool_result` of the same turn gave,
 * every number one a `tool_result` gave or the parent wrote in that turn, and it names no mastery
 * level in any language. Code computes every number, status and
 * level; the model only words them. On a miss the runner asks Muse to correct the message once,
 * then writes an `error` event. Pure: the caller passes the turn's events.
 *
 * The model is `apps/api/src/narrative.ts`'s `narrativeProblems`, the report narrative's check.
 */

/**
 * The closed vocabulary code assigns and the model may only repeat: a goal's `GoalProgress` and a
 * brief entry's `why` (`packages/contracts/src/records.ts`). `not_started` is a level name too:
 * it passes only when a tool result of the turn gave the code, as a goal's status (lead's call on
 * `dl-z5ja.26`), and is refused otherwise like every level name.
 */
export type StatusWord =
  | "not_started"
  | "needs_attention"
  | "on_its_way"
  | "good"
  | "review_due"
  | "prerequisites_met"
  | "second_day_owed"
  | "school_tag";

/** What the message says that no tool result of its turn gave (nor the parent, for a number). */
export type AnswerMiss =
  /** A number, as written in the message. */
  | { kind: "number"; said: string }
  /** A status word, as written, and the code it words. */
  | { kind: "status"; said: string; code: StatusWord }
  /** A mastery level name: refused even when a tool result holds it. */
  | { kind: "level"; said: string };

/**
 * A word stands alone: a letter, digit or underscore on either side makes it another word. Each
 * code matches as written (`on_its_way`), with any run of whitespace (a newline, a no-break space)
 * or hyphens for its underscores, and as the
 * parent reads it in `pl` and `en` (`packages/copy`, the `parent_goal_status_*` keys). `good`
 * matches only as "going well" and "idzie dobrze": the bare word is everyday English.
 */
const STATUS: readonly [StatusWord, RegExp][] = [
  [
    "not_started",
    words(
      String.raw`not[\s_-]+(?:yet[\s_-]+)?started|nie\s*rozpocz\p{L}*|nierozpocz\p{L}*|jeszcze\s+nie\s+zacz\p{L}*`,
    ),
  ],
  ["needs_attention", words(String.raw`needs?[\s_-]+attention|potrzebuj\p{L}*\s+uwagi`)],
  ["on_its_way", words(String.raw`on[\s_-]+its[\s_-]+way|w\s+drodze`)],
  ["good", words(String.raw`going\s+well|idzie\s+dobrze`)],
  ["review_due", words(String.raw`review[\s_-]+due`)],
  ["prerequisites_met", words(String.raw`prerequisites[\s_-]+met`)],
  ["second_day_owed", words(String.raw`second[\s_-]+day[\s_-]+owed`)],
  ["school_tag", words(String.raw`school[\s_-]+tag`)],
];

/**
 * The level names (`MasteryLevel`) and their Polish forms, any case. A mirror of `LEVEL` in
 * `apps/api/src/narrative.ts` and `apps/cli/evals/report/narrative_check.py`: a widened stem goes
 * into all 3 (`dl-e8ov.5.64`). Here `not started` and its Polish forms are not in it: they are
 * the status word `not_started` above, which a tool result may give (lead's call on `dl-z5ja.26`).
 * The other 2 still refuse them always.
 */
const LEVEL = words(
  String.raw`mastered|proficient|proficiency|familiar|attempted|opanow\p{L}*|biegł\p{L}*|biegl\p{L}*|zaznajom\p{L}*|podję\p{L}*\s+prób\p{L}*|podjet\p{L}*\s+prob\p{L}*|próbowan\p{L}*`,
);

/**
 * A number: digits, with a decimal point or a Polish decimal comma. Known and accepted for now
 * (steward's notes on PR #454): a comma always reads as a decimal, so "1,000" is 1 and "3,12" is
 * 3.12; a sign is dropped, so "-3" is 3; and digit runs inside an id or an ISO timestamp a tool
 * gave count as given, so a message may repeat any of them.
 */
const NUMBER = /\d+(?:[.,]\d+)?/g;

function words(alternatives: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternatives})(?![\\p{L}\\p{N}_])`, "giu");
}

/**
 * The numbers and status words in `text` that the turn did not give, and every level name it
 * holds, in the order they appear, each once. Empty when the message may be written.
 *
 * A tool result gives what its `output` and `view.data` hold anywhere: each number, each array's
 * length (a draft of 8 questions gives 8), each number written inside a string (an id, a step
 * label), and each string as a status code. A failed result (`output` null) gives nothing.
 *
 * The parent gives numbers, never status words: each number in the text of the turn's parent
 * `message` events and in its `steer` events (text and `question_ids`). A parent who asks for 5
 * questions and hears "Done: 5 questions now" hears an echo, not a claim about the child: "if you
 * didn't query it, don't claim it" (lead's call on `dl-z5ja.26`). A status word only the parent
 * wrote is still a miss: code assigns it.
 */
export function checkAnswer(text: string, turn: readonly RunEvent[]): AnswerMiss[] {
  const given = { numbers: new Set<number>(), strings: new Set<string>() };
  for (const event of turn) {
    if (event.type === "message" && event.payload.from === "parent") {
      numbersIn(event.payload.text, given.numbers);
    } else if (event.type === "steer") {
      numbersIn(event.payload.text, given.numbers);
      for (const id of event.payload.question_ids ?? []) numbersIn(id, given.numbers);
    }
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

function numbersIn(text: string, into: Set<number>): void {
  for (const digits of text.match(NUMBER) ?? []) into.add(numberOf(digits));
}

function numberOf(written: string): number {
  return Number(written.replace(",", "."));
}

function collect(value: unknown, given: { numbers: Set<number>; strings: Set<string> }): void {
  if (typeof value === "number") given.numbers.add(Math.abs(value));
  else if (typeof value === "string") {
    given.strings.add(value);
    numbersIn(value, given.numbers);
  } else if (Array.isArray(value)) {
    given.numbers.add(value.length);
    for (const inner of value) collect(inner, given);
  } else if (value !== null && typeof value === "object") {
    for (const inner of Object.values(value)) collect(inner, given);
  }
}
