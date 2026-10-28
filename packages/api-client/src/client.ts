/**
 * The `/api/v1` calls the lesson player makes, typed from the contracts (dl-5ssh.3.1): the featured
 * lessons the home page lists (dl-5ssh.3.6), and an attempt's own calls. Every path comes from
 * `ROUTES` and every reply is parsed with the route's own response schema, so a reply the page
 * cannot trust is an error here, never a shape a view has to guess at (RULES.md rule 18).
 *
 * Two kinds of failure, as the lesson player needs them: a `TransientError` is worth sending again
 * with the same body (no answer from the network, or a 5xx), and an `ApiError` is the server's
 * refusal, carrying the `ErrorType` it named. Neither message ever holds the attempt id: whoever
 * holds the id can answer the attempt (decision
 * 2026-10-28-an-anonymous-attempt-is-bound-to-its-caller-by-its-id-whoever-ho).
 */

import {
  type AssignmentId,
  type AttemptAnswerRequest,
  type AttemptAnswerResult,
  type AttemptId,
  type AttemptPatch,
  type AttemptResults,
  type AttemptSnapshot,
  type AttemptStart,
  ErrorEnvelope,
  type ErrorType,
  type Featured,
  type HelpRequest,
  type HelpResult,
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
}

export interface AttemptClient {
  /** The lessons anyone may play now, oldest first. */
  featuredLessons(): Promise<Featured>;
  startAttempt(assignmentId: AssignmentId, body?: AttemptStart): Promise<AttemptSnapshot>;
  getAttempt(attemptId: AttemptId): Promise<AttemptSnapshot>;
  answer(attemptId: AttemptId, body: AttemptAnswerRequest): Promise<AttemptAnswerResult>;
  help(attemptId: AttemptId, seq: number, body: HelpRequest): Promise<HelpResult>;
  patchAttempt(attemptId: AttemptId, body: AttemptPatch): Promise<AttemptSnapshot>;
  getResults(attemptId: AttemptId): Promise<AttemptResults>;
}

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
}: ClientOptions): AttemptClient {
  async function call<R extends Route>(
    route: R,
    params: Record<string, string | number>,
    body: unknown,
  ): Promise<ReturnType<R["response"]["parse"]>> {
    const init: RequestInit = { method: route.method, headers: { accept: "application/json" } };
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
  };
}
