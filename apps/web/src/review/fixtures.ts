/**
 * Review questions for the review's tests: one enter question, 2 × 5, ended each way. No real
 * learner's answers.
 */

import { ReviewQuestion } from "@jadwigo/contracts";

export function reviewQuestion(
  seq: number,
  ended: ReviewQuestion["ended"],
  changes: Partial<ReviewQuestion> = {},
): ReviewQuestion {
  const answer =
    ended === "correct" ? { entered: "10" } : ended === "missed" ? { entered: "7" } : null;
  return ReviewQuestion.parse({
    seq,
    added: "planned",
    ended,
    help_used: 0,
    question_type: "production",
    say: `Ile to jest dwa razy pięć? (${seq})`,
    question: {
      family: "enter",
      data: { input: "number", entry: "keypad", figure: { kind: "expression", text: "2 × 5 = ?" } },
    },
    answer,
    parts: null,
    solution: { entered: "10" },
    reveal: { why: "Dwa razy pięć to pięć i jeszcze pięć." },
    ...changes,
  });
}
