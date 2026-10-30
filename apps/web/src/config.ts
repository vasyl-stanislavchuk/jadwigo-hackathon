// The one place apps/web reads its environment (lint/no-raw-process-env.grit).
import { builderSession, draftsDir } from "../../../tools/builder/config.ts";
import { apiPort, DEV_PORTS, port } from "../../../tools/src/ports.ts";

/** The dev server's port: md's WEB_PORT in a worktree, 5173 in the main checkout. */
export function webPort(env: Record<string, string | undefined> = process.env): number {
  return port("WEB_PORT", DEV_PORTS.WEB_PORT, env);
}

/** Where the dev and preview servers send /api (vite.config.ts): JW_API_URL, else the local api on
 * the port it listens on (tools/src/ports.ts apiPort). In production /api is the same origin as the
 * page, with no proxy. */
export function apiTarget(env: Record<string, string | undefined> = process.env): string {
  return env["JW_API_URL"] || `http://127.0.0.1:${apiPort(env)}`;
}

/** Whether the lesson player's browser test runs: it needs an api with the featured lessons
 * seeded (playwright.config.ts, e2e/play.spec.ts). */
export function playE2e(env: Record<string, string | undefined> = process.env): boolean {
  return env["JW_E2E_API"] === "1";
}

/** Where the parent signs in (dl-e8ov.2.38): a Supabase project's URL and its publishable key, which
 * a browser may hold. The build bakes them in (vite.config.ts); with either unset, the app has no
 * sign-in and the results offer no "save your progress". */
export function authConfig(
  env: Record<string, string | undefined> = process.env,
): { url: string; key: string } | null {
  const url = env["JW_SUPABASE_URL"];
  const key = env["JW_SUPABASE_KEY"];
  return url && key ? { url, key } : null;
}

/** The live lesson builder's dev-server side (dev/builder-plugin.ts, dl-a38n): JADWIGO_DRAFTS_DIR,
 * the directory jw writes drafts to (default ~/.local/state/jadwigo/drafts), and the session
 * `make builder` started, when this server runs in its environment (else session.json names it). */
export function builderEnv(env: Record<string, string | undefined> = process.env): {
  draftsDir: string;
  session: string;
} {
  return { draftsDir: draftsDir(env), session: builderSession(env) };
}
