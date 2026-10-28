/** The api's one read of the environment. */

/** The database the routes use, or undefined to serve from an in-memory store. */
export function databaseUrl(): string | undefined {
  return process.env["DATABASE_URL"] || undefined;
}

/** The local server's port: md's environment sets `PORT` per worktree (tools/src/ports.ts). */
export function port(): number {
  return Number(process.env["PORT"] || 8787);
}
