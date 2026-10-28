// The browser smoke CI runs (the browser job in .github/workflows/ci.yml). Playwright is CI's job:
// locally it is run only on purpose, with `bun run e2e` from apps/web.
import { defineConfig, devices } from "@playwright/test";
import { webPort } from "./src/config.ts";

const port = webPort();

export default defineConfig({
  testDir: "e2e",
  forbidOnly: true,
  retries: 1,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${port}` },
  projects: [
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    {
      name: "laptop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: "bunx vite build && bunx vite preview",
    port,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
