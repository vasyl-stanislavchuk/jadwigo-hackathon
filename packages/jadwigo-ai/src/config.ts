/** The engine's one read of the environment: the database the queue's integration test uses. */
export function databaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "DATABASE_URL is unset. Locally: postgresql://localhost:5433/jadwigo_test (Postgres.app 17), from .env.local.",
    );
  }
  return url;
}
