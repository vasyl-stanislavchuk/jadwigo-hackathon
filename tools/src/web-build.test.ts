// infra/Makefile's web-build (dl-e8ov.2.64): apps/web's build gets the environment's public settings
// from infra/web-build/<env>.env, and the file wins over the shell. A stub bun records what the build
// would see. Then real builds into a temp directory (dl-e8ov.2.74): with the shipped prod.env the
// bundle carries no Supabase project, which is __JW_AUTH__ null, no sign-in, even with one exported in
// the shell; with a file that names one, the bundle carries it. The deploy's own dry run shows it
// builds through prod.env, whatever its recipe's wording. Nothing uploads.
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../..");
const infra = join(repo, "infra");
const KEYS = ["JW_SUPABASE_URL", "JW_SUPABASE_KEY", "JW_SUPABASE_PROVIDERS"] as const;
const SHELL = {
  JW_SUPABASE_URL: "https://shell-sentinel.invalid",
  JW_SUPABASE_KEY: "sb_publishable_shell_sentinel",
  JW_SUPABASE_PROVIDERS: "google",
};

/** An env file of our own naming a Supabase project. */
function envFile(url: string, key: string) {
  const file = join(mkdtempSync(join(tmpdir(), "web-build-env-")), "stub.env");
  writeFileSync(
    file,
    `JW_SUPABASE_URL=${url}\nJW_SUPABASE_KEY=${key}\nJW_SUPABASE_PROVIDERS=google,facebook\n`,
  );
  return file;
}

/** make -C infra web-build with a stub bun; returns the build's JW_SUPABASE_* (null: never ran). */
function stubBuild(args: string[], env: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "web-build-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  const seen = join(dir, "bun.env");
  writeFileSync(join(bin, "bun"), `#!/bin/sh\necho "bun $*" > "${seen}.argv"\nenv > "${seen}"\n`);
  chmodSync(join(bin, "bun"), 0o755);
  const out = spawnSync("make", ["-s", "-C", infra, "web-build", ...args], {
    env: { PATH: `${bin}:/usr/bin:/bin`, HOME: dir, ...env },
    encoding: "utf8",
  });
  if (!existsSync(seen)) return { status: out.status, vars: null, argv: "" };
  const lines = readFileSync(seen, "utf8").split("\n");
  const vars = Object.fromEntries(
    KEYS.map((k) => [k, lines.find((l) => l.startsWith(`${k}=`))?.slice(k.length + 1)]),
  );
  return { status: out.status, vars, argv: readFileSync(`${seen}.argv`, "utf8").trim() };
}

/** make -C infra web-build with the real bun, into a temp outDir; returns the bundle's JavaScript. */
function realBuild(args: string[]) {
  const out = mkdtempSync(join(tmpdir(), "web-build-dist-"));
  const bun = spawnSync("sh", ["-c", "command -v bun"], { encoding: "utf8" }).stdout.trim();
  const run = spawnSync(
    "make",
    ["-s", "-C", infra, "web-build", ...args, `WEB_BUILD_FLAGS=--outDir ${out} --emptyOutDir`],
    {
      // No md worktree variables: these ports are what vite.config.ts reads, and nothing listens.
      env: {
        PATH: `${dirname(bun)}:/usr/bin:/bin`,
        HOME: process.env["HOME"] ?? out,
        API_PORT: "1",
        WEB_PORT: "2",
        ...SHELL,
      },
      encoding: "utf8",
    },
  );
  expect(run.status, `${run.stdout}${run.stderr}`).toBe(0);
  const assets = join(out, "assets");
  return readdirSync(assets)
    .filter((f) => f.endsWith(".js"))
    .map((f) => readFileSync(join(assets, f), "utf8"))
    .join("\n");
}

describe("make -C infra web-build", { timeout: 120_000 }, () => {
  it("the shipped prod file gives the build no sign-in and no providers, whatever the shell exports", () => {
    const run = stubBuild(["ENV=prod"], SHELL);
    expect(run.status).toBe(0);
    expect(run.argv).toBe("bun run build");
    expect(run.vars).toEqual({
      JW_SUPABASE_URL: "",
      JW_SUPABASE_KEY: "",
      JW_SUPABASE_PROVIDERS: "",
    });
  });

  it("the build gets the env file's values", () => {
    const file = envFile("https://auth.example.invalid", "sb_publishable_stub");
    const run = stubBuild([`WEB_BUILD_ENV=${file}`]);
    expect(run.status).toBe(0);
    expect(run.vars).toEqual({
      JW_SUPABASE_URL: "https://auth.example.invalid",
      JW_SUPABASE_KEY: "sb_publishable_stub",
      JW_SUPABASE_PROVIDERS: "google,facebook",
    });
  });

  it("an environment with no file stops before the build", () => {
    const run = stubBuild(["ENV=nowhere"]);
    expect(run.status).not.toBe(0);
    expect(run.vars).toBeNull();
  });

  it("built with prod.env the bundle has no Supabase project (__JW_AUTH__ null); built with one, it has it", () => {
    // The control: a file that names a project puts it in the bundle, so its absence below means null.
    const file = envFile("https://auth.example.invalid", "sb_publishable_named");
    const named = realBuild([`WEB_BUILD_ENV=${file}`]);
    // Booleans, so a failure names the text rather than printing the whole bundle.
    for (const text of ["https://auth.example.invalid", "sb_publishable_named"]) {
      expect(named.includes(text), `the named build lacks ${text}`).toBe(true);
    }

    const prod = realBuild(["ENV=prod"]);
    for (const text of [SHELL.JW_SUPABASE_URL, SHELL.JW_SUPABASE_KEY, "sb_publishable_named"]) {
      expect(prod.includes(text), `the prod build carries ${text}`).toBe(false);
    }
    const project = prod.match(
      /https:\/\/[a-z0-9.-]*(supabase\.co|auth\.jadwigo\.pl|example\.invalid)/,
    );
    expect(project?.[0] ?? null).toBeNull();
  });

  it("the deploy's dry run builds through prod.env before it uploads anything", () => {
    // make -n prints the recipe and runs only the $(MAKE) line, itself with -n: nothing builds or uploads.
    const run = spawnSync("make", ["-n", "-C", infra, "web-deploy", "ENV=prod"], {
      env: { PATH: "/usr/bin:/bin", HOME: tmpdir() },
      encoding: "utf8",
    });
    expect(run.status, run.stderr).toBe(0);
    const lines = run.stdout.split("\n");
    const builds = lines.filter((l) => /\bbun run build\b/.test(l));
    expect(builds).toHaveLength(1);
    const build = builds[0] ?? "";
    expect(build).toMatch(
      /set -a && \. \S*infra\/web-build\/prod\.env && set \+a && cd \S*apps\/web && bun run build/,
    );
    const firstUpload = lines.findIndex((l) => /\bs3 sync\b/.test(l));
    expect(firstUpload).toBeGreaterThan(lines.indexOf(build));
  });
});
