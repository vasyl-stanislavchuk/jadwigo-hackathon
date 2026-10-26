// Cases for guard.ts: each rule with a planted violation that must be denied, and the near misses
// that must pass. The cases live in this file, not on a command line, so the guard never judges
// its own test strings. Run: bun test .claude/hooks
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { denial, type HookInput } from "./guard.ts";

const onBranch = (branch: string) => () => branch;
const bash = (command: string): HookInput => ({ tool_name: "Bash", tool_input: { command } });
const ISO = "GBRAIN_HOME=/x GBRAIN_DATABASE_URL=postgresql://localhost/medallion_context";

const cases: Array<[name: string, want: "allow" | "DENY", command: string]> = [
  ["plain ls", "allow", "ls -la"],
  // gbrain, from guard.sh
  ["bare put", "DENY", "gbrain put notes/x < f.md"],
  ["cd && bare call", "DENY", "cd /tmp && gbrain call query {}"],
  ["newline then bare sync", "DENY", "cd ~/brain\ngbrain sync --repo ."],
  ["env prefix, no isolation", "DENY", "env FOO=1 gbrain embed --stale"],
  ["only GBRAIN_HOME set", "DENY", "GBRAIN_HOME=/x gbrain sync"],
  ["isolated sync", "allow", `${ISO} gbrain sync --repo r`],
  [
    "isolated but personal db",
    "DENY",
    "GBRAIN_HOME=/x GBRAIN_DATABASE_URL=postgresql://localhost/gbrain gbrain sync",
  ],
  ["isolated think", "DENY", `${ISO} gbrain think hi`],
  ["schema active, bare", "allow", "gbrain schema active"],
  ["--version, bare", "allow", "gbrain --version"],
  [
    "bd remember mentioning gbrain",
    "allow",
    'bd remember "denies bare gbrain; gbrain think is off" --key k',
  ],
  ["git commit -m mentioning gbrain", "allow", "git commit -m 'fix: gbrain sync order'"],
  ["grep quoted gbrain sync", "allow", 'grep -rn "gbrain sync" docs'],
  ["grep unquoted gbrain arg", "allow", "grep -rn gbrain docs"],
  ["which gbrain", "allow", "which gbrain"],
  ["heredoc with a gbrain line", "allow", "cat > d.md <<'EOF'\ngbrain sync --repo x\nEOF"],
  ["heredoc, then a real bare put", "DENY", "cat > d.md <<EOF\nhello\nEOF\ngbrain put x"],
  // other projects' databases, from guard.sh
  ["dropdb personal db", "DENY", "dropdb gbrain"],
  ["psql into medallion_context", "DENY", 'psql -d medallion_context -c "select 1"'],
  ["psql url into dl", "DENY", "psql postgresql://localhost/dl"],
  ["echo mentioning dropdb", "allow", 'echo "never run dropdb gbrain"'],
  ["psql -l | grep", "allow", "psql -l | grep -c jadwigo"],
  ["createdb jadwigo_test", "allow", "createdb jadwigo_test"],
  // infra
  ["terraform apply", "DENY", "terraform -chdir=infra apply -var-file=environments/prod.tfvars"],
  ["terraform plan", "allow", "terraform -chdir=infra plan"],
  ["make apply", "DENY", "make -C infra apply"],
  ["aws --profile prod", "DENY", "aws s3 ls --profile jadwigo-prod"],
  ["AWS_PROFILE=prod", "DENY", "AWS_PROFILE=jadwigo-prod aws s3 ls"],
  ["aws --profile dev", "allow", "aws s3 ls --profile jadwigo-sandbox"],
  ["docker", "DENY", "docker run postgres"],
  ["docker after cd", "DENY", "cd apps && docker compose up"],
  ["supabase start", "DENY", "supabase start"],
  [
    "supabase migration up",
    "allow",
    "supabase migration up --db-url postgresql://localhost/jadwigo",
  ],
  // git
  ["push --force", "DENY", "git push --force origin lane/a"],
  ["push -f", "DENY", "git push -f"],
  ["push --force-with-lease", "DENY", "git push --force-with-lease origin x"],
  ["push +refspec", "DENY", "git push origin +lane/a"],
  ["push to main", "DENY", "git push origin main"],
  ["push HEAD:main", "DENY", "git push origin HEAD:main"],
  ["push a branch", "allow", "git push -u origin dl-5ssh.34.3/ci"],
  ["commit --no-verify", "DENY", "git commit --no-verify -m x"],
  ["commit -n", "DENY", "git commit -n -m x"],
  ["add -A", "DENY", "git add -A"],
  ["add .", "DENY", "git add ."],
  ["add --all", "DENY", "git -C /repo add --all"],
  ["add by name", "allow", "git add apps/api/src/index.ts README.md"],
  ["pull --rebase", "DENY", "git pull --rebase"],
  ["pull -r", "DENY", "git pull -r origin main"],
  ["pull --rebase=merges", "allow", "git pull --rebase=merges"],
  ["pull --ff-only", "allow", "git pull --ff-only"],
  // GitHub: no admin merge, no approvals, no ruleset or branch-protection writes
  ["pr merge --admin", "DENY", "gh pr merge 12 --squash --admin"],
  ["pr merge --auto --squash", "allow", "gh pr merge 12 --auto --squash"],
  ["pr review --approve", "DENY", "gh pr review 12 --approve"],
  ["pr review -a", "DENY", "gh pr review 12 -a -b ok"],
  ["pr review --comment", "allow", "gh pr review 12 --comment -b 'one nit'"],
  [
    "api PUT ruleset",
    "DENY",
    "gh api -X PUT repos/o/r/rulesets/25899475 --input .github/rulesets/main.json",
  ],
  ["api --method PATCH ruleset", "DENY", "gh api --method PATCH repos/o/r/rulesets/1 -f x=y"],
  ["api -XDELETE protection", "DENY", "gh api -XDELETE repos/o/r/branches/main/protection"],
  ["api POST via fields", "DENY", "gh api repos/o/r/rulesets -f name=main"],
  ["api PUT quoted ruleset", "DENY", "gh api --method=PUT 'repos/o/r/rulesets/1' --input r.json"],
  [
    "api PUT protection subpath",
    "DENY",
    "gh api -X POST repos/o/r/branches/main/protection/enforce_admins",
  ],
  ["api read ruleset", "allow", "gh api repos/o/r/rulesets/25899475"],
  ["api GET protection", "allow", "gh api -X GET repos/o/r/branches/main/protection"],
  ["api POST a status", "allow", "gh api -X POST repos/o/r/statuses/abc -f state=success"],
  // board
  ["bd update --notes", "DENY", 'bd -C ~/projects/david-learns/.beads update dl-1 --notes "x"'],
  ["bd update --append-notes", "allow", 'bd update dl-1 --append-notes "x"'],
];

describe("guard: Bash", () => {
  for (const [name, want, command] of cases) {
    test(`${name} -> ${want}`, () => {
      const got = denial(bash(command), {}, onBranch("lane/a")) ? "DENY" : "allow";
      expect(got).toBe(want);
    });
  }

  test("a bare git push from main is denied, from a branch allowed", () => {
    expect(denial(bash("git push"), {}, onBranch("main"))).toMatch(/through a PR/);
    expect(denial(bash("git push"), {}, onBranch("dl-5ssh.34.3/ci"))).toBeUndefined();
  });
});

describe("guard: PR bodies have the /dev-pr shape", () => {
  const dir = mkdtempSync(join(tmpdir(), "pr-body-"));
  const good = join(dir, "good.md");
  const bad = join(dir, "bad.md");
  writeFileSync(
    good,
    "Issue: `dl-x.1`\n\n## Summary\n\nx\n\n## Evidence\n\ny\n\n## Merge Danger\n\n**Door:** two-way\n",
  );
  writeFileSync(bad, "## Issue\n\nWhat it does.\n");
  const pr = (command: string) => denial(bash(command), {}, onBranch("lane/a"));

  test("a body file with the shape is allowed", () => {
    expect(pr(`gh pr create --title "dl-x.1: y" --body-file ${good}`)).toBeUndefined();
    expect(pr(`git push -u origin lane/a && gh pr create -F ${good} --title t`)).toBeUndefined();
    expect(pr(`gh pr edit 3 --body-file=${good}`)).toBeUndefined();
  });

  test("prose that mentions gh pr create is not the call", () => {
    const heredoc = `cat > /tmp/b.md <<'EOF'\ngh pr create --body-file with this body\nEOF\ngh pr create --body-file ${good}`;
    expect(pr(heredoc)).toBeUndefined();
  });

  test("a body file written by a heredoc in the same command is read from the heredoc", () => {
    const fresh = join(dir, "fresh.md");
    const body = "## Summary\n\nx\n\n## Evidence\n\ny\n\n## Merge Danger\n\n**Door:** two-way\n";
    const write = (text: string) =>
      `cat > ${fresh} <<'EOF'\n${text}EOF\ngh pr create --title t --body-file ${fresh}`;
    expect(pr(write(body))).toBeUndefined();
    expect(pr(write("## Summary\n\nonly this\n"))).toMatch(/Merge Danger/);
  });

  test("an edit that leaves the body alone is allowed", () => {
    expect(pr('gh pr edit 3 --title "dl-x.1: better"')).toBeUndefined();
    expect(pr("git checkout -b x && gh pr edit 3 --add-label docs")).toBeUndefined();
  });

  test("a body without the shape, an inline body, --fill or no body is denied", () => {
    expect(pr(`gh pr create --title t --body-file ${bad}`)).toMatch(/Merge Danger.*\/dev-pr/);
    expect(pr('gh pr create --title t --body "## Summary"')).toMatch(/inline/);
    expect(pr('gh pr edit 3 -b "quick fix"')).toMatch(/inline/);
    expect(pr("gh pr create --fill")).toMatch(/\/dev-pr/);
    expect(pr("gh pr create --title t")).toMatch(/no body file/);
    expect(pr(`gh pr create --title t --body-file ${dir}/missing.md`)).toMatch(/does not exist/);
  });
});

describe("guard: every tool", () => {
  test("denies any tool while ANTHROPIC_API_KEY is set", () => {
    const env = { ANTHROPIC_API_KEY: "sk-test" };
    expect(denial(bash("ls"), env)).toMatch(/ANTHROPIC_API_KEY/);
    expect(denial({ tool_name: "Read", tool_input: { file_path: "/x" } }, env)).toMatch(
      /ANTHROPIC_API_KEY/,
    );
  });

  test("an Agent launch needs model: opus", () => {
    expect(denial({ tool_name: "Agent", tool_input: { prompt: "x" } }, {})).toMatch(/Opus/);
    expect(
      denial({ tool_name: "Agent", tool_input: { prompt: "x", model: "sonnet" } }, {}),
    ).toMatch(/Opus/);
    expect(
      denial({ tool_name: "Agent", tool_input: { prompt: "x", model: "opus" } }, {}),
    ).toBeUndefined();
  });

  test("edits have no path rules", () => {
    expect(
      denial({ tool_name: "Edit", tool_input: { file_path: "/repo/vendor/x.ts" } }, {}),
    ).toBeUndefined();
  });
});

describe("guard: the process", () => {
  const guard = (mode: string, stdin: string, env: Record<string, string | undefined>) =>
    spawnSync("bun", [`${import.meta.dir}/guard.ts`, mode], {
      input: stdin,
      encoding: "utf8",
      env: { PATH: process.env["PATH"], HOME: process.env["HOME"], ...env },
    });

  test("garbage stdin fails open", () => {
    const out = guard("pretool", "not json", {});
    expect(out.status).toBe(0);
    expect(out.stdout).toBe("");
  });

  test("a denial is a PreToolUse deny that starts with guard:", () => {
    const out = guard("pretool", JSON.stringify(bash("docker ps")), {});
    const reply = JSON.parse(out.stdout);
    expect(reply.hookSpecificOutput.permissionDecision).toBe("deny");
    expect(reply.hookSpecificOutput.permissionDecisionReason).toMatch(/^guard: no Docker/);
  });

  test("session warns only when the key is exported", () => {
    expect(guard("session", "{}", { ANTHROPIC_API_KEY: "sk-test" }).stdout).toMatch(
      /systemMessage/,
    );
    expect(guard("session", "{}", {}).stdout).toBe("");
  });

  test("stop does nothing when stop_hook_active is set", () => {
    const out = guard("stop", JSON.stringify({ stop_hook_active: true }), {});
    expect(out.status).toBe(0);
  });
});
