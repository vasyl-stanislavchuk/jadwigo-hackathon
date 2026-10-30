import type { LearnerId, LearnerSkillMastery } from "@jadwigo/contracts";
import { foldLearner } from "@jadwigo/core";
import type { Store } from "@jadwigo/store";

/**
 * Rebuilds a learner's mastery cache from its evidence, in the learner's own pod: a featured
 * attempt is finished under Jadwigo's pod, and its learner may be in another
 * (`findLearnerPod`). The pure fold runs before anything is written, so a fold that throws writes
 * nothing. Undefined for an unknown learner.
 *
 * Called after a real attempt with a learner finishes, after a claim, and in `createReport` and
 * `createGoal`, inside the request's unit. A call site after a finish or a claim logs a failure and
 * goes on: a fold never aborts the finish (wave dl-e8ov.5-1, the store-api lane wires them).
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
