import { createPostgresStore, type Store } from "@jadwigo/store";
import { createApp } from "./app.ts";
import { lambdaDatabaseUrl } from "./config.ts";
import { lambdaBank } from "./questions.ts";

export { createApp } from "./app.ts";

let store: Promise<Store> | undefined;
const bank = lambdaBank();

/**
 * The Lambda entry (`index.handler` in the bundle `make api-bundle` writes): the routes on
 * PostgresStore. The database URL is read once per cold start, and the pool holds 1 connection,
 * since one execution serves one request at a time and Supavisor's transaction pooler shares them.
 * A connect that takes over 5 seconds fails the request instead of hanging to the Lambda timeout.
 * The search route's bank is the alias in `BANK_SEARCH_ALIAS_ARN`, or none when it is unset.
 */
export const handler = async (
  event: unknown,
  context: Parameters<ReturnType<typeof createApp>["resolve"]>[1],
) => {
  store ??= lambdaDatabaseUrl().then((url) =>
    createPostgresStore(url, { max: 1, connectionTimeoutMillis: 5000 }),
  );
  store.catch(() => {
    store = undefined;
  });
  return createApp(await store, bank).resolve(event, context);
};
