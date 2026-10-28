/**
 * The lesson player's state: one attempt, played question by question as the server asks them
 * (dl-5ssh.3.1). Ported from david-learns frontend/src/runner/reducer.ts (dl-e8ov.2.32.7) and cut
 * to what a v0 attempt has: questions only, no material steps, no voice, and no solution read from
 * a key the page never holds.
 *
 * The server owns the course (RULES.md rule 21). A reply's `next` is the whole next question, so
 * the page never guesses what comes after one: it holds `next` until the child moves on, then
 * shows it. When a reply ends a question but names no next one and the attempt is not finished,
 * the page re-reads the snapshot (`resyncing`), which is the source runner's resync-on-unknown-next
 * rule; a refused answer that says the page is behind (a conflict, a try out of order) does the
 * same.
 *
 * What the child sees after each answer follows the source runner:
 *   right             praise, and Dalej waits for the child
 *   a miss            try again on the same question, its marked parts kept
 *   ended otherwise   a moved-on line for a beat, then the next question on its own: "Not sure
 *                     yet", rung 4's twin, or any answer while verdicts are held, which is always
 *                     neutral (decision 2026-10-28-while-verdicts-are-held-every-answer-reply-is-neutral-the-one-th)
 */

import type {
  AttemptAnswerResult,
  AttemptSnapshot,
  HelpResult,
  PageAttemptQuestion,
  PartMark,
  ReleasedHelp,
} from "@jadwigo/contracts";
import type { CopyKey } from "@jadwigo/copy";
import type { Feedback, pageHelpOf } from "@jadwigo/lesson-kit";

/** The help note as the stage draws it (lesson-kit's PageHelp). */
type PageHelp = ReturnType<typeof pageHelpOf>;

/** The pause after a moved-on line before the next question shows, as in the source runner. */
export const BEAT_MS = 1200;

/** What follows the question on screen, once the child moves on. */
type Next =
  | { kind: "question"; question: PageAttemptQuestion }
  | { kind: "finished" }
  | { kind: "resync" };

export interface RunnerState {
  /** Every question asked so far, in `seq` order. */
  questions: PageAttemptQuestion[];
  /** The question on screen, or null once nothing is open. */
  seq: number | null;
  /**
   * live: answering. sending: a try or a skip is on its way. feedback: praise, waiting for Dalej.
   * beat: a moved-on line, moving on by itself. resyncing: re-reading the snapshot.
   * finished: the attempt is over.
   */
  phase: "live" | "sending" | "feedback" | "beat" | "resyncing" | "finished";
  feedback: Feedback | null;
  /** The try about to be sent on the question on screen: its tries so far, plus one. */
  attemptNo: number;
  help: PageHelp | null;
  helpRefused: boolean;
  workedSolution: string[] | null;
  next: Next | null;
  /** Which praise and try-again line comes next; both cycle (copy LIST_KEYS). */
  counts: { praise: number; try_again: number };
}

export type RunnerAction =
  | { type: "loaded"; snapshot: AttemptSnapshot }
  | { type: "sending" }
  | { type: "answered"; result: AttemptAnswerResult }
  | { type: "reopen" }
  | { type: "help"; result: HelpResult }
  | { type: "advance" }
  | { type: "resync" };

/** One released rung as the stage draws it. */
function pageHelp(released: ReleasedHelp, more: boolean): PageHelp {
  return {
    rung: released.rung,
    card:
      released.card === null
        ? null
        : {
            text: released.card.text,
            ...(released.card.picture === undefined ? {} : { picture: released.card.picture }),
          },
    focus: released.focus.length > 0 ? released.focus : null,
    given: released.given,
    worked: released.worked,
    blank: released.blank,
    twin: null,
    more,
    hints:
      released.hints.length > 0
        ? released.hints.map((h) => ({
            text: h.text,
            ...(h.pictures === undefined ? {} : { pictures: h.pictures }),
          }))
        : null,
  };
}

/** A question's help note on arrival: the last rung it has had released, so a reload shows it. */
function helpOf(question: PageAttemptQuestion | undefined): PageHelp | null {
  const last = question?.help.at(-1);
  return last === undefined ? null : pageHelp(last, true);
}

const fresh = {
  feedback: null,
  helpRefused: false,
  workedSolution: null,
  next: null,
} as const;

/** Show the question with `seq`: fresh, its tries and released help carried over. */
function show(
  state: RunnerState,
  questions: PageAttemptQuestion[],
  seq: number | null,
): RunnerState {
  if (seq === null)
    return { ...state, ...fresh, questions, seq: null, phase: "finished", help: null };
  const question = questions.find((q) => q.seq === seq);
  return {
    ...state,
    ...fresh,
    questions,
    seq,
    phase: "live",
    attemptNo: (question?.tries ?? 0) + 1,
    help: helpOf(question),
  };
}

export const initialRunner: RunnerState = {
  questions: [],
  seq: null,
  phase: "resyncing",
  feedback: null,
  attemptNo: 1,
  help: null,
  helpRefused: false,
  workedSolution: null,
  next: null,
  counts: { praise: 0, try_again: 0 },
};

/** The question on screen. */
export function currentOf(state: RunnerState): PageAttemptQuestion | null {
  return state.questions.find((q) => q.seq === state.seq) ?? null;
}

/** Replace the question with `seq` by `change(question)`. */
function update(
  questions: PageAttemptQuestion[],
  seq: number,
  change: (q: PageAttemptQuestion) => PageAttemptQuestion,
): PageAttemptQuestion[] {
  return questions.map((q) => (q.seq === seq ? change(q) : q));
}

function nextOf(
  next: PageAttemptQuestion | null,
  status: AttemptAnswerResult["attempt_status"],
): Next {
  if (next !== null) return { kind: "question", question: next };
  return status === "finished" ? { kind: "finished" } : { kind: "resync" };
}

/** The moved-on line: "noted" for a neutral reply while verdicts are held, else "moved_on". */
function movedOn(ended: AttemptAnswerResult["ended"]): Feedback {
  const line: CopyKey = ended === "done" ? "noted" : "moved_on";
  return { kind: "moved_on", index: 0, line };
}

export function runner(state: RunnerState, action: RunnerAction): RunnerState {
  switch (action.type) {
    case "loaded": {
      const { snapshot } = action;
      if (snapshot.attempt.status === "finished") {
        return { ...show(state, snapshot.questions, null) };
      }
      return show(state, snapshot.questions, snapshot.open_seq);
    }
    case "sending":
      return state.phase === "live" ? { ...state, phase: "sending" } : state;
    case "reopen":
      return state.phase === "sending" ? { ...state, phase: "live" } : state;
    case "answered": {
      const { result } = action;
      if (result.seq !== state.seq) return state;
      const questions = update(state.questions, result.seq, (q) => ({
        ...q,
        tries: Math.max(q.tries, result.try_no),
        ended: result.ended,
      }));
      if (result.ended === null) {
        // A miss: the question stays open for another try.
        const parts: PartMark[] | null = result.parts;
        return {
          ...state,
          questions,
          phase: "live",
          feedback: {
            kind: "try_again",
            index: state.counts.try_again,
            ...(parts !== null && parts.length > 0 ? { parts } : {}),
          },
          counts: { ...state.counts, try_again: state.counts.try_again + 1 },
          attemptNo: result.try_no + 1,
          helpRefused: false,
        };
      }
      const next = nextOf(result.next, result.attempt_status);
      if (result.ended === "correct") {
        const reveal = result.reveal ?? {};
        return {
          ...state,
          questions,
          phase: "feedback",
          feedback: {
            kind: "praise",
            index: state.counts.praise,
            ...(reveal.other_form === undefined ? {} : { also: reveal.other_form }),
            ...(reveal.why === undefined ? {} : { why: reveal.why }),
            ...(reveal.question_form === undefined ? {} : { swapped: reveal.question_form }),
          },
          counts: { ...state.counts, praise: state.counts.praise + 1 },
          workedSolution: reveal.worked_solution ?? null,
          next,
        };
      }
      return { ...state, questions, phase: "beat", feedback: movedOn(result.ended), next };
    }
    case "help": {
      const { result } = action;
      if (result.seq !== state.seq || state.phase !== "live") return state;
      if (result.released === null) {
        return { ...state, helpRefused: true };
      }
      const help = pageHelp(result.released, result.more);
      const questions = update(state.questions, result.seq, (q) => ({
        ...q,
        help_released: result.help_released,
        help: [...q.help, ...(result.released === null ? [] : [result.released])],
        ended: result.ended,
      }));
      if (result.ended === null) return { ...state, questions, help, helpRefused: false };
      // Rung 4 ended the question and asked its twin: the twin comes at once, with the worked
      // lines still in the help note above it.
      const moved = runner(
        { ...state, questions, next: nextOf(result.next, "in_progress") },
        { type: "advance" },
      );
      return { ...moved, help };
    }
    case "advance": {
      if (state.next === null) return state;
      switch (state.next.kind) {
        case "finished":
          return show(state, state.questions, null);
        case "resync":
          return { ...state, ...fresh, phase: "resyncing" };
        case "question": {
          const { question } = state.next;
          const held = state.questions.some((q) => q.seq === question.seq);
          const questions = held
            ? update(state.questions, question.seq, () => question)
            : [...state.questions, question];
          return show(state, questions, question.seq);
        }
      }
      return state;
    }
    case "resync":
      return { ...state, ...fresh, phase: "resyncing" };
  }
}

/** How far through the lesson, for the step bar: questions ended of questions asked. The wire
 * carries no planned total, so the bar measures what has been asked so far. */
export function progressOf(state: RunnerState): { done: number; total: number } {
  const done = state.questions.filter((q) => q.ended !== null).length;
  return { done, total: Math.max(state.questions.length, 1) };
}
