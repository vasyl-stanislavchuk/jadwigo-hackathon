import { describe, expect, it } from "vitest";
import { port } from "./ports.ts";

describe("port", () => {
  it("uses the env, falls back in the main checkout, and fails when unset in a worktree", () => {
    expect(port("WEB_PORT", 5173, { WEB_PORT: "6100" })).toBe(6100);
    expect(port("WEB_PORT", 5173, {})).toBe(5173);
    expect(() => port("WEB_PORT", 5173, { MEDALLION_DEV_WORKSPACE_NAME: "lane-a" })).toThrow(
      /unset inside md worktree lane-a/,
    );
    expect(() => port("WEB_PORT", 5173, { WEB_PORT: "http" })).toThrow(/not a port/);
  });
});
