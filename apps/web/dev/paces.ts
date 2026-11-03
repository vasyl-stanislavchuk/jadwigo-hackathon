/**
 * How the dev engine plays a turn for each chat state of the handoff (dl-uukj.47.71.7, §12 s01-s20),
 * so chat-spine.spec.ts and a person at /playground/workspace?pace=sNN see that state from the real
 * engine: `acceptMessage` and `drain` on ScriptedMuse, with no network and no paid call. Each pace is
 * a script for the model plus, at most, one thing that goes a particular way: a verb that never
 * answers (the turn holds there, still running), a verb that refuses its first call, a model call
 * that fails once (its step comes back as a retry), or a clock past the turn's max deadline.
 *
 * Dev only: these reach only the dev engine's /__engine routes (src/chat/wire.ts). Types only here,
 * since Vite loads this file with Node's type stripping (engine-plugin.ts says why).
 *
 * Not reachable from the scripted engine, so not here: s09b (the fixture bank has 3 sets, and
 * "+{n} więcej" needs 5), s08 (a learner widget needs a learner in the
 * dev store), s10 (the engine writes no approval_request), s19 (the dev page uploads no file), and
 * s20's day divider (every turn is written today). s17 and s18 are `slow` with a second message the
 * page sends mid-turn; s20 is the normal pace sent 3 times.
 */
import type { VerbName } from "@jadwigo/contracts/run";
import type { MuseRequest, ScriptedReply } from "@jadwigo/jadwigo-ai";
import type { Pace } from "../src/chat/wire.ts";

/** How the model "thinks" per call: long enough that a page sees a turn in progress. */
const THINK_MS = 400;
/** The same under `slow`: long enough to watch each step land, or to send a follow-up mid-turn. */
const SLOW_THINK_MS = 2000;
/** How many follow-ups a turn answers after its script, each an edit and a line. */
const FOLLOW_UPS = 10;

/** One pace: the model's script for one turn, and the one thing that goes its own way. */
export interface PacePlay {
  /** The model's replies, given the parent's latest words. */
  script(words: (request: MuseRequest) => string): ScriptedReply[];
  think_ms: number;
  /** The model never answers: the turn holds on its first call. */
  stall?: true;
  /** The `call`-th call of this verb in a turn (1-based) never answers: the turn holds, running. */
  hold?: { verb: VerbName; call: number };
  /** The first call of this verb in a turn is refused, as a verb refuses bad input; the model gets past it. */
  refuseOnce?: VerbName;
  /** The model's reply at this index (0-based) fails once, so its step is delivered again: a retry. */
  failOnce?: number;
  /** The turn's steps run on a clock past its max deadline, so the engine ends it failed. */
  pastMax?: true;
}

type Words = (request: MuseRequest) => string;
/** The parent's ask an edit of the bank's copy names (lesson_edit needs one). */
const WHY = "Rodzic prosi o prostsze podpowiedzi.";
type Call = NonNullable<ScriptedReply["tool_calls"]>[number];

const search = (words: Words, limit = 4): Call => ({
  verb: "question_search",
  input: (r) => ({ words: words(r), grade: "1", limit }),
});
const draft = (words: Words): Call => ({
  verb: "lesson_draft",
  input: (r) => ({ request: words(r), grade: "1", names: [], topic: words(r) }),
});
const check: Call = { verb: "lesson_check", input: (r) => ({ draft_id: r.run_id, help: {} }) };
const edit = (step_id: string, say: string): Call => ({
  verb: "lesson_edit",
  input: (r) => ({ draft_id: r.run_id, step_id, patch: { say }, why: WHY }),
});

/** What a turn answers to each follow-up that arrives mid-turn: an edit, then a line. */
const followUps = (words: Words): ScriptedReply[] =>
  Array.from({ length: FOLLOW_UPS }, (): ScriptedReply[] => [
    {
      tool_calls: [
        {
          verb: "lesson_edit",
          input: (r) => ({
            draft_id: r.run_id,
            step_id: "s01",
            patch: { say: words(r) },
            why: words(r),
          }),
        },
      ],
      cost_usd: 0.02,
    },
    { text: "Zmienione.", cost_usd: 0.01 },
  ]).flat();

/** The happy turn: draft, check, ready (s15; the page's first screen). */
const happy = (words: Words): ScriptedReply[] => [
  { tool_calls: [draft(words)], cost_usd: 0.02 },
  { tool_calls: [check], cost_usd: 0.02 },
  { text: "Lekcja jest gotowa.", cost_usd: 0.01 },
  ...followUps(words),
];

/** A plan turn: find, draft, check. Its sentences are the spine's now lines (D4). */
const planned = (words: Words): ScriptedReply[] => [
  { text: "Szukam zadań o tym w banku.", tool_calls: [search(words)], cost_usd: 0.02 },
  { text: "Układam lekcję z tych zadań.", tool_calls: [draft(words)], cost_usd: 0.02 },
  { tool_calls: [check], cost_usd: 0.02 },
  { text: "Lekcja jest gotowa.", cost_usd: 0.01 },
  ...followUps(words),
];

/**
 * The long turn (s06, s07, s09): find, draft, check, fix 2 hints, check a second time
 * ("drugi raz"), ready.
 */
const long = (words: Words): ScriptedReply[] => [
  { text: "Szukam zadań o tym w banku.", tool_calls: [search(words)], cost_usd: 0.02 },
  { text: "Układam lekcję z tych zadań.", tool_calls: [draft(words)], cost_usd: 0.02 },
  { tool_calls: [check], cost_usd: 0.02 },
  {
    text: "Poprawiam podpowiedzi w 2 zadaniach.",
    tool_calls: [edit("s01", "Policz na palcach."), edit("s03", "Zacznij od dziesiątki.")],
    cost_usd: 0.02,
  },
  { text: "Sprawdzam lekcję jeszcze raz.", tool_calls: [check], cost_usd: 0.02 },
  { text: "Lekcja jest gotowa.", cost_usd: 0.01 },
  ...followUps(words),
];

/**
 * s12, the handoff's own example: the question types cannot be read, so the lesson is built
 * without them. A failed question_types keeps its recovered line after the turn (S13,
 * chat_line_recovered_types), inside the search stage it joined.
 */
const typesRecovered = (words: Words): ScriptedReply[] => [
  { text: "Szukam zadań o tym w banku.", tool_calls: [search(words)], cost_usd: 0.02 },
  { tool_calls: [{ verb: "question_types", input: { grade: "1" } }], cost_usd: 0.02 },
  { text: "Układam lekcję z tych zadań.", tool_calls: [draft(words)], cost_usd: 0.02 },
  { tool_calls: [check], cost_usd: 0.02 },
  { text: "Lekcja jest gotowa.", cost_usd: 0.01 },
  ...followUps(words),
];

/**
 * An edit refused once, then the same edit goes through (s12-fixed): a refusal the agent fixed
 * shows nothing after the turn (dl-uukj.47.71.45, #847).
 */
const editFixed = (words: Words): ScriptedReply[] => [
  { tool_calls: [draft(words)], cost_usd: 0.02 },
  {
    text: "Poprawiam podpowiedź.",
    tool_calls: [edit("s01", "Policz na palcach.")],
    cost_usd: 0.02,
  },
  { tool_calls: [edit("s01", "Policz na palcach.")], cost_usd: 0.02 },
  { tool_calls: [check], cost_usd: 0.02 },
  { text: "Lekcja jest gotowa.", cost_usd: 0.01 },
  ...followUps(words),
];

/**
 * An edit refused once that the model then drops (s12-dropped): nothing fixes it and no check
 * passes after it, so it shows chat_line_failed_generic after the turn. Words only after the
 * refusal: the engine asks again when a turn ends on an unchecked lesson.
 */
const editDropped = (words: Words): ScriptedReply[] => [
  { tool_calls: [draft(words)], cost_usd: 0.02 },
  {
    text: "Poprawiam podpowiedź.",
    tool_calls: [edit("s01", "Policz na palcach.")],
    cost_usd: 0.02,
  },
  ...Array.from({ length: FOLLOW_UPS }, () => ({
    text: "Zostawiam to zadanie bez zmian.",
    cost_usd: 0.01,
  })),
];

/**
 * A turn whose last check fails (s16): a harsh word in a step, which the check finds. The engine
 * asks the model again after a check that is not publishable, so every reply after it is words
 * only: an edit there would make the card read the check as stale and drop its findings.
 */
const needsFixing = (words: Words): ScriptedReply[] => [
  { tool_calls: [draft(words)], cost_usd: 0.02 },
  { tool_calls: [edit("s01", "Źle! Policz jeszcze raz.")], cost_usd: 0.02 },
  { tool_calls: [check], cost_usd: 0.02 },
  ...Array.from({ length: FOLLOW_UPS }, () => ({
    text: "Lekcja ma jedno zadanie do poprawy.",
    cost_usd: 0.01,
  })),
];

const NORMAL: PacePlay = { script: happy, think_ms: THINK_MS };
const SLOW: PacePlay = { script: happy, think_ms: SLOW_THINK_MS };
const STALL: PacePlay = { script: happy, think_ms: THINK_MS, stall: true };
const FAIL: PacePlay = { script: happy, think_ms: THINK_MS, pastMax: true };
/** The draft never answers: the find stage done, the draft running, the check to come. */
const DRAFTING: PacePlay = {
  script: planned,
  think_ms: THINK_MS,
  hold: { verb: "lesson_draft", call: 1 },
};
const LONG: PacePlay = { script: long, think_ms: THINK_MS };

/** Each pace's play; `null` is the page with no `?pace=`. */
const PLAYS: Readonly<Record<Pace | "normal", PacePlay>> = {
  normal: NORMAL,
  slow: SLOW,
  stall: STALL,
  fail: FAIL,
  s01: STALL,
  s02: STALL,
  s03: DRAFTING,
  // s04 and s05 are s03 with the page's clock 25 s and 65 s past the last event.
  s04: DRAFTING,
  s05: DRAFTING,
  s06: { script: long, think_ms: THINK_MS, hold: { verb: "lesson_check", call: 2 } },
  s07: LONG,
  s09: LONG,
  s11: {
    script: planned,
    think_ms: THINK_MS,
    failOnce: 2,
    // Held on a lane that redelivers, so about a minute later the check is tried once more.
    hold: { verb: "lesson_check", call: 1 },
  },
  s12: { script: typesRecovered, think_ms: THINK_MS, refuseOnce: "question_types" },
  "s12-fixed": { script: editFixed, think_ms: THINK_MS, refuseOnce: "lesson_edit" },
  "s12-dropped": { script: editDropped, think_ms: THINK_MS, refuseOnce: "lesson_edit" },
  s13: FAIL,
  // s14: the lesson drafted, its check running, then stopped by the parent's Esc.
  s14: { script: planned, think_ms: THINK_MS, hold: { verb: "lesson_check", call: 1 } },
  s15: NORMAL,
  s16: { script: needsFixing, think_ms: THINK_MS },
  s17: SLOW,
  s18: SLOW,
  s20: NORMAL,
};

/** The play for a pace; the normal one when there is none. */
export const playOf = (pace: Pace | null): PacePlay => PLAYS[pace ?? "normal"];
