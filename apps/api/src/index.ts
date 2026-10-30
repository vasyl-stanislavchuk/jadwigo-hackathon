import { createPostgresStore, type Store } from "@jadwigo/store";
import { createApp } from "./app.ts";
import { type Authenticate, jwksUrlAuth, lambdaAuth } from "./auth.ts";
import { authIssuer, authJwksUrl, lambdaDatabaseUrl } from "./config.ts";
import { type BankDeps, type BucketDeps, lambdaBank, lambdaBucket } from "./questions.ts";

export { createApp } from "./app.ts";

/**
 * The Lambda's pool: 1 connection, since one execution serves one request at a time and
 * Supavisor's transaction pooler shares them. A connect that takes over 5 seconds fails the request
 * instead of hanging to the Lambda timeout.
 */
export const LAMBDA_POOL = { max: 1, connectionTimeoutMillis: 5000 } as const;

/**
 * After a failed open, the next one waits 1 s, then 2 s, 4 s and so on up to 60 s, so a broken SSM
 * parameter or database costs one read per wait rather than one per request. A request inside the
 * wait gets the same failure at once.
 */
export const RETRY_FIRST_MS = 1000;
export const RETRY_MAX_MS = 60_000;

type Context = Parameters<ReturnType<typeof createApp>["resolve"]>[1];

export interface HandlerDeps {
  /** The database URL, read once per cold start. */
  readUrl: () => Promise<string>;
  /** The store on that URL. */
  connect: (url: string) => Store;
  now: () => number;
}

const lambdaDeps: HandlerDeps = {
  readUrl: () => lambdaDatabaseUrl(),
  connect: (url) => createPostgresStore(url, LAMBDA_POOL),
  now: () => Date.now(),
};

/**
 * The routes on PostgresStore. The store opens on the first request and is kept for the life of
 * the execution environment. Health never waits for it, so a health check tells an SSM or database
 * fault from an app fault. A failed open is retried on the first request after a capped wait.
 * The search route's bank is the alias in `BANK_SEARCH_ALIAS_ARN`, or none when it is unset.
 * The question body route's bucket is `CONTENT_BUCKET`, else the one SSM names, built once per cold start.
 * API Gateway's authorizer verifies the token routes' tokens; `AUTH_JWKS_URL` and `AUTH_ISSUER`
 * are for a local invoke.
 */
export function createHandler(
  deps: HandlerDeps = lambdaDeps,
  bank: BankDeps | undefined = lambdaBank(),
  authenticate: Authenticate = lambdaAuth(jwksUrlAuth(authJwksUrl(), authIssuer())),
  bucket: BucketDeps = lambdaBucket(),
) {
  let store: Promise<Store> | undefined;
  let failed = false;
  let failures = 0;
  let retryAt = 0;

  const open = (): Promise<Store> => {
    if (store !== undefined && (!failed || deps.now() < retryAt)) return store;
    failed = false;
    const opening = deps.readUrl().then(deps.connect);
    opening.then(
      () => {
        failures = 0;
      },
      () => {
        failed = true;
        failures += 1;
        retryAt = deps.now() + Math.min(RETRY_FIRST_MS * 2 ** (failures - 1), RETRY_MAX_MS);
      },
    );
    store = opening;
    return opening;
  };

  return (event: unknown, context: Context) =>
    createApp(open(), { authenticate, bank, bucket }).resolve(event, context);
}

/** The Lambda entry (`index.handler` in the bundle `make api-bundle` writes). */
export const handler = createHandler();
