import { judge, type Question, solutionOf } from "@jadwigo/core";
import type { CompiledQuestion } from "./compile.ts";

/**
 * Whether a key grades its own answer (dl-a38n.45, the wave-3 plan's lead decision 7): core's
 * `judge(q, solutionOf(q))` must call the key's solution correct, or the child can never get the
 * question right. A twin is graded always, since the agent or a sibling item wrote its key; a
 * question with any `based_on.changes` is graded too, since a change does not record which part it
 * set and may have set the key. An untouched copy is the bank's to grade (`dl-a38n.32.19`). An
 * explain question has no code judge and is never graded.
 */

/** A question whose key does not grade its own solution, and why. */
export interface KeyProblem {
  readonly step_id: string;
  readonly twin: boolean;
  readonly reason: string;
}

const graded = ({ role, question }: CompiledQuestion): boolean =>
  question.family !== "explain" &&
  (role === "spare" || (question.based_on?.changes.length ?? 0) > 0);

export function keyProblems(questions: readonly CompiledQuestion[]): KeyProblem[] {
  return questions.filter(graded).flatMap(({ step_id, role, question }) => {
    const q = question as unknown as Question;
    let reason: string | null;
    try {
      const verdict = judge(q, solutionOf(q));
      reason = verdict.correct
        ? null
        : `its own solution is judged wrong (${verdict.mistake_class ?? "no class"})`;
    } catch (e) {
      reason = `it cannot be judged: ${e instanceof Error ? e.message : String(e)}`;
    }
    return reason === null ? [] : [{ step_id, twin: role === "spare", reason }];
  });
}
