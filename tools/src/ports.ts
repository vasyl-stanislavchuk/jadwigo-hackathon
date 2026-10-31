// Ports come from md's environment. The main checkout runs on the defaults .md/repo.toml declares
// under [review.ports] (DEV_PORTS, kept equal by ports.test.ts); every md worktree gets its own
// numbers, exported by `md run` under the same names. Inside a worktree an unset port is an error,
// never a silent fallback onto the main checkout's port.

/**
 * The main checkout's ports. The api's is not 8787, which other local tools hold (dl-5ssh.98), and
 * none sits in md's worktree ranges (8100 and 3100 up). BUILDER_PORT is the lesson builder's own
 * dev server, the one the e2e's "builder" project starts beside the preview (dl-a38n.34): a port of
 * its own, never WEB_PORT + 1, which in a worktree is the next slot's.
 */
export const DEV_PORTS = { WEB_PORT: 5173, API_PORT: 8730, BUILDER_PORT: 5174 } as const;

export function port(
  name: string,
  fallback: number,
  env: Record<string, string | undefined> = process.env,
): number {
  const raw = env[name];
  if (raw === undefined || raw === "") {
    if (env["MEDALLION_DEV_WORKSPACE_NAME"]) {
      throw new Error(
        `${name} is unset inside md worktree ${env["MEDALLION_DEV_WORKSPACE_NAME"]}. Start it with \`md run <id>\`, which exports the worktree's own ports.`,
      );
    }
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name}=${raw} is not a port.`);
  }
  return value;
}

/**
 * The local api's port, which the web dev server's /api proxy follows: md's API_PORT. A bare `PORT`
 * still counts when API_PORT is unset, for the callers that pass one (CI's browser job,
 * `make api-dev`).
 */
export function apiPort(env: Record<string, string | undefined> = process.env): number {
  if (!env["API_PORT"] && env["PORT"]) return port("PORT", DEV_PORTS.API_PORT, env);
  return port("API_PORT", DEV_PORTS.API_PORT, env);
}
