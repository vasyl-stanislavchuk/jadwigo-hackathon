// The Makefile's prod db targets (dl-e8ov.2.34), run against stub supabase, psql, bun, security
// and mise in a temp directory, so nothing here reaches a Supabase project. ENV=prod must refuse
// any shell whose stdin is not a terminal, and at a terminal must refuse until a person types prod,
// before anything links. The seed's child sees no SUPABASE_* or JADWIGO_API_* variable.
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
const DEV_REF = "jweuvslwntdimuwcvlzq";

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

interface Stage {
  readonly dir: string;
  readonly log: string;
  readonly bunEnv: string;
  readonly env: Record<string, string>;
}

/** A temp directory with the stubs first on PATH and the secrets in the environment. */
function stage(ref = PROD_REF): Stage {
  const dir = mkdtempSync(join(tmpdir(), "db-targets-"));
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
    `if [ "$1" = link ]; then mkdir -p supabase/.temp; echo "postgresql://postgres.${ref}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" > supabase/.temp/pooler-url; fi`,
  );
  stub("bun", `env > "${bunEnv}"`);
  stub("psql", "cat > /dev/null");
  stub("security", "echo stub-secret");
  stub("mise", "true");
  const env: Record<string, string> = {
    PATH: `${bin}:/usr/bin:/bin`,
    HOME: dir,
    SUPABASE_SECRETS: join(dir, "absent.env"),
    SUPABASE_ACCESS_TOKEN: "sbp_stub",
    SUPABASE_DB_PASSWORD_PROD: "stub-postgres-password",
    JADWIGO_API_DB_PASSWORD_PROD: "stub-api-password",
    JADWIGO_API_URL: "https://stub.invalid",
  };
  return { dir, log, bunEnv, env };
}

const makeArgs = (s: Stage, target: string, extra: string[] = []) => [
  "-s",
  "-C",
  s.dir,
  "-f",
  join(repo, "Makefile"),
  target,
  "ENV=prod",
  ...extra,
];

/** make at a terminal, answering the prompt. */
function atTerminal(s: Stage, target: string, answer: string) {
  const out = spawnSync("python3", ["-c", PTY, "make", ...makeArgs(s, target)], {
    env: { ...s.env, PTY_ANSWER: answer },
    encoding: "utf8",
  });
  return { status: out.status, output: `${out.stdout}${out.stderr}` };
}

/** make the way an agent runs it: stdin a pipe, CLAUDECODE cleared. */
function fromPipe(
  s: Stage,
  target: string,
  extra: string[] = [],
  env: Record<string, string> = {},
) {
  const out = spawnSync("make", makeArgs(s, target, extra), {
    env: { ...s.env, ...env },
    input: "prod\nprod\n",
    encoding: "utf8",
  });
  return { status: out.status, output: `${out.stdout}${out.stderr}` };
}

const calls = (s: Stage) => (existsSync(s.log) ? readFileSync(s.log, "utf8") : "");

describe("the prod db targets", { timeout: 60_000 }, () => {
  for (const target of ["db-seed", "db-push", "db-role"]) {
    it(`${target} ENV=prod: 'no' at the prompt exits 1 before any link`, () => {
      const s = stage();
      const { status, output } = atTerminal(s, target, "no");
      expect(output).toContain("Type prod");
      // The recipe exits 1, which make reports as its Error 1 (and exits 2 itself).
      expect(status).not.toBe(0);
      expect(output).toContain("nothing done on jadwigo-prod");
      expect(output).toMatch(new RegExp(`\\[.*${target}\\] Error 1`));
      expect(calls(s)).not.toContain("supabase link");
    });

    it(`${target} ENV=prod: refused with no terminal, even with CONFIRM=prod, exported or given`, () => {
      const s = stage();
      for (const run of [
        fromPipe(s, target),
        fromPipe(s, target, ["CONFIRM=prod"]),
        fromPipe(s, target, [], { CONFIRM: "prod" }),
      ]) {
        expect(run.status).not.toBe(0);
        expect(run.output).toContain("run it from your own terminal");
      }
      expect(calls(s)).not.toContain("supabase");
    });
  }

  it("db-seed ENV=prod: once prod is typed, the seed sees no SUPABASE_* or JADWIGO_API_* variable", () => {
    const s = stage();
    const { status, output } = atTerminal(s, "db-seed", "prod");
    expect(status, output).toBe(0);
    expect(calls(s)).toContain(`supabase link --project-ref ${PROD_REF}`);
    const seen = readFileSync(s.bunEnv, "utf8").split("\n");
    expect(seen.filter((line) => /^(SUPABASE_|JADWIGO_API_)/.test(line))).toEqual([]);
    expect(seen).toContain(
      `DATABASE_URL=postgresql://jadwigo_api.${PROD_REF}@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
    );
  });

  it("db-seed ENV=prod: a pooler-url for another project is refused before the seed", () => {
    const s = stage(DEV_REF);
    const { status, output } = atTerminal(s, "db-seed", "prod");
    expect(status).not.toBe(0);
    expect(output).toContain("pooler-url is not");
    expect(existsSync(s.bunEnv)).toBe(false);
  });
});
