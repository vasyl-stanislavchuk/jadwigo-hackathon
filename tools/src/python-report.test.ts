// apps/print and apps/converter import nothing of ours, so each holds report.py (dl-5ssh.160). What
// reaches PostHog must not drift between them.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string): string =>
  readFileSync(new URL(`../../apps/${path}`, import.meta.url), "utf8");

describe("the Python Lambdas' report.py", () => {
  it("is the same file in both", () => {
    expect(read("print/src/printer/report.py")).toBe(read("converter/src/converter/report.py"));
  });
});
