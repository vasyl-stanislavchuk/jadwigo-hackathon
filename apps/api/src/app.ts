import { Router } from "@aws-lambda-powertools/event-handler/http";
import { ErrorType, LIMITS, ROUTES, type RouteName } from "@jadwigo/contracts";
import type { Store } from "@jadwigo/store";
import { answer, getAttempt, startAttempt } from "./attempts.ts";
import { ApiError, errorResponse, json, refusal } from "./errors.ts";
import { featuredLessons } from "./featured.ts";
import { type BankDeps, searchQuestions } from "./questions.ts";
import { getResults, help, patchAttempt } from "./session.ts";

type Params<N extends RouteName> = ReturnType<(typeof ROUTES)[N]["params"]["parse"]>;
type Handle<N extends RouteName> = (
  params: Params<N>,
  body: unknown,
  headers: Headers,
) => Promise<unknown>;

/**
 * The `/api/v1` routes on the Powertools router, each registered from `ROUTES` (RULES.md rule
 * 22). A handler gets its parsed path parameters and the raw body, and parses the body itself; its
 * reply is parsed with the route's response schema, which drops anything the schema does not name.
 * A refusal is `{error: {type, message}}` with the status `ERROR_STATUS` gives it.
 */
export function createApp(store: Store, bank?: BankDeps): Router {
  const app = new Router();

  const on = <N extends RouteName>(name: N, handle: Handle<N>): void => {
    const route = ROUTES[name];
    const path = route.path.replace(/\{(\w+)\}/g, ":$1") as `/${string}`;
    const method = route.method.toLowerCase() as "get" | "post" | "patch";
    app[method](path, async ({ req, params }) => {
      try {
        const parsed = route.params.safeParse(params);
        // An id that does not parse names no record.
        if (!parsed.success) throw new ApiError(ErrorType.enum.NotFound, "no such record");
        const body = route.body === null ? undefined : await bodyOf(req);
        const reply = await handle(parsed.data as Params<N>, body, req.headers);
        return json(route.status, route.response.parse(reply));
      } catch (error) {
        const refused = refusal(error);
        if (refused) return refused;
        throw error;
      }
    });
  };

  on("health", async () => ({ status: "ok" }));
  // Public by design: no authorize(). It reads only the featured pod's open anyone-assignments,
  // and a start on one is authorized like any other (decision 2026-10-26-the-login-free-lesson-is-
  // protected-by-invisible-limits-only-per).
  on("featuredLessons", () => featuredLessons(store));
  on("startAttempt", (params, body) => startAttempt(store, params.id, body));
  on("getAttempt", (params) => getAttempt(store, params.id));
  on("answer", (params, body) => answer(store, params.id, body));
  on("help", (params, body) => help(store, params.id, params.seq, body));
  on("patchAttempt", (params, body) => patchAttempt(store, params.id, body));
  on("getResults", (params) => getResults(store, params.id));
  on("questionSearches", (_, body, headers) => searchQuestions(bank, headers, body));

  app.notFound(async () => errorResponse(ErrorType.enum.NotFound, "no such route"));
  return app;
}

/**
 * The body as JSON. One past `LIMITS.bodyBytes` is refused before it is parsed, so nothing is judged
 * or stored, and a content-length that is not a byte count is refused before the body is read.
 */
async function bodyOf(req: Request): Promise<unknown> {
  const length = req.headers.get("content-length");
  if (length !== null && !/^\d+$/.test(length.trim())) {
    throw new ApiError(ErrorType.enum.BadRequest, "the content-length is not a number of bytes");
  }
  if (Number(length ?? 0) > LIMITS.bodyBytes) throw tooLarge();
  const text = await req.text();
  if (new TextEncoder().encode(text).byteLength > LIMITS.bodyBytes) throw tooLarge();
  if (text.trim() === "") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(ErrorType.enum.BadRequest, "the body is not JSON");
  }
}

function tooLarge(): ApiError {
  return new ApiError(ErrorType.enum.BadRequest, `the body is over ${LIMITS.bodyBytes} bytes`);
}
