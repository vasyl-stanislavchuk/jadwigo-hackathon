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
  ErrorEnvelope,
  type ErrorType,
  type Featured,
  type HelpRequest,
  type HelpResult,
  type Language,
  type LearnerAttempts,
  type LearnerCreate,
  type LearnerId,
  type LearnerSnapshot,
  type Me,
  type ParentAttemptReview,
  type PlaygroundExamples,
  ROUTES,
  type Route,
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

/** Every `/api/v1` call this client makes. */
export type Client = AttemptClient & FeaturedClient & ParentClient & PlaygroundClient;

/** A route's path with its `{name}` params filled in. */
export function pathOf(route: Route, params: Record<string, string | number>): string {
  return route.path.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`${route.path} needs ${name}`);
    return encodeURIComponent(String(value));
  });
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
      reply = await send(apiUrl(base, pathOf(route, params)), init);
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
    createLearner: (body) => call(ROUTES.createLearner, {}, body),
    claimAttempt: (attemptId, body) => call(ROUTES.claimAttempt, { id: attemptId }, body),
    getLearnerAttempts: (learnerId) =>
      call(ROUTES.getLearnerAttempts, { id: learnerId }, undefined),
    getParentReview: (learnerId, attemptId) =>
      call(ROUTES.getParentReview, { id: learnerId, attempt: attemptId }, undefined),
    getAssignmentAttempts: (assignmentId) =>
      call(ROUTES.getAssignmentAttempts, { id: assignmentId }, undefined),
    playgroundExamples: (language) => call(ROUTES.playgroundExamples, { language }, undefined),
  };
}
