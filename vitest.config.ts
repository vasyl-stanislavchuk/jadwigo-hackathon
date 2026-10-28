// The one Vitest config. Every package's test script runs `vitest run --config ../../vitest.config.ts
// --project unit` from its own directory, so the patterns below are relative to that package.
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const unitSetup = fileURLToPath(new URL("./packages/testing/src/unit-setup.ts", import.meta.url));

export default defineConfig({
  test: {
    // Parallel test runs starved the CPU in david-learns (dl-uukj.27); turbo already runs packages side by side.
    maxWorkers: 2,
    // Several worktrees run `make check` at once, and a render that takes 1 second idle takes 5 or
    // more at a load average of 40 to 90 (dl-5ssh.51). A test that hangs still fails, at 60 seconds.
    testTimeout: 60_000,
    hookTimeout: 60_000,
    // Each package's own cache: turbo runs packages side by side, and one shared
    // node_modules/.vitest-cache at the root raced (ENOTEMPTY on rmdir).
    fsModuleCachePath: join(process.cwd(), "node_modules", ".vitest-cache"),
    passWithNoTests: false,
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["**/*.test.ts"],
          exclude: ["**/node_modules/**", "**/*.int.test.ts", ".claude/**"],
          setupFiles: [unitSetup],
        },
      },
      {
        // Component tests (*.test.tsx) in a DOM, with the same guard on network, AWS and the clock.
        extends: true,
        test: {
          name: "dom",
          include: ["**/*.test.tsx"],
          exclude: ["**/node_modules/**", ".claude/**"],
          environment: "happy-dom",
          setupFiles: [unitSetup],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["**/*.int.test.ts"],
          exclude: ["**/node_modules/**"],
        },
      },
    ],
  },
});
