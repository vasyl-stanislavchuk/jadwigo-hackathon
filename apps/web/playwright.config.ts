// The browser smoke CI runs (the browser job in .github/workflows/ci.yml). Playwright is CI's job:
// locally it is run only on purpose, with `bun run e2e` from apps/web.
//
// The lesson player's test (e2e/play.spec.ts) plays a featured lesson against a real api, so it
// runs only when JW_E2E_API=1, with the api at JW_API_URL (src/config.ts) and the featured lessons
// seeded. The spec's header says how.
//
// Parent login's test (e2e/parent.spec.ts) needs the same api, and runs in the same project. The
// build's Supabase project (JW_SUPABASE_URL, src/config.ts) is e2e/auth-server.ts, a stand-in this
// config starts beside the page, so the results offer "save your progress" and the email code
// signs in with no Supabase; the api reads that stand-in's JWKS (AUTH_JWKS_URL).
//
// The lesson builder's test (e2e/lesson-builder.spec.ts, dl-a38n.34) needs what a build never
// carries: the dev server's builder plugin and its HMR. So the "builder" project has a dev server of
// its own on md's BUILDER_PORT, reading a copy of e2e/drafts in one temp dir per worktree port, so
// the render findings the page posts never land in the repo. The main process makes the copy and
// removes it on exit; a worker, which loads this file again, leaves it alone. It needs no api, and
// runs wherever the others do, CI included.
import { cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";
import { AUTH_ORIGIN } from "./e2e/auth-origin.ts";
import { builderPort, playE2e, playwrightWorker, webPort } from "./src/config.ts";

const port = webPort();
const laptop = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } };
/** The specs that need the api: the lesson player, its no-jump check, parent login, and the
 * lesson review (dl-uukj.30): the child's review.spec.ts, the parent's parent-review.spec.ts and
 * the lesson overview's parent-overview.spec.ts; and Google and Facebook sign-in's
 * social-sign-in.spec.ts (dl-e8ov.2.51). */
const API = /(play|no-jump|parent|review|parent-review|parent-overview|social-sign-in)\.spec\.ts$/;
const phone = { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } };
/** The spec that needs the builder's dev server: only the "builder" project runs it. */
const BUILDER = /lesson-builder\.spec\.ts$/;
/** The builder's dev server, beside the preview one, on a port of its own. */
const builder = builderPort();
const drafts = join(tmpdir(), `jw-e2e-drafts-${builder}`);
if (!playwrightWorker()) {
  rmSync(drafts, { recursive: true, force: true });
  cpSync(join(import.meta.dirname, "e2e", "drafts"), drafts, { recursive: true });
  process.on("exit", () => rmSync(drafts, { recursive: true, force: true }));
}

export default defineConfig({
  testDir: "e2e",
  forbidOnly: true,
  retries: 1,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${port}` },
  projects: [
    { name: "phone", testIgnore: [API, BUILDER], use: phone },
    { name: "laptop", testIgnore: [API, BUILDER], use: laptop },
    {
      name: "builder",
      testMatch: BUILDER,
      use: { ...laptop, baseURL: `http://127.0.0.1:${builder}` },
    },
    ...(playE2e()
      ? [
          { name: "api", testMatch: API, use: laptop },
          // The no-jump check again on a phone with touch, the keypad docked.
          {
            name: "api-phone",
            testMatch: /no-jump\.spec\.ts$/,
            use: { ...phone, isMobile: true, hasTouch: true },
          },
        ]
      : []),
  ],
  webServer: [
    {
      command: "bunx vite",
      port: builder,
      reuseExistingServer: false,
      env: { WEB_PORT: String(builder), JADWIGO_DRAFTS_DIR: drafts },
      timeout: 120_000,
    },
    {
      command: "bunx vite build && bunx vite preview",
      port,
      reuseExistingServer: false,
      env: {
        JW_SUPABASE_URL: AUTH_ORIGIN,
        JW_SUPABASE_KEY: "e2e",
        JW_SUPABASE_PROVIDERS: "google,facebook",
      },
      timeout: 120_000,
    },
    ...(playE2e()
      ? [
          {
            command: "bun e2e/auth-server.ts",
            url: `${AUTH_ORIGIN}/auth/v1/.well-known/jwks.json`,
            reuseExistingServer: false,
            timeout: 30_000,
          },
        ]
      : []),
  ],
});
