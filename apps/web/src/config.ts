// The one place apps/web reads its environment (lint/no-raw-process-env.grit).
import { draftsDir as builderDraftsDir } from "../../../tools/builder/config.ts";
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

/** The providers a parent may sign in with besides the email code, in the order /parent shows their
 * buttons under it: Google, then Facebook (decision 2026-10-30-the-parent-sign-in-screen-lists-the-
 * email-code-first-then-google, dl-clww). */
const PROVIDERS = ["google", "facebook"] as const;
export type Provider = (typeof PROVIDERS)[number];

/** Where the parent signs in (dl-e8ov.2.38): a Supabase project's URL and its publishable key, which
 * a browser may hold. The build bakes them in (vite.config.ts); with either unset, the app has no
 * sign-in and the results offer no "save your progress".
 *
 * JW_SUPABASE_PROVIDERS, a comma list such as `google,facebook`, turns on each provider's button
 * (dl-e8ov.2.51). Unset or empty, there is none, so a provider shows only once the owner switches it
 * on in the project (dl-e8ov.2.8, dl-e8ov.2.58). A name it does not know is left out. */
export function authConfig(
  env: Record<string, string | undefined> = process.env,
): { url: string; key: string; providers: Provider[] } | null {
  const url = env["JW_SUPABASE_URL"];
  const key = env["JW_SUPABASE_KEY"];
  const named = (env["JW_SUPABASE_PROVIDERS"] ?? "").split(",").map((name) => name.trim());
  const providers = PROVIDERS.filter((provider) => named.includes(provider));
  return url && key ? { url, key, providers } : null;
}

/** Where jw writes lesson drafts and the lesson builder reads them (dl-a38n, lead decision 1):
 * tools/builder's resolver, so jw's default lives in one place. */
export function draftsDir(env: Record<string, string | undefined> = process.env): string {
  return builderDraftsDir(env);
}

/** The Claude Code session `make builder` started (JADWIGO_BUILDER_SESSION), when this dev server
 * runs in its environment; else "", and the drafts directory's .builder/session.json names it
 * (dl-a38n.15). */
export function builderSession(env: Record<string, string | undefined> = process.env): string {
  return (env["JADWIGO_BUILDER_SESSION"] ?? "").trim();
}
