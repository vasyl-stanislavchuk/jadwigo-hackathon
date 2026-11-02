// The docs' one read of the environment (lint/*.grit: process.env only in a src/config.ts).
import { DEV_PORTS, port } from "../../../tools/src/ports.ts";

/** `astro dev`'s port: md's DOCS_PORT in a worktree, 4322 in the main checkout (tools/src/ports.ts). */
export function docsPort(env: Record<string, string | undefined> = process.env): number {
  return port("DOCS_PORT", DEV_PORTS.DOCS_PORT, env);
}
