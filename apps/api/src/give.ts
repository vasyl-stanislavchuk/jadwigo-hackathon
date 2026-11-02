import {
  type ConversationId,
  ErrorType,
  type LearnerId,
  LessonGive,
  type LessonGiven,
  LIMITS,
  type PodId,
  toolViewData,
} from "@jadwigo/contracts";
import type { RunEvent } from "@jadwigo/contracts/run";
import { compileLessonFile, featuredAssignmentId } from "@jadwigo/lesson-import";
import { check } from "@jadwigo/lesson-import/check";
import type { Store } from "@jadwigo/store";
import type { Claims } from "./auth.ts";
import { authorizeMember } from "./authorize.ts";
import { ApiError, badRequest } from "./errors.ts";

/**
 * Giving a conversation's lesson to play (dl-5ssh.136): its latest lesson revision becomes a
 * lesson, a published version and an assignment in the caller's pod. `POST
 * /api/v1/conversations/{id}/lessons` calls `publishLesson`, and so does the MCP's lesson_publish
 * (dl-1u6fn.11), in-process with the pod its token reaches.
 */

/** @public lesson_publish's input (dl-1u6fn.11). */
export interface PublishLesson {
  readonly conversation_id: ConversationId;
  /** The revision the parent saw; left out, the latest. An older one is refused, never given. */
  readonly revision?: number | undefined;
  /** The child it is for; left out, the child picks their name before the first question. */
  readonly learner_id?: LearnerId | undefined;
}

function refuse(message: string): ApiError {
  return new ApiError(ErrorType.enum.LessonNotPublishable, message);
}

type Revision = Extract<RunEvent, { type: "lesson_revision" }>;
type ToolResult = Extract<RunEvent, { type: "tool_result" }>;

/**
 * The latest revision, if the latest lesson_check found it publishable and nothing wrote the lesson
 * after that check but the check itself (the web's `readyOf` rule, `apps/web/src/chat/lessonWiring.ts`).
 * A parent's patch writes a revision no check names, so it needs a check again.
 */
function checkedRevision(log: readonly RunEvent[]): Revision {
  let latest: Revision | undefined;
  let checkAt = -1;
  let checked: ToolResult | undefined;
  log.forEach((e, i) => {
    if (e.type === "lesson_revision") latest = e;
    if (e.type === "tool_result" && e.payload.verb === "lesson_check" && e.payload.error === null) {
      checked = e;
      checkAt = i;
    }
  });
  if (latest === undefined) throw refuse("this conversation has no lesson yet");
  const view = checked?.payload.view;
  const data = view?.kind === "lesson_check" ? toolViewData("lesson_check", view.data) : null;
  if (checked === undefined || !data?.publishable)
    throw refuse("the lesson has not passed lesson_check: check it again first");
  const after = log.indexOf(latest) > checkAt && latest.payload.call_id !== checked.payload.call_id;
  if (after) throw refuse("the lesson changed after its last lesson_check: check it again first");
  return latest;
}

/**
 * Publishes the conversation's checked lesson and assigns it in `pod`. Each revision is its own
 * lesson (`<file id>-r<revision>`), so a later revision never changes what an earlier assignment
 * plays, and giving the same revision to the same child again answers the same assignment: every
 * id is named, as the import names them. `NotFound` for a conversation or learner outside `pod`;
 * `LessonNotPublishable` for no lesson, an unchecked or superseded revision, or more than
 * `LIMITS.questionsPerLesson` questions. The MCP's lesson_publish calls it (dl-1u6fn.11).
 *
 * @public
 */
export async function publishLesson(
  store: Store,
  pod: PodId,
  give: PublishLesson,
): Promise<LessonGiven> {
  await store.getConversation(pod, give.conversation_id);
  if (give.learner_id !== undefined && (await store.findLearnerPod(give.learner_id)) !== pod)
    throw new ApiError(ErrorType.enum.NotFound, "no such learner");

  const log: RunEvent[] = [];
  for (const run of await store.listRuns(pod, give.conversation_id))
    log.push(...(await store.listRunEvents(pod, run.id, 0)));
  const revision = checkedRevision(log);
  const number = revision.payload.revision;
  if (give.revision !== undefined && give.revision !== number)
    throw refuse(`revision ${give.revision} is not the latest: revision ${number} replaced it`);

  // Read again here, from the revision itself, never from a stored flag (jadwigo-ai's review.ts).
  const file = revision.payload.lesson_file;
  const checks = check(file);
  if (!checks.ok)
    throw refuse(`the lesson does not pass the lesson checks: ${checks.errors[0]?.message ?? ""}`);
  if (checks.questions > LIMITS.questionsPerLesson)
    throw refuse(
      `the lesson holds ${checks.questions} questions; a lesson holds at most ${LIMITS.questionsPerLesson}`,
    );
  const fileId =
    file !== null && typeof file === "object" && !Array.isArray(file) ? file["id"] : undefined;
  let compiled: ReturnType<typeof compileLessonFile>;
  try {
    compiled = compileLessonFile({ ...(file as object), id: `${fileId}-r${number}` }, pod);
  } catch (e) {
    throw refuse(`the lesson does not compile: ${e instanceof Error ? e.message : String(e)}`);
  }

  const lesson = await store.putLesson(pod, compiled.lesson);
  for (const { question } of compiled.questions) await store.putLessonQuestion(pod, question);
  const lesson_version =
    (await store.getLatestLessonVersion(pod, lesson.id)) ??
    (await store.publishLessonVersion(pod, {
      lesson_id: lesson.id,
      questions: compiled.questions.map((q) => ({
        lesson_question_id: q.question.id,
        role: q.role,
      })),
    }));
  // The import's named assignment id, one per revision and child, so a retry finds its own.
  const named = `${fileId}-r${number}/${give.learner_id ?? "pick"}`;
  const assignment = await store.putAssignment(pod, {
    id: featuredAssignmentId(named, pod),
    lesson_id: lesson.id,
    audience: "learners",
    identity: "pick",
  });
  return { assignment, lesson_version };
}

/** `POST /api/v1/conversations/{id}/lessons`: `publishLesson` in the caller's pod. */
export async function giveLesson(
  store: Store,
  claims: Claims,
  id: ConversationId,
  raw: unknown,
): Promise<LessonGiven> {
  const { pod } = await authorizeMember(store, claims);
  const parsed = LessonGive.safeParse(raw);
  if (!parsed.success) throw badRequest(parsed.error.issues);
  return publishLesson(store, pod, { conversation_id: id, ...parsed.data });
}
