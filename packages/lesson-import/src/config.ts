/** The seed's one read of the environment. */
export function databaseUrl(): string {
  const url = process.env["DATABASE_URL"];
  if (!url) {
    throw new Error(
      "DATABASE_URL is unset: make db-seed sets it, or postgresql://localhost:5433/jadwigo from .env.local.",
    );
  }
  return url;
}
