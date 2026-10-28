// The one Vitest config. Every package's test script runs `vitest run --config ../../vitest.config.ts
// --project unit` from its own directory, so the patterns below are relative to that package.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const unitSetup = fileURLToPath(new URL("./packages/testing/src/unit-setup.ts", import.meta.url));

export default defineConfig({
  test: {
    // Parallel test runs starved the CPU in david-learns (dl-uukj.27); turbo already runs packages side by side.
    maxWorkers: 2,
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
          // A loaded machine (load average 40+) pushed DOM tests past Vitest's 5 s default (dl-5ssh.47).
          testTimeout: 20_000,
          hookTimeout: 20_000,
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
