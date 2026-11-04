import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { type RunCli, uploadSourcemaps } from "./upload-sourcemaps.ts";

const dirs: string[] = [];

function build(): string {
  const dir = mkdtempSync(join(tmpdir(), "maps-"));
  dirs.push(dir);
  mkdirSync(join(dir, "assets"));
  writeFileSync(join(dir, "assets/a.js"), "a");
  writeFileSync(join(dir, "assets/a.js.map"), "{}");
  return dir;
}

function cli(exits: (verb: string) => number) {
  const calls: { args: readonly string[]; env: Readonly<Record<string, string>> }[] = [];
  const run: RunCli = (args, env) => {
    calls.push({ args, env });
    return exits(String(args[3]));
  };
  return { calls, run };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("uploadSourcemaps", () => {
  it("without a key runs nothing, deletes the maps and keeps the code", () => {
    const dir = build();
    const { calls, run } = cli(() => 0);
    expect(uploadSourcemaps(dir, undefined, run)).toContain("nothing uploaded");
    expect(calls).toEqual([]);
    expect(existsSync(join(dir, "assets/a.js.map"))).toBe(false);
    expect(existsSync(join(dir, "assets/a.js"))).toBe(true);
  });

  it("with a key injects, then uploads to the EU project, then deletes the maps", () => {
    const dir = build();
    const { calls, run } = cli(() => 0);
    expect(uploadSourcemaps(dir, "phx_key", run)).toContain("uploaded");
    expect(calls.map((call) => call.args)).toEqual([
      ["--host", "https://eu.posthog.com", "sourcemap", "inject", "--directory", dir],
      ["--host", "https://eu.posthog.com", "sourcemap", "upload", "--directory", dir],
    ]);
    expect(calls[0]?.env).toEqual({
      POSTHOG_CLI_API_KEY: "phx_key",
      POSTHOG_CLI_PROJECT_ID: "331261",
    });
    expect(existsSync(join(dir, "assets/a.js.map"))).toBe(false);
  });

  it("when inject fails it does not upload, goes on, and still deletes the maps", () => {
    const dir = build();
    const { calls, run } = cli((verb) => (verb === "inject" ? 1 : 0));
    expect(uploadSourcemaps(dir, "phx_key", run)).toContain("upload failed");
    expect(calls).toHaveLength(1);
    expect(existsSync(join(dir, "assets/a.js.map"))).toBe(false);
  });
});
