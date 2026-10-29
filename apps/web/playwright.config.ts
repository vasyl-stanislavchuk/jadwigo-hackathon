// The browser smoke CI runs (the browser job in .github/workflows/ci.yml). Playwright is CI's job:
// locally it is run only on purpose, with `bun run e2e` from apps/web.
//
// The lesson player's test (e2e/play.spec.ts) plays a featured lesson against a real api, so it
// runs only when JW_E2E_API=1, with the api at JW_API_URL (src/config.ts) and the featured lessons
// seeded. The spec's header says how.
import { defineConfig, devices } from "@playwright/test";
import { playE2e, webPort } from "./src/config.ts";

const port = webPort();
const laptop = { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } };
/** The specs that play against a real api (JW_E2E_API=1). */
const PLAY = /(play|no-jump)\.spec\.ts$/;
const phone = { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } };

export default defineConfig({
  testDir: "e2e",
  forbidOnly: true,
  retries: 1,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${port}` },
  projects: [
    { name: "phone", testIgnore: PLAY, use: phone },
    { name: "laptop", testIgnore: PLAY, use: laptop },
    ...(playE2e()
      ? [
          { name: "api", testMatch: PLAY, use: laptop },
          // The no-jump check again on a phone with touch, the keypad docked.
          {
            name: "api-phone",
            testMatch: /no-jump\.spec\.ts$/,
            use: { ...phone, isMobile: true, hasTouch: true },
          },
        ]
      : []),
  ],
  webServer: {
    command: "bunx vite build && bunx vite preview",
    port,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
