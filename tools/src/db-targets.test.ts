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
  readonly outcomes: string;
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
  // A login as jadwigo_api (db-role's check, db-seed's wait) reads no stdin. Its outcomes, one per
  // line, are in login-outcomes: ok, refused (28P01) or down; with none left, it logs in.
  const outcomes = join(dir, "login-outcomes");
  stub(
    "psql",
    `case "$*" in *://jadwigo_api.*)
  next=$(head -n 1 "${outcomes}" 2>/dev/null); sed -i.bak 1d "${outcomes}" 2>/dev/null
  case "$next" in
    refused) echo 'psql: error: FATAL:  password authentication failed for user "jadwigo_api"' >&2; exit 2;;
    down) echo 'psql: error: connection to server failed: Connection refused' >&2; exit 2;;
  esac
  exit 0;;
esac
cat > /dev/null`,
  );
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
  return { dir, outcomes, log, bunEnv, env };
}

const makeArgs = (s: Stage, target: string, extra: string[] = [], env = "prod") => [
  "-s",
  "-C",
  s.dir,
  "-f",
  join(repo, "Makefile"),
  target,
  `ENV=${env}`,
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

  it("db-role ENV=prod: a pty that types prod passes this gate, so the guard is what stops a session", () => {
    // The Makefile cannot tell a person's terminal from a pty a session made, which is what
    // atTerminal does here. In Claude Code, .claude/hooks/guard.ts denies this command and any
    // clearing of CLAUDECODE before it runs (dl-5ssh.45, its DENY cases in guard.test.ts). A Codex
    // shell has no guard, so this gate is all it meets. Stubs only: nothing reaches Supabase.
    const s = stage();
    const { status, output } = atTerminal(s, "db-role", "prod");
    expect(output).toContain("Type prod");
    expect(output).not.toContain("run it from your own terminal");
    expect(calls(s)).toContain(`supabase link --project-ref ${PROD_REF}`);
    expect(status, output).toBe(0);
  });

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

/** make ENV=dev from a pipe, the jadwigo_api logins answering with these outcomes in turn. */
function onDev(target: string, outcomes: string[], extra: string[] = []) {
  const s = stage(DEV_REF);
  writeFileSync(s.outcomes, outcomes.map((o) => `${o}\n`).join(""));
  const out = spawnSync("make", makeArgs(s, target, extra, "dev"), {
    env: s.env,
    input: "",
    encoding: "utf8",
  });
  return { s, status: out.status, output: `${out.stdout}${out.stderr}` };
}

const altered = (s: Stage) => calls(s).includes(`psql postgresql://postgres.${DEV_REF}@`);

// After db-role sets jadwigo_api's password, the Supabase pooler refuses it for a few minutes
// (dl-5ssh.58). db-role leaves a password that already logs in alone; db-seed waits out a refusal.
describe("db-role and db-seed around the pooler's old password", { timeout: 60_000 }, () => {
  it("db-role: when jadwigo_api already logs in, it alters nothing", () => {
    const { s, status, output } = onDev("db-role", ["ok"]);
    expect(status, output).toBe(0);
    expect(output).toContain("already logs in on jadwigo-dev");
    expect(calls(s)).toContain(`psql postgresql://jadwigo_api.${DEV_REF}@`);
    expect(altered(s)).toBe(false);
  });

  it("db-role: when the login is refused, it sets the password as postgres", () => {
    const { s, status, output } = onDev("db-role", ["refused"]);
    expect(status, output).toBe(0);
    expect(altered(s)).toBe(true);
    expect(output).toContain("db-seed waits for it");
  });

  it("db-seed: a refused password is retried until the pooler takes it, then the seed runs", () => {
    const { s, status, output } = onDev("db-seed", ["refused", "refused", "ok"], ["LOGIN_STEP=0"]);
    expect(status, output).toBe(0);
    expect(output.match(/refuses jadwigo_api's password \(28P01\)/g)).toHaveLength(2);
    expect(existsSync(s.bunEnv)).toBe(true);
  });

  it("db-seed: still refused after LOGIN_WAIT, it stops before the seed", () => {
    const refusals = Array.from({ length: 10 }, () => "refused");
    const { s, status, output } = onDev("db-seed", refusals, ["LOGIN_WAIT=2", "LOGIN_STEP=1"]);
    expect(status).not.toBe(0);
    expect(output).toContain("still refuses jadwigo_api's password after 2s");
    expect(existsSync(s.bunEnv)).toBe(false);
  });

  it("db-seed: any other login error stops at once, without retrying", () => {
    const { s, status, output } = onDev("db-seed", ["down", "ok"], ["LOGIN_STEP=0"]);
    expect(status).not.toBe(0);
    expect(output).toContain("Connection refused");
    expect(output).not.toContain("retrying");
    expect(existsSync(s.bunEnv)).toBe(false);
  });
});
