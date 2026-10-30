// The dream script refuses every database but a local jadwigo* one before it connects, whatever
// DATABASE_URL names: jadwigo-dev and prod never get a dream in this wave.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("./dream.ts", import.meta.url));
/** A well-formed learner id no database holds: the script refuses the URL before it looks. */
const ARGS = [script, `lrn_${"0".repeat(26)}`];

function dream(databaseUrl: string): { status: number | null; stderr: string } {
  const run = spawnSync("bun", ARGS, {
    encoding: "utf8",
    env: { PATH: process.env["PATH"] ?? "", DATABASE_URL: databaseUrl },
  });
  return { status: run.status, stderr: run.stderr };
}

describe("bun apps/api/src/dream.ts", () => {
  it("refuses another host, another database and a query string, never printing the URL", () => {
    for (const url of [
      "postgresql://jadwigo_api:secret@db.example.supabase.co:6543/postgres",
      "postgresql://localhost:5433/postgres",
      "postgresql://localhost:5433/jadwigo?host=db.example.com",
    ]) {
      const run = dream(url);
      expect([url, run.status]).toEqual([url, 1]);
      expect(run.stderr).toContain("the dream runs only on a local jadwigo* database");
      expect(run.stderr).not.toContain("secret");
    }
  });
});
