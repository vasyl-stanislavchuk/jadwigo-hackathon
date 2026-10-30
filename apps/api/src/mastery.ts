import type { Attempt, LearnerId, LearnerSkillMastery } from "@jadwigo/contracts";
import { foldLearner } from "@jadwigo/core";
import type { Store } from "@jadwigo/store";

/**
 * Rebuilds a learner's mastery cache from its evidence, in the learner's own pod: a featured
 * attempt is finished under Jadwigo's pod, and its learner may be in another
 * (`findLearnerPod`). The pure fold runs before anything is written, so a fold that throws writes
 * nothing. Undefined for an unknown learner.
 *
 * Called inside the request's unit after a real attempt with a learner finishes, after a claim,
 * and in `createGoal` (`rebuildAfter`), and its steps run in `createReport`.
 */
export async function rebuildMastery(
  store: Store,
  learner: LearnerId,
  now: Date,
): Promise<readonly LearnerSkillMastery[] | undefined> {
  const pod = await store.findLearnerPod(learner);
  if (pod === undefined) return undefined;
  const evidence = await store.getLearnerEvidence(pod, learner);
  const skills = await store.listSkills(pod);
  const rows = foldLearner(evidence, skills, now);
  return store.replaceMastery(pod, learner, rows);
}

/**
 * `rebuildMastery` where a failure must not refuse the request: after a finish, a claim or a new
 * goal. A failure is logged and skipped. On Postgres each Store call it makes runs under a
 * savepoint, so a statement that failed leaves the request's unit usable.
 */
export async function rebuildAfter(store: Store, learner: LearnerId, now: Date): Promise<void> {
  try {
    await rebuildMastery(store, learner, now);
  } catch (error) {
    logFoldFailure(error);
  }
}

/** The learner whose mastery a finished or claimed attempt feeds: a real attempt's, if it has one. */
export function learnerFed(attempt: Pick<Attempt, "mode" | "learner_id">): LearnerId | undefined {
  return attempt.mode === "real" && attempt.learner_id !== null ? attempt.learner_id : undefined;
}

/** One JSON line on stderr for a mastery rebuild that failed: the error's name and message only. */
function logFoldFailure(error: unknown): void {
  const failure =
    error instanceof Error
      ? { name: error.name, message: error.message }
      : { name: typeof error, message: String(error) };
  console.error(
    JSON.stringify({ level: "ERROR", message: "mastery rebuild failed", error: failure }),
  );
}
