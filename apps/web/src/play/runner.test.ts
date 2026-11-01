import {
  type AttemptAnswerResult,
  AttemptSnapshot,
  type HelpResult,
  type PageAttemptQuestion,
  type PagePlannedQuestion,
} from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { currentOf, initialRunner, progressOf, type RunnerState, runner } from "./runner.ts";

const AT = "2026-10-28T14:02:06.274Z";

function question(seq: number, changes: Partial<PageAttemptQuestion> = {}): PageAttemptQuestion {
  return {
    seq,
    lesson_question_id: "lq_2h4m8gyw0fb1cvz2nkqw0px8fq",
    question_type: "production",
    say: `question ${seq}`,
    question: { family: "enter", data: { input: "number", entry: "keypad" } },
    added: "planned",
    placed: null,
    added_for: null,
    help_released: 0,
    help: [],
    tries: 0,
    ended: null,
    asked_at: AT,
    ...changes,
  } as PageAttemptQuestion;
}

/** A plan of `n` planned questions, positions 1 to n. */
function planOf(n: number): PagePlannedQuestion[] {
  return Array.from({ length: n }, (_, k) => ({
    position: k + 1,
    lesson_question_id: "lq_2h4m8gyw0fb1cvz2nkqw0px8fq",
    question_type: "production",
    say: `question ${k + 1}`,
    question: { family: "enter", data: { input: "number", entry: "keypad" } },
  })) as PagePlannedQuestion[];
}

function snapshot(
  questions: PageAttemptQuestion[],
  status: "in_progress" | "paused" | "finished" = "in_progress",
  plan: PagePlannedQuestion[] = planOf(questions.filter((q) => q.added === "planned").length),
): AttemptSnapshot {
  return AttemptSnapshot.parse({
    attempt: {
      id: "att_43007b83dp9w2tnfjxhha74cyq",
      pod_id: "pod_6et2fhbnwvb45aw9atcfzs33za",
      assignment_id: "asg_0ectzj2evqb95a3v1v6wewjzy3",
      lesson_version_id: "lesv_7qre3atahx8cpak6xbjtz73var",
      learner_id: null,
      player_name: null,
      mode: "real",
      status,
      resume_at: null,
      started_at: AT,
      finished_at: status === "finished" ? AT : null,
    },
    language: "pl",
    plan,
    questions,
    open_seq: status === "finished" ? null : (questions.find((q) => q.ended === null)?.seq ?? null),
    last_event_id: null,
  });
}

function result(changes: Partial<AttemptAnswerResult>): AttemptAnswerResult {
  return {
    event_id: "0b6f3c1e-8f7a-4c1d-9e2b-1a2b3c4d5e6f",
    seq: 1,
    try_no: 1,
    replayed: false,
    correct: null,
    parts: null,
    reveal: null,
    ended: null,
    next: null,
    attempt_status: "in_progress",
    ...changes,
  } as AttemptAnswerResult;
}

const loaded = (questions: PageAttemptQuestion[]): RunnerState =>
  runner(initialRunner, { type: "loaded", snapshot: snapshot(questions) });

describe("runner", () => {
  it("opens on the snapshot's open question, its tries carried into the next try's number", () => {
    const state = loaded([question(1, { ended: "correct", tries: 1 }), question(2, { tries: 2 })]);
    expect(state.phase).toBe("live");
    expect(state.seq).toBe(2);
    expect(state.attemptNo).toBe(3);
    expect(progressOf(state)).toEqual({ done: 1, total: 2 });
  });

  it("keeps a missed question open for another try, with its marked parts", () => {
    const sending = runner(loaded([question(1)]), { type: "sending" });
    const parts = [{ id: "a", correct: false }] as unknown as AttemptAnswerResult["parts"];
    const state = runner(sending, {
      type: "answered",
      result: result({ correct: false, parts }),
    });
    expect(state.phase).toBe("live");
    expect(state.feedback).toEqual({ kind: "try_again", index: 0, parts });
    expect(state.attemptNo).toBe(2);
  });

  it("praises a right answer and waits for Dalej before the next question", () => {
    const state = runner(runner(loaded([question(1)]), { type: "sending" }), {
      type: "answered",
      result: result({
        correct: true,
        ended: "correct",
        reveal: { worked_solution: ["2 × 5 = 10"] },
        next: question(2),
      }),
    });
    expect(state.phase).toBe("feedback");
    expect(state.feedback?.kind).toBe("praise");
    expect(state.workedSolution).toEqual(["2 × 5 = 10"]);
    expect(state.seq).toBe(1);
    const next = runner(state, { type: "advance" });
    expect(next.seq).toBe(2);
    expect(next.phase).toBe("live");
    expect(next.feedback).toBeNull();
    expect(next.questions.map((q) => q.seq)).toEqual([1, 2]);
  });

  it("moves on by itself after Not sure yet, to the twin the reply names", () => {
    const twin = question(2, { added: "twin", added_for: 1 } as Partial<PageAttemptQuestion>);
    const state = runner(runner(loaded([question(1)]), { type: "sending" }), {
      type: "answered",
      result: result({ ended: "skipped", next: twin }),
    });
    expect(state.phase).toBe("beat");
    expect(state.feedback).toEqual({ kind: "moved_on", index: 0, line: "moved_on" });
    const next = runner(state, { type: "advance" });
    expect(currentOf(next)?.added).toBe("twin");
  });

  it("says only 'noted' while verdicts are held, never right or wrong", () => {
    const state = runner(runner(loaded([question(1)]), { type: "sending" }), {
      type: "answered",
      result: result({ ended: "done", next: question(2) }),
    });
    expect(state.feedback).toEqual({ kind: "moved_on", index: 0, line: "noted" });
  });

  it("finishes after the last question, and re-reads the snapshot when a reply names no next one", () => {
    const last = runner(runner(loaded([question(1)]), { type: "sending" }), {
      type: "answered",
      result: result({ ended: "skipped", attempt_status: "finished" }),
    });
    expect(runner(last, { type: "advance" }).phase).toBe("finished");
    const lost = runner(runner(loaded([question(1)]), { type: "sending" }), {
      type: "answered",
      result: result({ ended: "skipped" }),
    });
    expect(runner(lost, { type: "advance" }).phase).toBe("resyncing");
  });

  it("ignores a reply for a question no longer on screen", () => {
    const state = loaded([question(1, { ended: "correct" }), question(2)]);
    expect(runner(state, { type: "answered", result: result({ seq: 1 }) })).toBe(state);
  });

  it("shows a released rung, refuses quietly, and moves to the twin on rung 4", () => {
    const released = {
      rung: 1,
      card: { text: "Two groups of five." },
      focus: [],
      given: null,
      worked: null,
      blank: false,
      hints: [],
    };
    const help = (changes: Partial<HelpResult>): HelpResult =>
      ({
        seq: 1,
        help_released: 1,
        released,
        more: true,
        ended: null,
        next: null,
        ...changes,
      }) as HelpResult;
    const start = loaded([question(1)]);
    const one = runner(start, { type: "help", result: help({}) });
    expect(one.help).toMatchObject({ rung: 1, card: { text: "Two groups of five." }, focus: null });
    expect(currentOf(one)?.help_released).toBe(1);
    const refused = runner(start, { type: "help", result: help({ released: null }) });
    expect(refused.helpRefused).toBe(true);
    const twin = question(2, { added: "twin" });
    const four = runner(start, {
      type: "help",
      result: help({
        help_released: 4,
        released: { ...released, rung: 4, worked: ["2 × 5 = 10"] },
        more: false,
        ended: "skipped",
        next: twin,
      }),
    });
    expect(four.seq).toBe(2);
    expect(four.help?.rung).toBe(4);
  });

  it("shows nothing to answer on a finished attempt", () => {
    const state = runner(initialRunner, {
      type: "loaded",
      snapshot: snapshot([question(1, { ended: "correct" })], "finished"),
    });
    expect(state.phase).toBe("finished");
    expect(currentOf(state)).toBeNull();
  });

  it("draws the bar from the plan: 0 on question 1, a quarter after it, a twin adds one", () => {
    const start = runner(initialRunner, {
      type: "loaded",
      snapshot: snapshot([question(1)], "in_progress", planOf(4)),
    });
    expect(progressOf(start)).toEqual({ done: 0, total: 4 });

    const right = runner(start, {
      type: "answered",
      result: result({ correct: true, ended: "correct", next: question(2) }),
    });
    expect(progressOf(right)).toEqual({ done: 1, total: 4 });

    // Not sure yet on question 2 asks its twin now: the total grows by one.
    const second = runner(right, { type: "advance" });
    const skipped = runner(second, {
      type: "answered",
      result: result({ seq: 2, ended: "skipped", next: question(3, { added: "twin" }) }),
    });
    // The twin counts from the reply that names it, through the beat, so the bar never steps back.
    expect(progressOf(skipped)).toEqual({ done: 2, total: 5 });
    const twin = runner(skipped, { type: "advance" });
    expect(progressOf(twin)).toEqual({ done: 2, total: 5 });

    // A reload mid-lesson draws the same bar.
    const reload = runner(initialRunner, {
      type: "loaded",
      snapshot: snapshot(twin.questions, "in_progress", planOf(4)),
    });
    expect(progressOf(reload)).toEqual(progressOf(twin));
  });

  it("never reads full while a review-round twin asked after the last planned question waits for Dalej", () => {
    const asked = [
      question(1, { ended: "correct" }),
      question(2, { ended: "skipped" }),
      question(3, { ended: "correct" }),
      question(4),
    ];
    const last = runner(initialRunner, {
      type: "loaded",
      snapshot: snapshot(asked, "in_progress", planOf(4)),
    });
    const right = runner(last, {
      type: "answered",
      result: result({
        seq: 4,
        correct: true,
        ended: "correct",
        next: question(5, { added: "twin", placed: "review_round", added_for: 2 }),
      }),
    });
    expect(right.phase).toBe("feedback");
    expect(progressOf(right)).toEqual({ done: 4, total: 5 });
    expect(progressOf(runner(right, { type: "advance" }))).toEqual({ done: 4, total: 5 });
  });

  it("reaches the end only once the last planned question ends", () => {
    const asked = [1, 2, 3].map((seq) => question(seq, { ended: "correct" }));
    const last = runner(initialRunner, {
      type: "loaded",
      snapshot: snapshot([...asked, question(4)], "in_progress", planOf(4)),
    });
    expect(progressOf(last)).toEqual({ done: 3, total: 4 });
    const done = runner(last, {
      type: "answered",
      result: result({ seq: 4, ended: "correct", attempt_status: "finished" }),
    });
    expect(progressOf(done)).toEqual({ done: 4, total: 4 });
  });
});
