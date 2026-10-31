// make release (infra/release.sh, dl-5ssh.34.67), run on a pseudo-terminal against stub make,
// terraform, aws, bun and curl in a throwaway repo with its own origin, so nothing reaches AWS or
// Supabase. It refuses an agent and a shell with no terminal, previews before its one question,
// stops before the question on a plan that destroys, and after one typed prod runs every step with
// JW_RELEASE_CONFIRMED=prod, the api and its health check before the web, site and docs.
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

const script = resolve(import.meta.dirname, "../../infra/release.sh");

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

const PLAN_UPDATE = JSON.stringify({
  resource_changes: [
    { address: "module.app.aws_apigatewayv2_route.x", change: { actions: ["create"] } },
  ],
});
const PLAN_DESTROY = JSON.stringify({
  resource_changes: [
    { address: "module.app.aws_s3_bucket.app", change: { actions: ["delete", "create"] } },
  ],
});

interface Options {
  readonly planRc?: number;
  readonly planJson?: string;
  readonly migrations?: number;
  readonly dirty?: boolean;
}

function stage(o: Options = {}) {
  const dir = mkdtempSync(join(tmpdir(), "release-"));
  const bin = join(dir, "bin");
  const log = join(dir, "calls.log");
  mkdirSync(bin);
  const gitEnv = {
    PATH: "/usr/bin:/bin",
    HOME: dir,
    GIT_AUTHOR_NAME: "t",
    GIT_AUTHOR_EMAIL: "t@example.invalid",
    GIT_COMMITTER_NAME: "t",
    GIT_COMMITTER_EMAIL: "t@example.invalid",
  };
  const git = (cwd: string, ...args: string[]) => spawnSync("git", args, { cwd, env: gitEnv });
  const origin = join(dir, "origin.git");
  const work = join(dir, "work");
  git(dir, "init", "-q", "--bare", "-b", "main", origin);
  git(dir, "clone", "-q", origin, work);
  mkdirSync(join(work, "infra"));
  writeFileSync(join(work, "infra/aws.mk"), "AWS_PROFILE := jadwigo\n");
  git(work, "add", "infra");
  git(work, "commit", "-qm", "one");
  git(work, "push", "-q", "origin", "HEAD:main");
  git(work, "branch", "-q", "--set-upstream-to=origin/main");
  if (o.dirty) writeFileSync(join(work, "stray"), "x");

  const stub = (name: string, body: string) => {
    writeFileSync(join(bin, name), `#!/bin/sh\n${body}\n`);
    chmodSync(join(bin, name), 0o755);
  };
  const sqls = Array.from({ length: o.migrations ?? 0 }, (_, i) => ` • 2026110100000${i}_x.sql`);
  stub(
    "make",
    `echo "make $* token=\${JW_RELEASE_CONFIRMED:-}" >> "${log}"
case "$*" in *DRY_RUN=1*) printf '%s\\n' ${sqls.length ? `"Would push these migrations:" ${sqls.map((s) => `"${s}"`).join(" ")}` : '"Remote database is up to date."'} ;; esac`,
  );
  stub(
    "terraform",
    `echo "terraform $*" >> "${log}"
case "$*" in
  *" plan "*) for a; do case $a in -out=*) : > "\${a#-out=}";; esac; done; echo "Plan: 1 to add"; exit ${o.planRc ?? 0};;
  *" show -json "*) cat <<'JSON'
${o.planJson ?? PLAN_UPDATE}
JSON
;;
esac`,
  );
  stub("aws", `echo "aws $*" >> "${log}"; echo 843109108289`);
  stub("bun", "true");
  stub("curl", `echo "curl $*" >> "${log}"; printf 200`);
  stub("mise", "true");
  const env = { ...gitEnv, PATH: `${bin}:/usr/bin:/bin` };
  return { work, log, env };
}

type Stage = ReturnType<typeof stage>;

function atTerminal(s: Stage, answer: string, extra: Record<string, string> = {}) {
  const out = spawnSync("python3", ["-c", PTY, "sh", script], {
    cwd: s.work,
    env: { ...s.env, ...extra, PTY_ANSWER: answer },
    encoding: "utf8",
  });
  return { status: out.status, output: `${out.stdout}${out.stderr}` };
}

const calls = (s: Stage) => (existsSync(s.log) ? readFileSync(s.log, "utf8") : "");

describe("make release", { timeout: 60_000 }, () => {
  it("refuses a shell with no terminal, and an agent's terminal, before anything runs", () => {
    const s = stage();
    const piped = spawnSync("sh", [script], {
      cwd: s.work,
      env: s.env,
      input: "prod\n",
      encoding: "utf8",
    });
    expect(piped.status).not.toBe(0);
    expect(piped.stdout).toContain("run it from your own terminal");
    const agent = atTerminal(s, "prod", { CLAUDECODE: "1" });
    expect(agent.status).not.toBe(0);
    expect(agent.output).toContain("run it from your own terminal");
    expect(calls(s)).toBe("");
  });

  it("refuses a checkout with local changes", () => {
    const s = stage({ dirty: true });
    const run = atTerminal(s, "prod");
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("local changes");
    expect(calls(s)).not.toContain("make");
  });

  it("previews, and answering anything but prod does nothing", () => {
    const s = stage({ planRc: 2, migrations: 1 });
    const run = atTerminal(s, "no");
    expect(run.output).toContain("Type prod");
    expect(run.output).toContain("1 migration(s), terraform changes");
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("nothing done on prod");
    const log = calls(s);
    expect(log).toContain("make -s db-push ENV=prod DRY_RUN=1 token=prod");
    expect(log).not.toContain("apply");
    expect(log).not.toMatch(/db-push ENV=prod token|db-seed|deploy/);
  });

  it("stops before the question when the plan destroys or replaces anything", () => {
    const s = stage({ planRc: 2, planJson: PLAN_DESTROY });
    const run = atTerminal(s, "prod");
    expect(run.status).not.toBe(0);
    expect(run.output).toContain("module.app.aws_s3_bucket.app");
    expect(run.output).toContain("destroys or replaces");
    expect(run.output).not.toContain("Type prod");
    expect(calls(s)).not.toMatch(/apply|deploy|db-seed/);
  });

  it("after one prod, runs every step in order with the token", () => {
    const s = stage({ planRc: 2, migrations: 2 });
    const run = atTerminal(s, "prod");
    expect(run.status, run.output).toBe(0);
    expect(run.output).toContain("Released");
    expect(run.output.match(/Type prod/g)).toHaveLength(1);
    const steps = calls(s)
      .split("\n")
      .filter((l) => /^make (?!.*DRY_RUN)|^terraform .*apply|^curl/.test(l) && !l.includes(" init"))
      .map((l) => l.replace(/^make -s (-C infra )?/, "").replace(/ -input=false .*/, ""));
    expect(steps).toEqual([
      "prod-status token=",
      "db-push ENV=prod token=prod",
      "db-role ENV=prod token=prod",
      "db-seed ENV=prod token=prod",
      "terraform -chdir=infra/terraform apply",
      "api-deploy token=prod",
      expect.stringContaining("curl -s -o /dev/null"),
      "web-deploy site-deploy docs-deploy token=prod",
      "prod-status token=prod",
    ]);
  });

  it("with no migrations and no plan changes, pushes nothing and applies nothing", () => {
    const s = stage({ planRc: 0, migrations: 0 });
    const run = atTerminal(s, "prod");
    expect(run.status, run.output).toBe(0);
    expect(run.output).toContain("migrations: none to push");
    expect(run.output).toContain("terraform: no changes");
    const log = calls(s);
    expect(log).not.toContain("db-push ENV=prod token=prod");
    expect(log).not.toContain("apply");
    expect(log).toContain("web-deploy site-deploy docs-deploy token=prod");
  });
});
