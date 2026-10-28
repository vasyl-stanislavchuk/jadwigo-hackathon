// The one place apps/web reads its environment (lint/no-raw-process-env.grit).
import { port } from "../../../tools/src/ports.ts";

/** The dev server's port: md's WEB_PORT in a worktree, 5173 in the main checkout. */
export function webPort(env: Record<string, string | undefined> = process.env): number {
  return port("WEB_PORT", 5173, env);
}
