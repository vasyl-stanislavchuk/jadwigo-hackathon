import { RunEvent } from "@jadwigo/contracts/run";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { checkAnswer } from "./answer-check.ts";

const BASE = {
  run_id: "run_00000000000000000000000001",
  created_at: "2026-09-01T08:00:01.000Z",
};

function at(seq: number, type: string, payload: Record<string, unknown>): RunEvent {
  const event_id = `00000000-0000-4000-8fff-${seq.toString(16).padStart(12, "0")}`;
  return RunEvent.parse({ ...BASE, seq, event_id, type, payload });
}

function result(seq: number, output: Record<string, unknown> | null, view?: object): RunEvent {
  return at(seq, "tool_result", {
    call_id: `call_${seq}`,
    verb: "lesson_draft",
    output,
    error:
      output === null ? { type: "verb_failed", message: "Step 4 failed after 2 tries." } : null,
    ...(view === undefined ? {} : { view }),
  });
}

const DRAFT = result(2, {
  draft_id: "drf_demo",
  questions: [{ step: "s1" }, { step: "s2" }, { step: "s3" }],
  minutes: 12,
  goal: { status: "on_its_way" },
});

describe("checkAnswer (dl-z5ja.26)", () => {
  it("passes a message whose numbers all come from the turn's tool results", () => {
    const text = "The draft has 3 questions, about 12 minutes; step s2 is the hardest.";
    expect(checkAnswer(text, [DRAFT])).toEqual([]);
  });

  it("refuses a planted invented number", () => {
    const text = "The draft has 3 questions and your child gets 8 of 10 right.";
    expect(checkAnswer(text, [DRAFT])).toEqual([
      { kind: "number", said: "8" },
      { kind: "number", said: "10" },
    ]);
  });

  it("refuses a planted level name in English and Polish, even when a tool result holds it", () => {
    const mastery = result(3, { skills: [{ code: "add-10", level: "mastered" }] });
    expect(checkAnswer("Adding is mastered now.", [DRAFT, mastery])).toEqual([
      { kind: "level", said: "mastered" },
    ]);
    expect(checkAnswer("Dodawanie jest już opanowane, a odejmowanie Biegłe.", [DRAFT])).toEqual([
      { kind: "level", said: "opanowane" },
      { kind: "level", said: "Biegłe" },
    ]);
    expect(checkAnswer("This skill is not started.", [DRAFT])).toEqual([
      { kind: "level", said: "not started" },
    ]);
  });

  it("refuses a status word no tool result gave, as a code or as the parent reads it", () => {
    expect(checkAnswer("This goal needs attention.", [DRAFT])).toEqual([
      { kind: "status", said: "needs attention", code: "needs_attention" },
    ]);
    expect(checkAnswer("Cel potrzebuje uwagi, a mnożenie idzie dobrze.", [DRAFT])).toEqual([
      { kind: "status", said: "potrzebuje uwagi", code: "needs_attention" },
      { kind: "status", said: "idzie dobrze", code: "good" },
    ]);
    expect(checkAnswer("Subtraction is review_due.", [DRAFT])).toEqual([
      { kind: "status", said: "review_due", code: "review_due" },
    ]);
  });

  it("passes a status word a tool result gave, and the everyday word good", () => {
    expect(checkAnswer("Good news: the goal is on its way. Cel jest w drodze.", [DRAFT])).toEqual(
      [],
    );
  });

  it("takes nothing from a failed result, a parent's message or another event", () => {
    const turn = [
      at(1, "message", { from: "parent", text: "Make it 5 questions." }),
      result(2, null),
      at(3, "usage", { spent_usd: 0.04, cap_usd: 0.1 }),
    ];
    expect(checkAnswer("Done: 5 questions, step 4 fixed.", turn)).toEqual([
      { kind: "number", said: "5" },
      { kind: "number", said: "4" },
    ]);
  });

  it("reads a tool result's view as well as its output, and a decimal comma as a point", () => {
    const viewed = result(
      2,
      { draft_id: "drf_demo" },
      {
        kind: "lesson_draft",
        data: { share: 0.5 },
      },
    );
    expect(checkAnswer("Połowa to 0,5 albo 0.5.", [viewed])).toEqual([]);
  });

  it("names each miss once, in the order the message says it", () => {
    expect(checkAnswer("7 and 7, then mastered and Mastered.", [])).toEqual([
      { kind: "number", said: "7" },
      { kind: "level", said: "mastered" },
    ]);
  });
});

describe("checkAnswer, properties", () => {
  it("passes every number a tool result gives and refuses every other one", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.nat({ max: 10_000 }), { minLength: 1, maxLength: 6 }),
        fc.nat({ max: 10_000 }),
        (numbers, other) => {
          const turn = [result(2, { numbers })];
          const said = numbers.map((n) => `${n}`).join(", ");
          expect(checkAnswer(`Found ${said}.`, turn)).toEqual([]);
          const want =
            numbers.includes(other) || other === numbers.length
              ? []
              : [{ kind: "number", said: `${other}` }];
          expect(checkAnswer(`About ${other} more.`, turn)).toEqual(want);
        },
      ),
    );
  });

  it("refuses a level name whatever the turn holds", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("mastered", "proficient", "familiar", "attempted", "zaznajomiony"),
        fc.array(fc.string(), { maxLength: 5 }),
        (level, strings) => {
          const turn = [result(2, { strings, level })];
          expect(checkAnswer(`It is ${level}.`, turn)).toContainEqual({
            kind: "level",
            said: level,
          });
        },
      ),
    );
  });
});
