import {
  type AssignmentId,
  type AssignmentIntro,
  ErrorType,
  type LearnerId,
  type PodId,
} from "@jadwigo/contracts";
import type { Store } from "@jadwigo/store";
import { ApiError } from "./errors.ts";

/**
 * `GET /api/v1/assignments/{id}`: what a play link's first screen says, before any attempt
 * exists (decision 2026-11-03-a-play-link-opens-on-a-first-screen-title-and-question-count-the).
 * Holding the link is the access, as it is for a start: an unknown assignment is 404, and a learner
 * outside the assignment's pod is simply not named. The name goes to the page and into no log.
 */
export async function getAssignmentIntro(
  store: Store,
  id: AssignmentId,
  learner: LearnerId | undefined,
): Promise<AssignmentIntro> {
  const pod = await store.findAssignmentPod(id);
  if (pod === undefined) throw new ApiError(ErrorType.enum.NotFound, "no such assignment");
  const assignment = await store.getAssignment(pod, id);
  const lesson = await store.getLesson(pod, assignment.lesson_id);
  if (lesson === undefined) throw new ApiError(ErrorType.enum.NotFound, "no such assignment");
  const version =
    assignment.lesson_version_id ?? (await store.getLatestLessonVersion(pod, lesson.id))?.id;
  const questions =
    version === undefined ? [] : (await store.getLessonVersion(pod, version)).questions;
  return {
    title: lesson.title,
    language: lesson.language,
    // As the page's plan counts them (page.ts): an explain question is never asked in v0.
    question_count: questions.filter((q) => q.role === "planned" && q.question.family !== "explain")
      .length,
    identity: assignment.identity,
    open: assignment.audience === "anyone",
    first_name: learner === undefined ? null : await firstNameIn(store, pod, learner),
  };
}

async function firstNameIn(store: Store, pod: PodId, learner: LearnerId): Promise<string | null> {
  if ((await store.findLearnerPod(learner)) !== pod) return null;
  return (await store.getLearnerAttempts(pod, learner)).learner.first_name;
}
