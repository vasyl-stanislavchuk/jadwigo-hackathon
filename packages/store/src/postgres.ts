import type { Store } from "./store.ts";

/**
 * The Store on Postgres, through Kysely, as the `jadwigo_api` role with `app.pod_id` set in each
 * transaction. Built by `dl-e8ov.2.32.3`, held to `store.contract.ts` as InMemoryStore is.
 */
export function createPostgresStore(_databaseUrl: string): Store {
  throw new Error("PostgresStore is built in dl-e8ov.2.32.3");
}
