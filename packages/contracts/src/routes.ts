import { z } from "zod";
import { Need, QuestionBody, SearchEnvelope } from "./bank.ts";
import { AssignmentId, AttemptId, LearnerId } from "./ids.ts";
import { Language } from "./records.ts";
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
  Featured,
  Health,
  HelpRequest,
  HelpResult,
  LearnerAttempts,
  LearnerCreate,
  LearnerSnapshot,
  Me,
  ParentAttemptReview,
  PlaygroundExamples,
} from "./wire.ts";

/**
 * The `/api/v1` route table, named once (RULES.md rules 14 to 18). `apps/api` registers these and
 * `packages/api-client` calls them; neither writes a path or a schema of its own.
 */
export interface Route {
  readonly method: "GET" | "POST" | "PATCH";
  readonly path: string;
  readonly params: z.ZodType;
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
export const ROUTE_TAGS = ["attempts", "parents", "lessons", "bank", "health"] as const;
export type RouteTag = (typeof ROUTE_TAGS)[number];

const Seq = z.coerce.number().pipe(z.int().min(1));

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
      "Strict: a field the server owns (`correct`, `mistake_class`, `help_used`) is refused. Idempotent by `event_id`.",
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
      "The page sends the `help_released` it has seen, so a retried request returns the same rung. Rung 4 ends the question skipped and asks its twin.",
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
    description: "The server finishes an attempt itself.",
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
    description: "409 `AttemptNotFinished` before the attempt ends.",
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
  },
} as const satisfies Record<string, Route>;
export type RouteName = keyof typeof ROUTES;
