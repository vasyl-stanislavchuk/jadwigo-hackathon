// The site's one read of the environment (lint/*.grit: process.env only in a src/config.ts).
import { DEV_PORTS, port } from "../../../tools/src/ports.ts";

/**
 * SITE_PREVIEW=1 makes a preview build: every listed language and every unreviewed page, written to
 * dist-preview and never deployed. It is how the /en/ twins are checked before English is live
 * (dl-w0b4.81, lead's call on 2026-11-01).
 */
export const sitePreview: boolean = process.env["SITE_PREVIEW"] === "1";

/** `astro dev`'s port: md's SITE_PORT in a worktree, 4321 in the main checkout (tools/src/ports.ts). */
export function sitePort(env: Record<string, string | undefined> = process.env): number {
  return port("SITE_PORT", DEV_PORTS.SITE_PORT, env);
}

/** PostHog's public project key (decision dl-376c8), or null: then the site loads no analytics.
 * A prod build reads it from infra/site-build/prod.env; `astro dev` from the shell's JW_POSTHOG_KEY. */
export function posthogKey(env: Record<string, string | undefined> = process.env): string | null {
  const key = (env["JW_POSTHOG_KEY"] ?? "").trim();
  return key === "" ? null : key;
}
