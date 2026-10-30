import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { apiPort, DEV_PORTS, port } from "./ports.ts";

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

describe("apiPort", () => {
  it("takes md's API_PORT, else the main checkout's default", () => {
    expect(apiPort({})).toBe(DEV_PORTS.API_PORT);
    expect(apiPort({ API_PORT: "8107" })).toBe(8107);
  });

  it("never defaults the api onto 8787, which the claude-muse proxy holds (dl-5ssh.98)", () => {
    expect(apiPort({})).not.toBe(8787);
  });

  it("lets a bare PORT stand in for an unset API_PORT, and API_PORT wins over it", () => {
    expect(apiPort({ PORT: "8787" })).toBe(8787);
    expect(apiPort({ API_PORT: "8107", PORT: "8787" })).toBe(8107);
  });

  it("fails inside a worktree when md exported neither", () => {
    expect(() => apiPort({ MEDALLION_DEV_WORKSPACE_NAME: "lane-a" })).toThrow(/API_PORT is unset/);
  });
});

describe(".md/repo.toml", () => {
  it("declares exactly DEV_PORTS under [review.ports], so md exports what the apps read", () => {
    const toml = readFileSync(new URL("../../.md/repo.toml", import.meta.url), "utf8");
    const table = /^\[review\.ports\]\n((?:[A-Z_]+ = \d+\n)+)/m.exec(toml)?.[1] ?? "";
    const declared = Object.fromEntries(
      [...table.matchAll(/^([A-Z_]+) = (\d+)$/gm)].map((m) => [m[1], Number(m[2])]),
    );
    expect(declared).toEqual(DEV_PORTS);
  });
});
