import { z } from "zod";
import { Need, SearchEnvelope } from "./bank.ts";
import { AssignmentId, AttemptId, LearnerId } from "./ids.ts";
import { Language } from "./records.ts";
import {
  AccountCreate,
  AttemptAnswerRequest,
  AttemptAnswerResult,
  AttemptClaim,
  AttemptPatch,
  AttemptResults,
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
}

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
  },
  featuredLessons: {
    method: "GET",
    path: "/api/v1/featured-lessons",
    params: z.object({}),
    body: null,
    response: Featured,
    status: 200,
    auth: "none",
  },
  playgroundExamples: {
    method: "GET",
    path: "/api/v1/playground-examples/{language}",
    params: z.object({ language: Language }),
    body: null,
    response: PlaygroundExamples,
    status: 200,
    auth: "none",
  },
  startAttempt: {
    method: "POST",
    path: "/api/v1/assignments/{id}/attempts",
    params: z.object({ id: AssignmentId }),
    body: AttemptStart,
    response: AttemptSnapshot,
    status: 201,
    auth: "none",
  },
  getAttempt: {
    method: "GET",
    path: "/api/v1/attempts/{id}",
    params: z.object({ id: AttemptId }),
    body: null,
    response: AttemptSnapshot,
    status: 200,
    auth: "none",
  },
  answer: {
    method: "POST",
    path: "/api/v1/attempts/{id}/answers",
    params: z.object({ id: AttemptId }),
    body: AttemptAnswerRequest,
    response: AttemptAnswerResult,
    status: 201,
    auth: "none",
  },
  help: {
    method: "POST",
    path: "/api/v1/attempts/{id}/questions/{seq}/help",
    params: z.object({ id: AttemptId, seq: Seq }),
    body: HelpRequest,
    response: HelpResult,
    status: 200,
    auth: "none",
  },
  patchAttempt: {
    method: "PATCH",
    path: "/api/v1/attempts/{id}",
    params: z.object({ id: AttemptId }),
    body: AttemptPatch,
    response: AttemptSnapshot,
    status: 200,
    auth: "none",
  },
  getResults: {
    method: "GET",
    path: "/api/v1/attempts/{id}/results",
    params: z.object({ id: AttemptId }),
    body: null,
    response: AttemptResults,
    status: 200,
    auth: "none",
  },
  getMe: {
    method: "GET",
    path: "/api/v1/me",
    params: z.object({}),
    body: null,
    response: Me,
    status: 200,
    auth: "token",
  },
  createAccount: {
    method: "POST",
    path: "/api/v1/accounts",
    params: z.object({}),
    body: AccountCreate,
    response: Me,
    status: 201,
    auth: "token",
  },
  createLearner: {
    method: "POST",
    path: "/api/v1/learners",
    params: z.object({}),
    body: LearnerCreate,
    response: LearnerSnapshot,
    status: 201,
    auth: "token",
  },
  claimAttempt: {
    method: "POST",
    path: "/api/v1/attempts/{id}/claims",
    params: z.object({ id: AttemptId }),
    body: AttemptClaim,
    response: Claim,
    status: 201,
    auth: "token",
  },
  getLearnerAttempts: {
    method: "GET",
    path: "/api/v1/learners/{id}/attempts",
    params: z.object({ id: LearnerId }),
    body: null,
    response: LearnerAttempts,
    status: 200,
    auth: "token",
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
  },
} as const satisfies Record<string, Route>;
export type RouteName = keyof typeof ROUTES;
