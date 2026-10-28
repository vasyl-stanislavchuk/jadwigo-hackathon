import { createPostgresStore, type Store } from "@jadwigo/store";
import { createApp } from "./app.ts";
import { databaseUrl } from "./config.ts";

export { createApp } from "./app.ts";

let store: Store | undefined;

/** The Lambda entry: the routes on PostgresStore, which `DATABASE_URL` names. */
export const handler = (
  event: unknown,
  context: Parameters<ReturnType<typeof createApp>["resolve"]>[1],
) => {
  const url = databaseUrl();
  if (url === undefined) throw new Error("DATABASE_URL is unset: the Lambda serves from Postgres");
  store ??= createPostgresStore(url);
  return createApp(store).resolve(event, context);
};
