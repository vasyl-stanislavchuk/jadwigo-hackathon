// The Makefile reads .env.local, but a variable already in the environment wins (dl-5ssh.43). An
// included assignment used to override an exported one, so DATABASE_URL=… make migrate reset the
// database .env.local named: jadwigo_test on the 5432 server, when .env.local named no port.
// make -n only prints the recipe, so nothing here reaches a database.
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../..");

/** `make -n migrate` in a temp directory whose .env.local names no port. */
function migrateDryRun(env: Record<string, string>, extra: string[] = []) {
  const dir = mkdtempSync(join(tmpdir(), "make-env-"));
  writeFileSync(join(dir, ".env.local"), "DATABASE_URL=postgresql://localhost/jadwigo_test\n");
  const out = spawnSync(
    "make",
    ["-s", "-n", "-C", dir, "-f", join(repo, "Makefile"), "migrate", ...extra],
    {
      env: { PATH: "/usr/bin:/bin", HOME: dir, ...env },
      encoding: "utf8",
    },
  );
  expect(out.status, out.stderr).toBe(0);
  return out.stdout;
}

describe("make reads .env.local under the environment", { timeout: 60_000 }, () => {
  it("an exported DATABASE_URL wins over .env.local's", () => {
    const out = migrateDryRun({ DATABASE_URL: "postgresql://127.0.0.1:5433/x_jadwigo" });
    expect(out).toContain('psql "postgresql://127.0.0.1:5433/x_jadwigo"');
    expect(out).not.toContain("postgresql://localhost/jadwigo_test");
  });

  it("with none exported, .env.local's is used", () => {
    expect(migrateDryRun({})).toContain('psql "postgresql://localhost/jadwigo_test"');
  });

  it("one given on the command line wins over both", () => {
    const out = migrateDryRun({ DATABASE_URL: "postgresql://127.0.0.1:5433/x_jadwigo" }, [
      "DATABASE_URL=postgresql://127.0.0.1:5433/jadwigo_cli",
    ]);
    expect(out).toContain('psql "postgresql://127.0.0.1:5433/jadwigo_cli"');
  });
});
