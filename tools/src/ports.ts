// Ports come from md's environment. The main checkout runs on the defaults .md/repo.toml declares;
// every md worktree gets its own numbers, exported by `md run` under the same names. Inside a
// worktree an unset port is an error, never a silent fallback onto the main checkout's port.

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
