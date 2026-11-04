/**
 * Sends one build's source maps to PostHog, then deletes them (dl-5ssh.159), so a reported error's
 * stack reads as our code and no bucket or zip ever holds a map. The owner's release runs it, with
 * a personal key in POSTHOG_CLI_API_KEY. No key, or a failed upload, only warns: a release must not
 * stop for this, it just leaves that build's stacks minified.
 *
 * Run: bun tools/src/upload-sourcemaps.ts <dist directory>
 */
import { spawnSync } from "node:child_process";
import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

/** The EU project the apps report to, and the one CLI version this was written against. */
const PROJECT_ID = "331261";
const HOST = "https://eu.posthog.com";
const CLI = "@posthog/cli@0.18.12";

/** Runs the CLI with these arguments and answers its exit code. A test passes a double. */
export type RunCli = (args: readonly string[], env: Readonly<Record<string, string>>) => number;

/** A stalled CLI counts as a failed upload: a release does not wait on it for longer than this. */
const TIMEOUT_MS = 5 * 60 * 1000;

/**
 * How the CLI runs: npx fetches it at release time, so it gets only what it needs, and none of the
 * owner's AWS credentials or anything else in their shell (dl-5ssh.165).
 */
export function spawnOptions(
  env: Readonly<Record<string, string>>,
  parent: Readonly<Record<string, string | undefined>>,
) {
  const kept: Record<string, string> = { ...env };
  for (const name of ["PATH", "HOME"]) {
    const value = parent[name];
    if (value !== undefined) kept[name] = value;
  }
  return { env: kept, stdio: "inherit", timeout: TIMEOUT_MS } as const;
}

function deleteMaps(dir: string): number {
  const maps = readdirSync(dir, { recursive: true, encoding: "utf8" }).filter((file) =>
    file.endsWith(".map"),
  );
  for (const file of maps) rmSync(join(dir, file), { force: true });
  return maps.length;
}

/** What happened, in one line. It never throws for a failed upload; the maps go either way. */
export function uploadSourcemaps(dir: string, key: string | undefined, run: RunCli): string {
  let outcome = "no POSTHOG_CLI_API_KEY: nothing uploaded, so this build's stacks stay minified";
  if (key) {
    const env = { POSTHOG_CLI_API_KEY: key, POSTHOG_CLI_PROJECT_ID: PROJECT_ID };
    const step = (verb: string) =>
      run(["--host", HOST, "sourcemap", verb, "--directory", dir], env) === 0;
    outcome =
      step("inject") && step("upload")
        ? "uploaded"
        : "upload failed: this build's stacks stay minified";
  }
  return `upload-sourcemaps: ${dir}: ${outcome}; ${deleteMaps(dir)} maps deleted`;
}

if (import.meta.main) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: bun tools/src/upload-sourcemaps.ts <dist directory>");
    process.exit(1);
  }
  const run: RunCli = (args, env) =>
    // A timeout leaves no status, which counts as failed.
    spawnSync("npx", ["-y", CLI, ...args], spawnOptions(env, process.env)).status ?? 1;
  console.log(uploadSourcemaps(dir, process.env["POSTHOG_CLI_API_KEY"]?.trim(), run));
}
