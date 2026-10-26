/** The store's one read of the environment. */
export function databaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "DATABASE_URL is unset. Locally: postgresql://localhost/jadwigo_test (Postgres.app).",
    );
  }
  return url;
}
