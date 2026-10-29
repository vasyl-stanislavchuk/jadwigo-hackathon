import { Router } from "@aws-lambda-powertools/event-handler/http";
import { ErrorType, LIMITS, ROUTES, type Route, type RouteName } from "@jadwigo/contracts";
import type { Store } from "@jadwigo/store";
import { answer, getAttempt, startAttempt } from "./attempts.ts";
import { type Authenticate, type Claims, signedOut } from "./auth.ts";
import { ApiError, errorResponse, json, refusal } from "./errors.ts";
import { featuredLessons } from "./featured.ts";
import { claimAttempt, createAccount, createLearner, getLearnerAttempts, getMe } from "./people.ts";
import { playgroundExamples } from "./playground.ts";
import { type BankDeps, searchQuestions } from "./questions.ts";
import { getResults, help, patchAttempt } from "./session.ts";

type Params<N extends RouteName> = ReturnType<(typeof ROUTES)[N]["params"]["parse"]>;
type Handle<N extends RouteName> = (
  params: Params<N>,
  body: unknown,
  headers: Headers,
  claims: Claims | undefined,
) => Promise<unknown>;
type OpenRoute = {
  [N in RouteName]: (typeof ROUTES)[N]["auth"] extends "none" ? N : never;
}[RouteName];
type TokenRoute = Exclude<RouteName, OpenRoute>;

/** What the app is built with besides the store. */
export interface AppDeps {
  /** Verifies a token route's token. With none, no token is ever verified. */
  readonly authenticate?: Authenticate;
  /** The bank the search route asks. With none, no bank is wired. */
  readonly bank?: BankDeps | undefined;
}

/**
 * The `/api/v1` routes on the Powertools router, each registered from `ROUTES` (RULES.md rule
 * 22). A handler gets its parsed path parameters and the raw body, and parses the body itself; its
 * reply is parsed with the route's response schema, which drops anything the schema does not name.
 * A refusal is `{error: {type, message}}` with the status `ERROR_STATUS` gives it. The store may
 * still be opening: only the routes that read it wait for it, so health answers while the Lambda's
 * database URL is still being read, and when that read has failed. A token route
 * (`auth: "token"`) runs only with the claims `authenticate` verified, else it is 401
 * `NotSignedIn`; with no `authenticate`, none is ever verified.
 */
export function createApp(
  store: Store | Promise<Store>,
  { authenticate = signedOut, bank }: AppDeps = {},
): Router {
  const app = new Router();

  const register = <N extends RouteName>(name: N, handle: Handle<N>): void => {
    const route: Route = ROUTES[name];
    const path = route.path.replace(/\{(\w+)\}/g, ":$1") as `/${string}`;
    const method = route.method.toLowerCase() as "get" | "post" | "patch";
    app[method](path, async ({ req, params, event }) => {
      try {
        // A token route checks the token before anything else, so an unknown id is 401 too.
        const claims = route.auth === "token" ? await authenticate(req, event) : undefined;
        if (route.auth === "token" && claims === undefined) throw notSignedIn();
        const parsed = route.params.safeParse(params);
        // An id that does not parse names no record.
        if (!parsed.success) throw new ApiError(ErrorType.enum.NotFound, "no such record");
        const body = route.body === null ? undefined : await bodyOf(req);
        const reply = await handle(parsed.data as Params<N>, body, req.headers, claims);
        return json(route.status, route.response.parse(reply));
      } catch (error) {
        const refused = refusal(error);
        if (refused) return refused;
        // The router answers it 500, which the api-5xx alarm counts (dl-5ssh.13); the log line
        // is what tells why. Never the request's body: it may carry a child's answer.
        logFailure(name, error);
        throw error;
      }
    });
  };

  // An open route never sees claims; a token route gets the verified ones.
  const on = <N extends OpenRoute>(
    name: N,
    handle: (params: Params<N>, body: unknown, headers: Headers) => Promise<unknown>,
  ) => register(name, (params, body, headers) => handle(params, body, headers));
  const onSigned = <N extends TokenRoute>(
    name: N,
    handle: (params: Params<N>, body: unknown, claims: Claims) => Promise<unknown>,
  ) =>
    register(name, (params, body, _headers, claims) => {
      if (claims === undefined) throw notSignedIn();
      return handle(params, body, claims);
    });

  on("health", async () => ({ status: "ok" }));
  // Public by design: no authorize(). It reads only the featured pod's open anyone-assignments,
  // and a start on one is authorized like any other (decision 2026-10-26-the-login-free-lesson-is-
  // protected-by-invisible-limits-only-per).
  on("featuredLessons", async () => featuredLessons(await store));
  // Public by design: no authorize(). It reads only Jadwigo's own pod's written playground
  // examples, which hold no learner's data (dl-w3.75).
  on("playgroundExamples", async (params) => playgroundExamples(await store, params.language));
  on("startAttempt", async (params, body) => startAttempt(await store, params.id, body));
  on("getAttempt", async (params) => getAttempt(await store, params.id));
  on("answer", async (params, body) => answer(await store, params.id, body));
  on("help", async (params, body) => help(await store, params.id, params.seq, body));
  on("patchAttempt", async (params, body) => patchAttempt(await store, params.id, body));
  on("getResults", async (params) => getResults(await store, params.id));
  on("questionSearches", (_, body, headers) => searchQuestions(bank, headers, body));
  onSigned("getMe", async (_params, _body, claims) => getMe(await store, claims));
  onSigned("createAccount", async (_params, body, claims) =>
    createAccount(await store, claims, body),
  );
  onSigned("createLearner", async (_params, body, claims) =>
    createLearner(await store, claims, body),
  );
  onSigned("claimAttempt", async (params, body, claims) =>
    claimAttempt(await store, claims, params.id, body),
  );
  onSigned("getLearnerAttempts", async (params, _body, claims) =>
    getLearnerAttempts(await store, claims, params.id),
  );

  app.notFound(async () => errorResponse(ErrorType.enum.NotFound, "no such route"));
  return app;
}

/**
 * One JSON line on stderr for a route that failed in a way no refusal names: the route, the
 * error's name, message and stack. CloudWatch keeps it in the function's log group at level ERROR.
 */
function logFailure(route: RouteName, error: unknown): void {
  const failure =
    error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : { name: typeof error, message: String(error) };
  console.error(JSON.stringify({ level: "ERROR", message: "route failed", route, error: failure }));
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

function notSignedIn(): ApiError {
  return new ApiError(ErrorType.enum.NotSignedIn, "sign in to use this");
}

function tooLarge(): ApiError {
  return new ApiError(ErrorType.enum.BadRequest, `the body is over ${LIMITS.bodyBytes} bytes`);
}
