import { z } from "zod";
import { Need, QuestionBody, SearchEnvelope } from "./bank.ts";
import {
  AssignmentId,
  AttemptId,
  ConversationId,
  GoalId,
  LearnerId,
  LearnerReportId,
  RunId,
} from "./ids.ts";
import { Language, LearnerReport } from "./records.ts";
import { Conversation } from "./run.ts";
import {
  AccountCreate,
  AssignmentAttempts,
  AttemptAnswerRequest,
  AttemptAnswerResult,
  AttemptClaim,
  AttemptPatch,
  AttemptResults,
  AttemptReview,
  AttemptSnapshot,
  AttemptStart,
  Claim,
  ConversationCreate,
  ConversationMessage,
  ConversationPatch,
  ConversationRuns,
  Conversations,
  Featured,
  GoalCreate,
  GoalPatch,
  Health,
  HelpRequest,
  HelpResult,
  LearnerAttempts,
  LearnerCreate,
  LearnerGoals,
  LearnerReports,
  LearnerSkills,
  LearnerSnapshot,
  Me,
  ParentAttemptReview,
  PlaygroundExamples,
  ReportCreate,
  ReportPatch,
  RunAccepted,
  RunCancel,
  RunEvents,
  Skills,
} from "./wire.ts";

/**
 * The `/api/v1` route table, named once (RULES.md rules 14 to 18). `apps/api` registers these and
 * `packages/api-client` calls them; neither writes a path or a schema of its own.
 */
export interface Route {
  readonly method: "GET" | "POST" | "PATCH";
  readonly path: string;
  readonly params: z.ZodType;
  /**
   * The query string's parameters, when the route reads any: a `z.object()` of optional fields,
   * each parsed from its string as `params` are.
   */
  readonly query?: z.ZodObject;
  readonly body: z.ZodType | null;
  readonly response: z.ZodType;
  /** The status of a successful reply. */
  readonly status: 200 | 201;
  /**
   * Who may call it. `none`: anyone, the login-free tier, bound by the attempt id where there is
   * one. `token`: a signed-in adult with a Supabase Auth token, which API Gateway's JWT authorizer
   * verifies in AWS and `apps/api` verifies everywhere else (docs/research/parent-login.md).
   */
  readonly auth: "none" | "token";
  /** One line for the API reference, a verb in the third person: "Lists …", "Starts …". */
  readonly summary: string;
  /** The reference section the route sits in. */
  readonly tag: RouteTag;
  /** What a caller must know beyond the summary: idempotency, a 409, who may read it. */
  readonly description?: string;
}

/** The API reference's sections, in the order docs.jadwigo.pl shows them (dl-5ssh.90). */
export const ROUTE_TAGS = [
  "attempts",
  "parents",
  "conversations",
  "lessons",
  "bank",
  "health",
] as const;
export type RouteTag = (typeof ROUTE_TAGS)[number];

const Seq = z.coerce.number().pipe(z.int().min(1));
/**
 * A run event cursor: the last `seq` the caller holds, 0 before the first. Digits only, so "",
 * "-0", "0x10" and "1e3" are refused, and at most `run_event.seq`'s Postgres `integer`.
 */
const After = z
  .string()
  .regex(/^\d+$/, "a cursor is a whole number")
  .transform(Number)
  .pipe(z.int().min(0).max(2_147_483_647));

export const ROUTES = {
  health: {
    method: "GET",
    path: "/api/health",
    params: z.object({}),
    body: null,
    response: Health,
    status: 200,
    auth: "none",
    summary: "Answers when the API is up.",
    tag: "health",
  },
  featuredLessons: {
    method: "GET",
    path: "/api/v1/featured-lessons",
    params: z.object({}),
    body: null,
    response: Featured,
    status: 200,
    auth: "none",
    summary: "Lists the featured lessons anyone may play.",
    tag: "lessons",
    description: "The featured pod's open `anyone` assignments, oldest first.",
  },
  playgroundExamples: {
    method: "GET",
    path: "/api/v1/playground-examples/{language}",
    params: z.object({ language: Language }),
    body: null,
    response: PlaygroundExamples,
    status: 200,
    auth: "none",
    summary: "Lists the playground's authored examples in one language, with their keys.",
    tag: "lessons",
    description:
      "The one response that carries a key: the playground reviews Jadwigo's own examples, and Try it looks a free answer up in the key.",
  },
  startAttempt: {
    method: "POST",
    path: "/api/v1/assignments/{id}/attempts",
    params: z.object({ id: AssignmentId }),
    body: AttemptStart,
    response: AttemptSnapshot,
    status: 201,
    auth: "none",
    summary: "Starts an attempt at an assignment.",
    tag: "attempts",
  },
  getAttempt: {
    method: "GET",
    path: "/api/v1/attempts/{id}",
    params: z.object({ id: AttemptId }),
    body: null,
    response: AttemptSnapshot,
    status: 200,
    auth: "none",
    summary: "Reads an attempt: its plan and everything asked so far.",
    tag: "attempts",
    description: "No sign-in: the attempt id is the access, and whoever holds it may use it.",
  },
  answer: {
    method: "POST",
    path: "/api/v1/attempts/{id}/answers",
    params: z.object({ id: AttemptId }),
    body: AttemptAnswerRequest,
    response: AttemptAnswerResult,
    status: 201,
    auth: "none",
    summary: "Sends one try at the current question, or a skip.",
    tag: "attempts",
    description:
      "No sign-in: the attempt id is the access, and whoever holds it may use it. Strict: a field the server owns (`correct`, `mistake_class`, `help_used`) is refused. Idempotent by `event_id`.",
  },
  help: {
    method: "POST",
    path: "/api/v1/attempts/{id}/questions/{seq}/help",
    params: z.object({ id: AttemptId, seq: Seq }),
    body: HelpRequest,
    response: HelpResult,
    status: 200,
    auth: "none",
    summary: "Releases the next rung of help for one question.",
    tag: "attempts",
    description:
      "No sign-in: the attempt id is the access, and whoever holds it may use it. The page sends the `help_released` it has seen, so a retried request returns the same rung. Rung 4 ends the question skipped and asks its twin.",
  },
  patchAttempt: {
    method: "PATCH",
    path: "/api/v1/attempts/{id}",
    params: z.object({ id: AttemptId }),
    body: AttemptPatch,
    response: AttemptSnapshot,
    status: 200,
    auth: "none",
    summary: "Pauses or resumes an attempt.",
    tag: "attempts",
    description:
      "No sign-in: the attempt id is the access, and whoever holds it may use it. The server finishes an attempt itself.",
  },
  getResults: {
    method: "GET",
    path: "/api/v1/attempts/{id}/results",
    params: z.object({ id: AttemptId }),
    body: null,
    response: AttemptResults,
    status: 200,
    auth: "none",
    summary: "Reads an attempt's results in question order, mid-lesson too.",
    tag: "attempts",
    description: "No sign-in: the attempt id is the access, and whoever holds it may use it.",
  },
  getReview: {
    method: "GET",
    path: "/api/v1/attempts/{id}/review",
    params: z.object({ id: AttemptId }),
    body: null,
    response: AttemptReview,
    status: 200,
    auth: "none",
    summary: "Reads a finished attempt's questions again, for the child.",
    tag: "attempts",
    description:
      "No sign-in: the attempt id is the access, and whoever holds it may use it. 409 `AttemptNotFinished` before the attempt ends.",
  },
  getMe: {
    method: "GET",
    path: "/api/v1/me",
    params: z.object({}),
    body: null,
    response: Me,
    status: 200,
    auth: "token",
    summary: "Reads the signed-in adult: account, pod and learners.",
    tag: "parents",
    description:
      "Before the first sign-in has made an account, `account`, `member` and `pod` are null and `learners` is empty.",
  },
  createAccount: {
    method: "POST",
    path: "/api/v1/accounts",
    params: z.object({}),
    body: AccountCreate,
    response: Me,
    status: 201,
    auth: "token",
    summary: "Makes the account and pod on the first sign-in.",
    tag: "parents",
    description:
      "Idempotent per signed-in user: a second call makes nothing and returns the same reply.",
  },
  createLearner: {
    method: "POST",
    path: "/api/v1/learners",
    params: z.object({}),
    body: LearnerCreate,
    response: LearnerSnapshot,
    status: 201,
    auth: "token",
    summary: "Adds a child to the caller's pod.",
    tag: "parents",
    description: "The server makes the `handle`, unique in the pod, from the first name.",
  },
  claimAttempt: {
    method: "POST",
    path: "/api/v1/attempts/{id}/claims",
    params: z.object({ id: AttemptId }),
    body: AttemptClaim,
    response: Claim,
    status: 201,
    auth: "token",
    summary: "Attaches an anonymous attempt to a learner in the caller's pod.",
    tag: "parents",
    description:
      "A replay by the same account for the same learner returns the stored claim; any other claim of a claimed attempt is 409 `AttemptClaimed`.",
  },
  getLearnerAttempts: {
    method: "GET",
    path: "/api/v1/learners/{id}/attempts",
    params: z.object({ id: LearnerId }),
    body: null,
    response: LearnerAttempts,
    status: 200,
    auth: "token",
    summary: "Lists a learner's attempts, newest first.",
    tag: "parents",
  },
  getAssignmentAttempts: {
    method: "GET",
    path: "/api/v1/assignments/{id}/attempts",
    params: z.object({ id: AssignmentId }),
    body: null,
    response: AssignmentAttempts,
    status: 200,
    auth: "token",
    summary: "Lists one assignment's attempts the caller's pod may read: the lesson overview.",
    tag: "parents",
    description: "404 when the pod reads none of them.",
  },
  getParentReview: {
    method: "GET",
    path: "/api/v1/learners/{id}/attempts/{attempt}/review",
    params: z.object({ id: LearnerId, attempt: AttemptId }),
    body: null,
    response: ParentAttemptReview,
    status: 200,
    auth: "token",
    summary: "Reads a finished attempt of the caller's learner, with every try.",
    tag: "parents",
    description: "409 `AttemptNotFinished` before the attempt ends.",
  },
  // The learner knowledge base (wave 1 of epic dl-e8ov.5): a learner of the caller's pod.
  getLearnerSkills: {
    method: "GET",
    path: "/api/v1/learners/{id}/skills",
    params: z.object({ id: LearnerId }),
    body: null,
    response: LearnerSkills,
    status: 200,
    auth: "token",
    summary: "Reads where a learner stands on each skill, each goal's lists and the brief.",
    tag: "parents",
    description:
      "Folded on read from the learner's evidence: code computes every level, status and list. No level name, score or percentage is ever shown to the parent.",
  },
  listSkills: {
    method: "GET",
    path: "/api/v1/skills",
    params: z.object({}),
    body: null,
    response: Skills,
    status: 200,
    auth: "token",
    summary: "Lists the skill catalogue the caller's pod reads.",
    tag: "parents",
    description:
      "The pod's own skills and the shared catalogue's, a pod's own row winning for its code.",
  },
  getLearnerGoals: {
    method: "GET",
    path: "/api/v1/learners/{id}/goals",
    params: z.object({ id: LearnerId }),
    body: null,
    response: LearnerGoals,
    status: 200,
    auth: "token",
    summary: "Lists a learner's goals with their skills, oldest first.",
    tag: "parents",
  },
  createGoal: {
    method: "POST",
    path: "/api/v1/learners/{id}/goals",
    params: z.object({ id: LearnerId }),
    body: GoalCreate,
    response: LearnerGoals,
    status: 201,
    auth: "token",
    summary: "Adds a goal to a learner, in the parent's words, with its skills.",
    tag: "parents",
    description:
      "A skill code the pod has no row for is copied from the shared catalogue, or kept as a draft when the catalogue has none.",
  },
  patchGoal: {
    method: "PATCH",
    path: "/api/v1/learners/{id}/goals/{goal}",
    params: z.object({ id: LearnerId, goal: GoalId }),
    body: GoalPatch,
    response: LearnerGoals,
    status: 200,
    auth: "token",
    summary: "Changes a goal's status or skills.",
    tag: "parents",
    description: "`skill_codes` replaces the goal's skills whole.",
  },
  getLearnerReports: {
    method: "GET",
    path: "/api/v1/learners/{id}/reports",
    params: z.object({ id: LearnerId }),
    body: null,
    response: LearnerReports,
    status: 200,
    auth: "token",
    summary: "Lists a learner's reports, newest first.",
    tag: "parents",
  },
  createReport: {
    method: "POST",
    path: "/api/v1/learners/{id}/reports",
    params: z.object({ id: LearnerId }),
    body: ReportCreate,
    response: LearnerReport,
    status: 201,
    auth: "token",
    summary: "Makes a report on a learner from the evidence: code's digest, no narrative yet.",
    tag: "parents",
    description:
      "Rebuilds the learner's mastery first. When the evidence has not changed since the last report, the new one is a copy of its digest, `reused: true`.",
  },
  patchReport: {
    method: "PATCH",
    path: "/api/v1/learners/{id}/reports/{report}",
    params: z.object({ id: LearnerId, report: LearnerReportId }),
    body: ReportPatch,
    response: LearnerReport,
    status: 200,
    auth: "token",
    summary:
      "Writes a report's narrative once, or records the parent's decisions on its proposals.",
    tag: "parents",
    description:
      "A 2nd narrative is 409 `WriteOnce`; a decision on a proposal the digest does not have is 400 `BadRequest`.",
  },
  // The AI engine's conversations (epic dl-z5ja, dl-z5ja.21): a parent's chat, one run per turn.
  // The API only writes the inbox row and enqueues the step; the step host runs it.
  createConversation: {
    method: "POST",
    path: "/api/v1/conversations",
    params: z.object({}),
    body: ConversationCreate,
    response: Conversation,
    status: 201,
    auth: "token",
    summary: "Starts a conversation with the AI in the caller's pod.",
    tag: "conversations",
    description:
      "Idempotent by `event_id`: a resend makes nothing new and returns the same conversation.",
  },
  listConversations: {
    method: "GET",
    path: "/api/v1/conversations",
    params: z.object({}),
    body: null,
    response: Conversations,
    status: 200,
    auth: "token",
    summary: "Lists the caller's pod's conversations, newest first.",
    tag: "conversations",
    description: "An archived conversation is left out: it is kept for the pod, never listed.",
  },
  patchConversation: {
    method: "PATCH",
    path: "/api/v1/conversations/{id}",
    params: z.object({ id: ConversationId }),
    body: ConversationPatch,
    response: Conversation,
    status: 200,
    auth: "token",
    summary: "Archives a conversation: the parent's delete.",
    tag: "conversations",
    description:
      "Idempotent: archiving again keeps the first `archived_at`. Nothing is deleted; the conversation and its runs stay with the pod. A message to it after is 409 `ConversationArchived`.",
  },
  postMessage: {
    method: "POST",
    path: "/api/v1/conversations/{id}/messages",
    params: z.object({ id: ConversationId }),
    body: ConversationMessage,
    response: RunAccepted,
    status: 201,
    auth: "token",
    summary: "Sends the parent's message, on the open turn or a new one.",
    tag: "conversations",
    description:
      "Idempotent by `event_id`: a resend returns the run that holds the message, and the same `event_id` with other text is 409 `EventIdMismatch`. The reply comes before the AI answers: read the run's events for its answer.",
  },
  listConversationRuns: {
    method: "GET",
    path: "/api/v1/conversations/{id}/runs",
    params: z.object({ id: ConversationId }),
    body: null,
    response: ConversationRuns,
    status: 200,
    auth: "token",
    summary: "Lists a conversation's runs, one per turn, oldest first.",
    tag: "conversations",
  },
  listRunEvents: {
    method: "GET",
    path: "/api/v1/runs/{id}/events",
    params: z.object({ id: RunId }),
    query: z.object({ after: After.optional() }),
    body: null,
    response: RunEvents,
    status: 200,
    auth: "token",
    summary: "Lists a run's events after a cursor, in `seq` order.",
    tag: "conversations",
    description:
      "`after` is the last `seq` the caller holds, 0 or left out for the whole log. The events are append-only, so a cursor never misses one.",
  },
  cancelRun: {
    method: "POST",
    path: "/api/v1/runs/{id}/cancellations",
    params: z.object({ id: RunId }),
    body: RunCancel,
    response: RunAccepted,
    status: 201,
    auth: "token",
    summary: "Asks a run to stop at its next step.",
    tag: "conversations",
    description:
      "Idempotent by `event_id`. A run that has already ended is returned as it is. The run stops at its next step, so read its events for `cancelled`.",
  },
  /** A bank search: the need in, the envelope out (`src/bank.ts`). */
  questionSearches: {
    method: "POST",
    path: "/api/v1/question-searches",
    params: z.object({}),
    body: Need,
    response: SearchEnvelope,
    status: 200,
    // No Supabase token: the caller holds the bank's shared read token, which apps/api checks
    // (questions.ts), so API Gateway's JWT authorizer stays off this route.
    auth: "none",
    summary: "Searches the question bank: a need in, ranked questions out.",
    tag: "bank",
    description: "Called with the bank's shared read token, not a Supabase token.",
  },
  /**
   * One bank question's body with its key, from the content bucket (`src/bank.ts`). The id is
   * checked against `BankQuestionId` in apps/api after the read token, so a caller without the
   * token is 401 whatever id it sends.
   */
  questionBody: {
    method: "GET",
    path: "/api/v1/questions/{id}",
    params: z.object({ id: z.string() }),
    body: null,
    response: QuestionBody,
    status: 200,
    // Like questionSearches: the bank's shared read token, checked in apps/api (questions.ts).
    auth: "none",
    summary: "Reads one bank question's body, with its answer key.",
    tag: "bank",
    description:
      "Called with the bank's shared read token, not a Supabase token: without it the reply is 401, whatever the id.",
  },
} as const satisfies Record<string, Route>;
export type RouteName = keyof typeof ROUTES;
