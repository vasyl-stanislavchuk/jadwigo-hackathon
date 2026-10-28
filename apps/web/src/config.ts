// The one place apps/web reads its environment (lint/no-raw-process-env.grit).
import { port } from "../../../tools/src/ports.ts";

/** The dev server's port: md's WEB_PORT in a worktree, 5173 in the main checkout. */
export function webPort(env: Record<string, string | undefined> = process.env): number {
  return port("WEB_PORT", 5173, env);
}

/** Where the dev and preview servers send /api (vite.config.ts): JW_API_URL, else the local api on
 * its default port. In production /api is the same origin as the page, with no proxy. */
export function apiTarget(env: Record<string, string | undefined> = process.env): string {
  return env["JW_API_URL"] || "http://127.0.0.1:8787";
}

/** Whether the lesson player's browser test runs: it needs an api with the featured lessons
 * seeded (playwright.config.ts, e2e/play.spec.ts). */
export function playE2e(env: Record<string, string | undefined> = process.env): boolean {
  return env["JW_E2E_API"] === "1";
}
