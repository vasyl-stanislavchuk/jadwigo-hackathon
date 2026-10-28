// The browser smoke CI runs (the browser job in .github/workflows/ci.yml). Playwright is CI's job:
// locally it is run only on purpose, with `bun run e2e` from apps/web.
//
// The lesson player's test (e2e/play.spec.ts) plays a featured lesson against a real api, so it
// runs only when JW_E2E_API=1, with the api at JW_API_URL (src/config.ts) and the featured lessons
// seeded. The spec's header says how.
//
// The build gets a Supabase project that does not exist (JW_SUPABASE_URL, src/config.ts), so the
// results offer "save your progress"; e2e/parent.spec.ts answers its auth calls with page.route.
import { defineConfig, devices } from "@playwright/test";
import { playE2e, webPort } from "./src/config.ts";

const port = webPort();
const laptop = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } };
const PLAY = /play\.spec\.ts$/;

export default defineConfig({
  testDir: "e2e",
  forbidOnly: true,
  retries: 1,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${port}` },
  projects: [
    {
      name: "phone",
      testIgnore: PLAY,
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
    { name: "laptop", testIgnore: PLAY, use: laptop },
    ...(playE2e() ? [{ name: "api", testMatch: PLAY, use: laptop }] : []),
  ],
  webServer: {
    command: "bunx vite build && bunx vite preview",
    port,
    reuseExistingServer: false,
    env: { JW_SUPABASE_URL: "http://127.0.0.1:54321", JW_SUPABASE_KEY: "e2e" },
    timeout: 120_000,
  },
});
