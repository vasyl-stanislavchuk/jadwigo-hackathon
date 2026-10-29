import { z } from "zod";
import { AssignmentId, AttemptId } from "./ids.ts";
import { Language } from "./records.ts";
import {
  AttemptAnswerRequest,
  AttemptAnswerResult,
  AttemptPatch,
  AttemptResults,
  AttemptSnapshot,
  AttemptStart,
  Featured,
  Health,
  HelpRequest,
  HelpResult,
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
  },
  featuredLessons: {
    method: "GET",
    path: "/api/v1/featured-lessons",
    params: z.object({}),
    body: null,
    response: Featured,
    status: 200,
  },
  playgroundExamples: {
    method: "GET",
    path: "/api/v1/playground-examples/{language}",
    params: z.object({ language: Language }),
    body: null,
    response: PlaygroundExamples,
    status: 200,
  },
  startAttempt: {
    method: "POST",
    path: "/api/v1/assignments/{id}/attempts",
    params: z.object({ id: AssignmentId }),
    body: AttemptStart,
    response: AttemptSnapshot,
    status: 201,
  },
  getAttempt: {
    method: "GET",
    path: "/api/v1/attempts/{id}",
    params: z.object({ id: AttemptId }),
    body: null,
    response: AttemptSnapshot,
    status: 200,
  },
  answer: {
    method: "POST",
    path: "/api/v1/attempts/{id}/answers",
    params: z.object({ id: AttemptId }),
    body: AttemptAnswerRequest,
    response: AttemptAnswerResult,
    status: 201,
  },
  help: {
    method: "POST",
    path: "/api/v1/attempts/{id}/questions/{seq}/help",
    params: z.object({ id: AttemptId, seq: Seq }),
    body: HelpRequest,
    response: HelpResult,
    status: 200,
  },
  patchAttempt: {
    method: "PATCH",
    path: "/api/v1/attempts/{id}",
    params: z.object({ id: AttemptId }),
    body: AttemptPatch,
    response: AttemptSnapshot,
    status: 200,
  },
  getResults: {
    method: "GET",
    path: "/api/v1/attempts/{id}/results",
    params: z.object({ id: AttemptId }),
    body: null,
    response: AttemptResults,
    status: 200,
  },
} as const satisfies Record<string, Route>;
export type RouteName = keyof typeof ROUTES;
