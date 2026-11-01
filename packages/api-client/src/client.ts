/**
 * The `/api/v1` calls, typed from the contracts: the featured lessons the home page lists
 * (dl-5ssh.3.6), the lesson player's attempt calls (dl-5ssh.3.1), the playground's examples
 * (dl-w3.75), the lesson review (dl-uukj.30) and the signed-in parent's (dl-e8ov.2.38), which carry the Supabase Auth token on the
 * routes whose `auth` is `token`. Every path comes from `ROUTES` and every reply is parsed with the
 * route's own response schema, so a reply the page cannot trust is an error here, never a shape a
 * view has to guess at (RULES.md rule 18).
 *
 * Two kinds of failure, as the lesson player needs them: a `TransientError` is worth sending again
 * with the same body (no answer from the network, or a 5xx), and an `ApiError` is the server's
 * refusal, carrying the `ErrorType` it named. Neither message ever holds the attempt id: whoever
 * holds the id can answer the attempt (decision
 * 2026-10-28-an-anonymous-attempt-is-bound-to-its-caller-by-its-id-whoever-ho).
 */

import {
  type AccountCreate,
  type AssignmentAttempts,
  type AssignmentId,
  type AttachmentCreate,
  type AttachmentId,
  type AttachmentRead,
  type AttachmentUpload,
  type AttemptAnswerRequest,
  type AttemptAnswerResult,
  type AttemptClaim,
  type AttemptId,
  type AttemptPatch,
  type AttemptResults,
  type AttemptReview,
  type AttemptSnapshot,
  type AttemptStart,
  type Claim,
  type Conversation,
  type ConversationCreate,
  type ConversationId,
  type ConversationMessage,
  type ConversationPatch,
  type ConversationRuns,
  type Conversations,
  ErrorEnvelope,
  type ErrorType,
  type Featured,
  type GoalCreate,
  type GoalId,
  type GoalPatch,
  type HelpRequest,
  type HelpResult,
  type Language,
  type LearnerAttempts,
  type LearnerCreate,
  type LearnerGoals,
  type LearnerId,
  type LearnerReport,
  type LearnerReportId,
  type LearnerReports,
  type LearnerSkills,
  type LearnerSnapshot,
  type Me,
  type ParentAttemptReview,
  type PlaygroundExamples,
  type Pod,
  type PodId,
  type PodPatch,
  type ReportCreate,
  type ReportPatch,
  ROUTES,
  type Route,
  type RunAccepted,
  type RunCancel,
  type RunEvents,
  type RunId,
  type RunRating,
  type RunRatingCreate,
  type Skills,
} from "@jadwigo/contracts";
import { apiUrl } from "./url.ts";

/** No answer from the server, or a 5xx: the same request may be sent again. */
export class TransientError extends Error {
  override name = "TransientError";
}

/** The server refused the request. `type` is the error type it named, or null when its reply had
 * no error envelope. */
export class ApiError extends Error {
  override name = "ApiError";
  constructor(
    message: string,
    readonly status: number,
    readonly type: ErrorType | null,
  ) {
    super(message);
  }
}

export interface ClientOptions {
  /** Where the API is: "" for the page's own origin, which is how app.jadwigo.pl reaches /api. */
  base: string;
  fetch?: typeof fetch;
  /** The signed-in adult's access token, or null when nobody is signed in. Sent only on the
   * routes whose `auth` is `token`; a token route with no token is refused here as `NotSignedIn`,
   * before anything is sent. */
  token?: () => Promise<string | null>;
}

export interface AttemptClient {
  startAttempt(assignmentId: AssignmentId, body?: AttemptStart): Promise<AttemptSnapshot>;
  getAttempt(attemptId: AttemptId): Promise<AttemptSnapshot>;
  answer(attemptId: AttemptId, body: AttemptAnswerRequest): Promise<AttemptAnswerResult>;
  help(attemptId: AttemptId, seq: number, body: HelpRequest): Promise<HelpResult>;
  patchAttempt(attemptId: AttemptId, body: AttemptPatch): Promise<AttemptSnapshot>;
  getResults(attemptId: AttemptId): Promise<AttemptResults>;
  /** A finished attempt's questions again; `AttemptNotFinished` before it finishes. */
  getReview(attemptId: AttemptId): Promise<AttemptReview>;
}

/** The home page's call: the lessons anyone may play now, oldest first. */
export interface FeaturedClient {
  featuredLessons(): Promise<Featured>;
}

/** The playground's read: the written examples in one language, keys included. */
export interface PlaygroundClient {
  playgroundExamples(language: Language): Promise<PlaygroundExamples>;
}

/** The signed-in parent's calls (dl-e8ov.2.38). Each needs a token. */
export interface ParentClient {
  getMe(): Promise<Me>;
  createAccount(body: AccountCreate): Promise<Me>;
  createLearner(body: LearnerCreate): Promise<LearnerSnapshot>;
  claimAttempt(attemptId: AttemptId, body: AttemptClaim): Promise<Claim>;
  getLearnerAttempts(learnerId: LearnerId): Promise<LearnerAttempts>;
  /** A finished attempt of the learner with every try; `AttemptNotFinished` before it finishes. */
  getParentReview(learnerId: LearnerId, attemptId: AttemptId): Promise<ParentAttemptReview>;
  /** One assignment's attempts the caller's pod reads, with their rows: the lesson overview. */
  getAssignmentAttempts(assignmentId: AssignmentId): Promise<AssignmentAttempts>;
}

/**
 * The learner knowledge base's calls (wave 1 of epic dl-e8ov.5). Each needs a token. Apart from
 * `ParentClient`, so a view that needs only the parent's calls, or a test's fake of them, is not
 * made to carry these too.
 */
export interface LearnerKnowledgeClient {
  /** Where the learner stands on each skill, each goal's lists and the brief, folded on read. */
  getLearnerSkills(learnerId: LearnerId): Promise<LearnerSkills>;
  listSkills(): Promise<Skills>;
  getLearnerGoals(learnerId: LearnerId): Promise<LearnerGoals>;
  createGoal(learnerId: LearnerId, body: GoalCreate): Promise<LearnerGoals>;
  patchGoal(learnerId: LearnerId, goalId: GoalId, body: GoalPatch): Promise<LearnerGoals>;
  getLearnerReports(learnerId: LearnerId): Promise<LearnerReports>;
  createReport(learnerId: LearnerId, body?: ReportCreate): Promise<LearnerReport>;
  /** The narrative once (`WriteOnce` after), or the parent's decisions on its proposals. */
  patchReport(
    learnerId: LearnerId,
    reportId: LearnerReportId,
    body: ReportPatch,
  ): Promise<LearnerReport>;
}

/** The pod's own settings: its consent to the AI (dl-z5ja.112). Needs a token. */
export interface PodClient {
  /** Gives (`ai_consented: true`) or withdraws the pod's consent to the AI. */
  patchPod(podId: PodId, body: PodPatch): Promise<Pod>;
}

/**
 * The AI engine's conversation calls (epic dl-z5ja, dl-z5ja.21). Each needs a token. A message or
 * a Stop answers with its run before the AI has answered; the run's events carry the answer.
 */
export interface ConversationClient {
  /** Once by `event_id`: a resend returns the same conversation. */
  createConversation(body: ConversationCreate): Promise<Conversation>;
  /**
   * Once by `event_id`; the same id with another body is `EventIdMismatch`. `kind: "steer"` sends
   * a correction to the open turn, such as a lesson-pane edit with its `question_ids`.
   */
  postMessage(conversationId: ConversationId, body: ConversationMessage): Promise<RunAccepted>;
  listConversationRuns(conversationId: ConversationId): Promise<ConversationRuns>;
  /** The events after `after`, the last `seq` the caller holds; the whole log without it. */
  listRunEvents(runId: RunId, after?: number): Promise<RunEvents>;
  /** Stop: the run ends at its next step. One that has ended comes back as it is. */
  cancelRun(runId: RunId, body: RunCancel): Promise<RunAccepted>;
}

/**
 * A parent's conversation list and its delete, which archives (dl-z5ja.105, decision dl-84wo).
 * Each needs a token.
 */
export interface ConversationListClient {
  /** The pod's live conversations, newest first; an archived one is left out. */
  listConversations(): Promise<Conversations>;
  /** Archives it, once: archiving again keeps the first `archived_at`. */
  patchConversation(conversationId: ConversationId, body: ConversationPatch): Promise<Conversation>;
}

/** A parent's Good or Bad on a turn (dl-z5ja.110). Needs a token. */
export interface RunRatingClient {
  /** One per run and parent: rating again replaces the verdict and the note. */
  rateRun(runId: RunId, body: RunRatingCreate): Promise<RunRating>;
}

/**
 * A message's photos (dl-z5ja.11.3). Each needs a token. The page re-encodes a photo to a JPEG,
 * creates it here, posts the form's fields and then the file to `upload.url`, and sends the
 * message with the photo's id in `attachment_ids`.
 */
export interface AttachmentClient {
  /**
   * A pending photo and its upload form, once by `event_id`: a resend answers the same photo with
   * a fresh form. Past the pod's daily count it is `AttachmentLimitDay`.
   */
  createAttachment(body: AttachmentCreate): Promise<AttachmentUpload>;
  /** A photo a message carries, with a link to the stored copy until `expires_at`. */
  getAttachment(attachmentId: AttachmentId): Promise<AttachmentRead>;
}

/** Every `/api/v1` call this client makes. */
export type Client = AttemptClient &
  FeaturedClient &
  ParentClient &
  LearnerKnowledgeClient &
  PlaygroundClient &
  PodClient &
  ConversationClient &
  ConversationListClient &
  RunRatingClient &
  AttachmentClient;

/** A route's path with its `{name}` params filled in. */
export function pathOf(route: Route, params: Record<string, string | number>): string {
  return route.path.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`${route.path} needs ${name}`);
    return encodeURIComponent(String(value));
  });
}

/** `?name=value` for each value given, or "" when none is. */
function queryOf(query: Record<string, number | undefined>): string {
  const given = new URLSearchParams();
  for (const [name, value] of Object.entries(query))
    if (value !== undefined) given.set(name, String(value));
  return given.size === 0 ? "" : `?${given.toString()}`;
}

export function createClient({
  base,
  fetch: send = globalThis.fetch,
  token = async () => null,
}: ClientOptions): Client {
  async function call<R extends Route>(
    route: R,
    params: Record<string, string | number>,
    body: unknown,
    query: Record<string, number | undefined> = {},
  ): Promise<ReturnType<R["response"]["parse"]>> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (route.auth === "token") {
      const bearer = await token();
      if (bearer === null) {
        throw new ApiError(
          `${route.method} ${route.path}: nobody is signed in`,
          401,
          "NotSignedIn",
        );
      }
      headers["authorization"] = `Bearer ${bearer}`;
    }
    const init: RequestInit = { method: route.method, headers };
    if (body !== undefined) {
      init.body = JSON.stringify(body);
      init.headers = { ...init.headers, "content-type": "application/json" };
    }
    let reply: Response;
    try {
      reply = await send(apiUrl(base, pathOf(route, params) + queryOf(query)), init);
    } catch {
      throw new TransientError(`${route.method} ${route.path}: no answer from the server`);
    }
    if (reply.status >= 500) {
      throw new TransientError(
        `${route.method} ${route.path}: the server answered ${reply.status}`,
      );
    }
    const json: unknown = await reply.json().catch(() => null);
    if (!reply.ok) {
      const envelope = ErrorEnvelope.safeParse(json);
      throw new ApiError(
        envelope.success
          ? envelope.data.error.message
          : `${route.method} ${route.path}: the server answered ${reply.status}`,
        reply.status,
        envelope.success ? envelope.data.error.type : null,
      );
    }
    return route.response.parse(json) as ReturnType<R["response"]["parse"]>;
  }

  return {
    featuredLessons: () => call(ROUTES.featuredLessons, {}, undefined),
    startAttempt: (assignmentId, body = {}) =>
      call(ROUTES.startAttempt, { id: assignmentId }, body),
    getAttempt: (attemptId) => call(ROUTES.getAttempt, { id: attemptId }, undefined),
    answer: (attemptId, body) => call(ROUTES.answer, { id: attemptId }, body),
    help: (attemptId, seq, body) => call(ROUTES.help, { id: attemptId, seq }, body),
    patchAttempt: (attemptId, body) => call(ROUTES.patchAttempt, { id: attemptId }, body),
    getResults: (attemptId) => call(ROUTES.getResults, { id: attemptId }, undefined),
    getReview: (attemptId) => call(ROUTES.getReview, { id: attemptId }, undefined),
    getMe: () => call(ROUTES.getMe, {}, undefined),
    createAccount: (body) => call(ROUTES.createAccount, {}, body),
    patchPod: (podId, body) => call(ROUTES.patchPod, { id: podId }, body),
    createLearner: (body) => call(ROUTES.createLearner, {}, body),
    claimAttempt: (attemptId, body) => call(ROUTES.claimAttempt, { id: attemptId }, body),
    getLearnerAttempts: (learnerId) =>
      call(ROUTES.getLearnerAttempts, { id: learnerId }, undefined),
    getParentReview: (learnerId, attemptId) =>
      call(ROUTES.getParentReview, { id: learnerId, attempt: attemptId }, undefined),
    getAssignmentAttempts: (assignmentId) =>
      call(ROUTES.getAssignmentAttempts, { id: assignmentId }, undefined),
    playgroundExamples: (language) => call(ROUTES.playgroundExamples, { language }, undefined),
    getLearnerSkills: (learnerId) => call(ROUTES.getLearnerSkills, { id: learnerId }, undefined),
    listSkills: () => call(ROUTES.listSkills, {}, undefined),
    getLearnerGoals: (learnerId) => call(ROUTES.getLearnerGoals, { id: learnerId }, undefined),
    createGoal: (learnerId, body) => call(ROUTES.createGoal, { id: learnerId }, body),
    patchGoal: (learnerId, goalId, body) =>
      call(ROUTES.patchGoal, { id: learnerId, goal: goalId }, body),
    getLearnerReports: (learnerId) => call(ROUTES.getLearnerReports, { id: learnerId }, undefined),
    createReport: (learnerId, body = {}) => call(ROUTES.createReport, { id: learnerId }, body),
    patchReport: (learnerId, reportId, body) =>
      call(ROUTES.patchReport, { id: learnerId, report: reportId }, body),
    createConversation: (body) => call(ROUTES.createConversation, {}, body),
    listConversations: () => call(ROUTES.listConversations, {}, undefined),
    patchConversation: (conversationId, body) =>
      call(ROUTES.patchConversation, { id: conversationId }, body),
    postMessage: (conversationId, body) => call(ROUTES.postMessage, { id: conversationId }, body),
    listConversationRuns: (conversationId) =>
      call(ROUTES.listConversationRuns, { id: conversationId }, undefined),
    listRunEvents: (runId, after) =>
      call(ROUTES.listRunEvents, { id: runId }, undefined, { after }),
    cancelRun: (runId, body) => call(ROUTES.cancelRun, { id: runId }, body),
    rateRun: (runId, body) => call(ROUTES.rateRun, { id: runId }, body),
    createAttachment: (body) => call(ROUTES.createAttachment, {}, body),
    getAttachment: (attachmentId) => call(ROUTES.getAttachment, { id: attachmentId }, undefined),
  };
}
