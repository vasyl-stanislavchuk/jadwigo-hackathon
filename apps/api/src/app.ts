import { Router } from "@aws-lambda-powertools/event-handler/http";
import { ErrorType, LIMITS, ROUTES, type Route, type RouteName } from "@jadwigo/contracts";
import type { RunQueue } from "@jadwigo/jadwigo-ai";
import type { Store } from "@jadwigo/store";
import { answer, getAttempt, startAttempt } from "./attempts.ts";
import { type Authenticate, type Claims, signedOut } from "./auth.ts";
import {
  cancelRun,
  createConversation,
  type EngineRouteDeps,
  listConversationRuns,
  listRunEvents,
  postMessage,
  type ReadMessageUsage,
} from "./conversations.ts";
import { ApiError, badRequest, errorResponse, json, refusal } from "./errors.ts";
import { featuredLessons } from "./featured.ts";
import {
  createGoal,
  createReport,
  getLearnerGoals,
  getLearnerReports,
  getLearnerSkills,
  listSkills,
  patchGoal,
  patchReport,
} from "./knowledge.ts";
import {
  claimAttempt,
  createAccount,
  createLearner,
  getAssignmentAttempts,
  getLearnerAttempts,
  getMe,
} from "./people.ts";
import { playgroundExamples } from "./playground.ts";
import { type BankDeps, type BucketDeps, questionBody, searchQuestions } from "./questions.ts";
import { getParentReview, getReview } from "./review.ts";
import { getResults, help, patchAttempt } from "./session.ts";

/** A route's parsed path parameters, and its query's when it reads one. */
type Params<N extends RouteName> = ReturnType<(typeof ROUTES)[N]["params"]["parse"]> &
  ((typeof ROUTES)[N] extends { query: { parse: (v: unknown) => infer Q } } ? Q : unknown);
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
  /** The content bucket the question body route reads. With none, that route answers 502. */
  readonly bucket?: BucketDeps | undefined;
  /**
   * Where the conversation routes enqueue a run's step. With none, a message or a Stop fails and
   * its unit rolls back, so nothing waits in an inbox with no step to take it.
   */
  readonly queue?: RunQueue | undefined;
  /**
   * What a message's limits count (dl-z5ja.62). With none, every message fails and its unit rolls
   * back: a budget the API cannot read is never spent.
   */
  readonly usage?: ReadMessageUsage | undefined;
  /** The engine's clock for a run's deadlines and the limits' windows. */
  readonly now?: () => Date;
}

const NO_USAGE: ReadMessageUsage = () =>
  Promise.reject(new Error("no message usage is wired: a message is never sent unchecked"));

/** No queue is wired: every send fails, and the unit that asked rolls back. */
const NO_QUEUE: RunQueue = {
  send: () => Promise.reject(new Error("no run queue is wired")),
  read: () => Promise.reject(new Error("no run queue is wired")),
  archive: () => Promise.reject(new Error("no run queue is wired")),
  deadLetters: () => Promise.reject(new Error("no run queue is wired")),
};

/**
 * The `/api/v1` routes on the Powertools router, each registered from `ROUTES` (RULES.md rule
 * 22). A handler gets its parsed path parameters and the raw body, and parses the body itself; its
 * reply is parsed with the route's response schema, which drops anything the schema does not name.
 * A refusal is `{error: {type, message}}` with the status `ERROR_STATUS` gives it. The store may
 * still be opening: only the routes that read it wait for it, so health answers while the Lambda's
 * database URL is still being read, and when that read has failed. Every route that reads the store
 * runs as one `store.unit()`: one transaction on Postgres, rolled back with whatever it wrote on a
 * refusal. A token route (`auth: "token"`) runs only with the claims `authenticate` verified, else
 * it is 401 `NotSignedIn`; with no `authenticate`, none is ever verified.
 */
export function createApp(
  store: Store | Promise<Store>,
  { authenticate = signedOut, bank, bucket, queue, usage, now = () => new Date() }: AppDeps = {},
): Router {
  const app = new Router();
  const engine: EngineRouteDeps = { queue: queue ?? NO_QUEUE, usage: usage ?? NO_USAGE, now };

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
        const query = queryOf(route, req);
        const body = route.body === null ? undefined : await bodyOf(req);
        const reply = await handle(
          { ...(parsed.data as object), ...query } as Params<N>,
          body,
          req.headers,
          claims,
        );
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
  // One unit per request that reads the store: one transaction on Postgres, not one per call.
  const run = async <T>(work: (opened: Store) => Promise<T>): Promise<T> => {
    const opened = await store;
    return opened.unit(() => work(opened));
  };

  on("featuredLessons", () => run((s) => featuredLessons(s)));
  // Public by design: no authorize(). It reads only Jadwigo's own pod's written playground
  // examples, which hold no learner's data (dl-w3.75).
  on("playgroundExamples", (params) => run((s) => playgroundExamples(s, params.language)));
  on("startAttempt", (params, body) => run((s) => startAttempt(s, params.id, body)));
  on("getAttempt", (params) => run((s) => getAttempt(s, params.id)));
  on("answer", (params, body) => run((s) => answer(s, params.id, body)));
  on("help", (params, body) => run((s) => help(s, params.id, params.seq, body)));
  on("patchAttempt", (params, body) => run((s) => patchAttempt(s, params.id, body)));
  on("getResults", (params) => run((s) => getResults(s, params.id)));
  on("getReview", (params) => run((s) => getReview(s, params.id)));
  // No store: the bank answers it (questions.ts).
  on("questionSearches", (_, body, headers) => searchQuestions(bank, headers, body));
  on("questionBody", (params, _body, headers) => questionBody(bank, bucket, headers, params.id));
  // The token was verified before the unit opens; the member lookup and the route's reads and
  // writes are one unit, so the claim is one transaction.
  onSigned("getMe", (_params, _body, claims) => run((s) => getMe(s, claims)));
  onSigned("createAccount", (_params, body, claims) => run((s) => createAccount(s, claims, body)));
  onSigned("createLearner", (_params, body, claims) => run((s) => createLearner(s, claims, body)));
  onSigned("claimAttempt", (params, body, claims) =>
    run((s) => claimAttempt(s, claims, params.id, body)),
  );
  onSigned("getLearnerAttempts", (params, _body, claims) =>
    run((s) => getLearnerAttempts(s, claims, params.id)),
  );
  onSigned("getAssignmentAttempts", (params, _body, claims) =>
    run((s) => getAssignmentAttempts(s, claims, params.id)),
  );
  // Reads under the caller's pod to find the attempt, then under the attempt's own pod.
  onSigned("getParentReview", (params, _body, claims) =>
    run((s) => getParentReview(s, claims, params.id, params.attempt)),
  );

  // The learner knowledge base (wave 1 of epic dl-e8ov.5): a learner of the caller's pod.
  onSigned("getLearnerSkills", (params, _body, claims) =>
    run((s) => getLearnerSkills(s, claims, params.id)),
  );
  onSigned("listSkills", (_params, _body, claims) => run((s) => listSkills(s, claims)));
  onSigned("getLearnerGoals", (params, _body, claims) =>
    run((s) => getLearnerGoals(s, claims, params.id)),
  );
  onSigned("createGoal", (params, body, claims) =>
    run((s) => createGoal(s, claims, params.id, body)),
  );
  onSigned("patchGoal", (params, body, claims) =>
    run((s) => patchGoal(s, claims, params.id, params.goal, body)),
  );
  onSigned("getLearnerReports", (params, _body, claims) =>
    run((s) => getLearnerReports(s, claims, params.id)),
  );
  onSigned("createReport", (params, body, claims) =>
    run((s) => createReport(s, claims, params.id, body)),
  );
  onSigned("patchReport", (params, body, claims) =>
    run((s) => patchReport(s, claims, params.id, params.report, body)),
  );

  // The AI engine's conversations (dl-z5ja.21): the pod is the caller's, and a route only writes
  // the inbox and enqueues; the step host runs the step.
  onSigned("createConversation", (_params, body, claims) =>
    run((s) => createConversation(s, claims, body)),
  );
  onSigned("postMessage", (params, body, claims) =>
    run((s) => postMessage(s, engine, claims, params.id, body)),
  );
  onSigned("listConversationRuns", (params, _body, claims) =>
    run((s) => listConversationRuns(s, claims, params.id)),
  );
  onSigned("listRunEvents", (params, _body, claims) =>
    run((s) => listRunEvents(s, claims, params.id, params.after)),
  );
  onSigned("cancelRun", (params, body, claims) =>
    run((s) => cancelRun(s, engine, claims, params.id, body)),
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

/** The query string, parsed with the route's `query`; a route that reads none gets nothing. */
function queryOf(route: Route, req: Request): object {
  if (route.query === undefined) return {};
  const parsed = route.query.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!parsed.success) throw badRequest(parsed.error.issues);
  return parsed.data;
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
