// make db-seed ENV=prod with its secrets where the owner keeps them: only in a mode-600 secrets file
// (dl-5ssh.34.59). SUPABASE_LINK sources that file under set -a, so every line in it is exported to
// the recipe's shell. fecb0b4 (#56) linked before it asked, and unset only two names before the seed,
// so the seed saw the file's other secrets. db-targets.test.ts puts the secrets in the environment;
// this one leaves the environment clean and CLAUDECODE unset. Stub supabase, psql, bun, security and
// mise come first on PATH, so nothing is linked, seeded or read from the keychain.
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
const PROD_REF = "xhzkmpainwzrfktxffjv";

// Runs argv[1:] on a pseudo-terminal and types PTY_ANSWER at the first "Type prod" prompt.
const PTY = `
import os, pty, select, sys
pid, fd = pty.fork()
if pid == 0:
    os.execvp(sys.argv[1], sys.argv[1:])
out, sent = b"", False
while True:
    ready, _, _ = select.select([fd], [], [], 20)
    if not ready:
        break
    try:
        data = os.read(fd, 1024)
    except OSError:
        break
    if not data:
        break
    out += data
    if not sent and b"Type prod" in out:
        os.write(fd, (os.environ["PTY_ANSWER"] + "\\n").encode())
        sent = True
_, status = os.waitpid(pid, 0)
sys.stdout.write(out.decode(errors="replace"))
sys.exit(os.waitstatus_to_exitcode(status))
`;

/** make db-seed ENV=prod at a terminal, answering the prompt, with the secrets only in a file. */
function seedProd(answer: string) {
  const dir = mkdtempSync(join(tmpdir(), "db-seed-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  const log = join(dir, "calls.log");
  const bunEnv = join(dir, "bun.env");
  const stub = (name: string, body: string) => {
    writeFileSync(join(bin, name), `#!/bin/sh\necho "${name} $*" >> "${log}"\n${body}\n`);
    chmodSync(join(bin, name), 0o755);
  };
  stub(
    "supabase",
    `if [ "$1" = link ]; then mkdir -p supabase/.temp; echo "postgresql://postgres.${PROD_REF}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" > supabase/.temp/pooler-url; fi`,
  );
  // jadwigo_api's login check logs in at once. It reads no stdin, which is the terminal here.
  stub("psql", "exit 0");
  stub("bun", `env > "${bunEnv}"`);
  // The file is the only source of a secret: a keychain lookup finds nothing.
  stub("security", "exit 44");
  stub("mise", "true");
  // The recipe checks the file's mode with BSD stat (stat -f %Lp), as on the owner's Mac. On a
  // Linux runner GNU stat answers that differently, so this stat answers the Mac way on both.
  // It logs nothing: its argument names the secrets file, and the log is checked for supabase.
  writeFileSync(
    join(bin, "stat"),
    `#!/bin/sh\nif [ "$(uname)" = Darwin ]; then exec /usr/bin/stat "$@"; fi\nexec /usr/bin/stat -c %a "$3"\n`,
  );
  chmodSync(join(bin, "stat"), 0o755);
  const secrets = join(dir, "supabase.env");
  writeFileSync(
    secrets,
    [
      "SUPABASE_ACCESS_TOKEN=sbp_stub",
      "SUPABASE_DB_PASSWORD_DEV=stub-postgres-dev",
      "SUPABASE_DB_PASSWORD_PROD=stub-postgres-prod",
      "JADWIGO_API_DB_PASSWORD_DEV=stub-api-dev",
      "JADWIGO_API_DB_PASSWORD_PROD=stub-api-prod",
      "",
    ].join("\n"),
  );
  chmodSync(secrets, 0o600);
  // Built from nothing, so CLAUDECODE and every secret of this shell stay out of make's environment.
  const env: Record<string, string> = {
    PATH: `${bin}:/usr/bin:/bin`,
    HOME: dir,
    SUPABASE_SECRETS: secrets,
    PTY_ANSWER: answer,
  };
  const args = ["-s", "-C", dir, "-f", join(repo, "Makefile"), "db-seed", "ENV=prod"];
  const out = spawnSync("python3", ["-c", PTY, "make", ...args], { env, encoding: "utf8" });
  return {
    status: out.status,
    output: `${out.stdout}${out.stderr}`,
    calls: existsSync(log) ? readFileSync(log, "utf8") : "",
    bunEnv: existsSync(bunEnv) ? readFileSync(bunEnv, "utf8") : null,
  };
}

describe("make db-seed ENV=prod with a mode-600 secrets file", { timeout: 60_000 }, () => {
  it("'no' at the prompt exits 1 before anything links or seeds", () => {
    const run = seedProd("no");
    expect(run.output).toContain("Type prod");
    // The recipe exits 1, which make reports as its Error 1 (and exits 2 itself).
    expect(run.status).not.toBe(0);
    expect(run.output).toMatch(/\[.*db-seed\] Error 1/);
    expect(run.calls).not.toContain("supabase");
    expect(run.bunEnv).toBeNull();
  });

  it("once prod is typed, the seed's bun sees no SUPABASE_* or JADWIGO_API_* variable", () => {
    const run = seedProd("prod");
    expect(run.status, run.output).toBe(0);
    expect(run.calls).toContain(`supabase link --project-ref ${PROD_REF}`);
    expect(run.bunEnv, run.output).not.toBeNull();
    const seen = (run.bunEnv ?? "").split("\n");
    expect(seen.filter((line) => /^(SUPABASE_|JADWIGO_API_)/.test(line))).toEqual([]);
    expect(seen).toContain("PGPASSWORD=stub-api-prod");
  });
});
