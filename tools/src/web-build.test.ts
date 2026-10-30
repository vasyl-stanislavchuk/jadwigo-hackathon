// infra/Makefile's web-build (dl-e8ov.2.64): apps/web's build gets the environment's public settings
// from infra/web-build/<env>.env, and the file wins over the shell. A stub bun records what the build
// would see, so nothing builds or uploads. The shipped prod file keeps sign-in off: an empty
// JW_SUPABASE_URL and JW_SUPABASE_KEY are what apps/web's authConfig reads as no sign-in.
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../..");
const KEYS = ["JW_SUPABASE_URL", "JW_SUPABASE_KEY", "JW_SUPABASE_PROVIDERS"] as const;

/** make -C infra web-build with a stub bun; returns the build's JW_SUPABASE_* (null: never ran). */
function build(args: string[], env: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "web-build-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  const seen = join(dir, "bun.env");
  writeFileSync(join(bin, "bun"), `#!/bin/sh\necho "bun $*" > "${seen}.argv"\nenv > "${seen}"\n`);
  chmodSync(join(bin, "bun"), 0o755);
  const out = spawnSync("make", ["-s", "-C", join(repo, "infra"), "web-build", ...args], {
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

describe("make -C infra web-build", { timeout: 60_000 }, () => {
  it("the shipped prod file builds with no sign-in and no providers, whatever the shell exports", () => {
    const run = build(["ENV=prod"], {
      JW_SUPABASE_URL: "https://shell.invalid",
      JW_SUPABASE_KEY: "shell-key",
      JW_SUPABASE_PROVIDERS: "google",
    });
    expect(run.status).toBe(0);
    expect(run.argv).toBe("bun run build");
    expect(run.vars).toEqual({
      JW_SUPABASE_URL: "",
      JW_SUPABASE_KEY: "",
      JW_SUPABASE_PROVIDERS: "",
    });
  });

  it("the build gets the env file's values", () => {
    const file = join(mkdtempSync(join(tmpdir(), "web-build-env-")), "stub.env");
    writeFileSync(
      file,
      "JW_SUPABASE_URL=https://auth.example.invalid\nJW_SUPABASE_KEY=sb_publishable_stub\nJW_SUPABASE_PROVIDERS=google,facebook\n",
    );
    const run = build([`WEB_BUILD_ENV=${file}`]);
    expect(run.status).toBe(0);
    expect(run.vars).toEqual({
      JW_SUPABASE_URL: "https://auth.example.invalid",
      JW_SUPABASE_KEY: "sb_publishable_stub",
      JW_SUPABASE_PROVIDERS: "google,facebook",
    });
  });

  it("an environment with no file stops before the build", () => {
    const run = build(["ENV=nowhere"]);
    expect(run.status).not.toBe(0);
    expect(run.vars).toBeNull();
  });

  it("the deploy builds through web-build", () => {
    const makefile = readFileSync(join(repo, "infra/Makefile"), "utf8");
    const recipe = makefile.split("\nweb-deploy:\n")[1]?.split("\n\n")[0] ?? "";
    expect(recipe).toContain("$(MAKE) web-build");
    expect(recipe).not.toContain("bun run build");
  });
});
