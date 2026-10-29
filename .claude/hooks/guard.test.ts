// Cases for guard.ts: each rule with a planted violation that must be denied, and the near misses
// that must pass. The cases live in this file, not on a command line, so the guard never judges
// its own test strings. Run: bun test .claude/hooks
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { denial, EXEC_CLEARS, type HookInput } from "./guard.ts";

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
  // prod db targets and CLAUDECODE (dl-5ssh.45)
  ["make db-push ENV=prod", "DENY", "make db-push ENV=prod"],
  ["make db-role ENV=prod", "DENY", "make db-role ENV=prod"],
  ["make db-seed ENV=prod", "DENY", "make db-seed ENV=prod"],
  ["make db-reset ENV=prod", "DENY", "make db-reset ENV=prod"],
  ["ENV=prod in front", "DENY", "ENV=prod make db-push"],
  ["ENV quoted", "DENY", 'make -C . db-seed ENV="prod"'],
  ["exported ENV", "DENY", "export ENV=prod && make db-seed"],
  ["CLAUDECODE= in front", "DENY", "CLAUDECODE= make db-push ENV=dev"],
  ["CLAUDECODE emptied by quotes", "DENY", 'CLAUDECODE="" make db-push'],
  ["env -u CLAUDECODE", "DENY", "env -u CLAUDECODE make db-push ENV=dev"],
  ["env --unset=CLAUDECODE", "DENY", "env --unset=CLAUDECODE bash"],
  ["unset CLAUDECODE", "DENY", "unset CLAUDECODE; make db-push ENV=dev"],
  ["export -n CLAUDECODE", "DENY", "export -n CLAUDECODE"],
  ["script pty", "DENY", "script -q /dev/null make db-push ENV=prod"],
  ["script -c pty", "DENY", 'script -qc "make db-role ENV=prod" /dev/null'],
  ["expect spawn", "DENY", 'expect -c "spawn make db-seed ENV=prod; send prod\\r; interact"'],
  [
    "python pty spawn",
    "DENY",
    "python3 -c \"import pty; pty.spawn(['make', 'db-push', 'ENV=prod'])\"",
  ],
  [
    "python heredoc pty",
    "DENY",
    "python3 - <<'EOF'\nimport pty\npty.spawn(['make','db-push','ENV=prod'])\nEOF",
  ],
  ["bash -c clearing CLAUDECODE", "DENY", "bash -c 'unset CLAUDECODE; make db-push ENV=dev'"],
  ["python popping CLAUDECODE", "DENY", "python3 -c \"import os; os.environ.pop('CLAUDECODE')\""],
  // quote tricks and clearing the whole environment (PR #81 review)
  [
    "pty with quote-split words",
    "DENY",
    "printf 'pr''od\\n' | env -i PATH=$PATH script -q /dev/null make db-pu''sh ENV=pr''od",
  ],
  ["empty quotes in the target", "DENY", "make db-pu''sh ENV=pr\"\"od"],
  ["backslash in prod", "DENY", "make db-push ENV=p\\rod"],
  ["quoted make word", "DENY", "'make' 'db-push' ENV='prod'"],
  ["script pty, ENV=dev", "DENY", "script -q /dev/null make db-push ENV=dev"],
  ["unbuffer pty", "DENY", "unbuffer make db-seed"],
  ["socat pty", "DENY", "socat - EXEC:'make db-role',pty"],
  ["expect, ENV=dev", "DENY", 'expect -c "spawn make db-reset ENV=dev; interact"'],
  ["python pty, ENV=dev", "DENY", "python3 -c \"import pty; pty.spawn(['make', 'db-push'])\""],
  ["env -i make db-push", "DENY", "env -i PATH=/usr/bin:/bin make db-push"],
  ["env - make db-push", "DENY", "env - make db-push"],
  ["env --ignore-environment", "DENY", "env --ignore-environment make db-push"],
  ["exec -c make db-push", "DENY", "exec -c make db-push"],
  ["typeset +x CLAUDECODE", "DENY", "typeset +x CLAUDECODE; make db-push"],
  ["declare +x CLAUDECODE", "DENY", "declare +x CLAUDECODE; make db-push ENV=dev"],
  ["bash -c env -i", "DENY", "bash -c 'env -i make db-seed ENV=dev'"],
  // env by path, options before -i, -S strings, screen and tmux (PR #81 round 2)
  ["/usr/bin/env -i", "DENY", "/usr/bin/env -i PATH=/usr/bin:/bin make db-push"],
  ["env -S string", "DENY", "env -S '-i PATH=/usr/bin:/bin make db-push'"],
  ["env -P then -i", "DENY", "env -P /usr/bin -i make db-push"],
  ["env -C then -i", "DENY", "env -C . -i make db-push"],
  ["env -u then -i", "DENY", "env -u FOO -i make db-push"],
  ["env -0i cluster", "DENY", "env -0i make db-push"],
  ["env --ignore-env", "DENY", "env --ignore-env make db-push"],
  ["command env -i", "DENY", "command env -i make db-push"],
  ["sudo env -i", "DENY", "sudo env -i make db-push"],
  [
    "screen under /usr/bin/env -i",
    "DENY",
    `E=pr; /usr/bin/env -i PATH=$PATH screen -dm make db-push ENV=\${E}od`,
  ],
  [
    "tmux under /usr/bin/env -i",
    "DENY",
    `/usr/bin/env -i PATH=$PATH tmux new-session -d "make db-push ENV=\${E}od"`,
  ],
  ["screen, ENV=dev", "DENY", "screen -dm make db-seed ENV=dev"],
  ["tmux, plain", "DENY", 'tmux new-session -d "make db-role"'],
  ["local +x CLAUDECODE", "DENY", "local +x CLAUDECODE; make db-push"],
  ["export -fn CLAUDECODE", "DENY", "export -fn CLAUDECODE"],
  // GNU env under other names, getopt abbreviations, env found by substitution (dl-5ssh.56)
  ["genv -i make db-push", "DENY", "genv -i make db-push"],
  ["gnuenv -i make db-push", "DENY", "gnuenv -i PATH=$PATH make db-push"],
  ["genv --ignore-env", "DENY", "genv --ignore-env make db-push"],
  ["/opt/homebrew/bin/genv -i", "DENY", "/opt/homebrew/bin/genv -i make db-seed"],
  ["env --ignore-environ", "DENY", "env --ignore-environ make db-push"],
  ["env --ig", "DENY", "env --ig make db-push"],
  ["env --i", "DENY", "env --i make db-push"],
  ["env --split-string=-i", "DENY", "env --split-string=-i make db-push"],
  ["env --split=-i", "DENY", "env --split='-i PATH=/bin' make db-push"],
  ["env --un FOO then -i", "DENY", "env --un FOO -i make db-push"],
  ["$(which env) -i", "DENY", "$(which env) -i make db-push"],
  ["backtick which env -i", "DENY", "`which env` -i make db-push"],
  ["$(command -v genv) -i", "DENY", "$(command -v genv) -i make db-role ENV=dev"],
  ["genv -i, no db target", "allow", "genv -i PATH=/bin ls"],
  ["env --unset FOO", "allow", "env --unset FOO make db-push ENV=dev"],
  ["env --split-string, no -i", "allow", "env --split-string='FOO=1' make db-push ENV=dev"],
  ["$(which env), no -i", "allow", "$(which env) FOO=1 make db-push ENV=dev"],
  ["env | grep", "allow", "env | grep X"],
  ["env -i ls", "allow", "env -i PATH=/bin ls"],
  ["env -u, then make db-push ENV=dev", "allow", "env -u FOO make db-push ENV=dev"],
  ["commit message naming env -i", "allow", 'git commit -m "env -i notes"'],
  ["commit message naming env -i and a target", "allow", "git commit -m 'env -i make db-push'"],
  ["bd create naming a pty", "allow", 'bd create "script make db-push prod"'],
  ["printenv", "allow", "printenv"],
  ["env -i, no db target", "allow", "env -i PATH=$PATH bun test"],
  ["exec -a x -c", "DENY", "exec -a x -c make db-push"],
  ["exec -a x -lc", "DENY", "exec -a x -lc make db-seed ENV=dev"],
  ["exec -c, no db target", "allow", "exec -c ls"],
  ["exec -a x, no -c", "allow", "exec -a x ls"],
  ["make with a quoted word", "allow", "make 'lint' ENV=dev"],
  ["make db-push ENV=dev", "allow", "make db-push ENV=dev"],
  ["make db-seed, local", "allow", "make db-seed"],
  ["make db-reset ENV=dev", "allow", "make db-reset ENV=dev"],
  ["read CLAUDECODE", "allow", "echo $CLAUDECODE"],
  ["grep CLAUDECODE", "allow", "grep -n CLAUDECODE Makefile"],
  ["commit message naming it", "allow", "git commit -m 'guard: deny make db-push ENV=prod'"],
  ["python with no db target", "allow", "python3 -c 'print(1)'"],
  ["db-targets test", "allow", "bunx vitest run tools/src/db-targets.test.ts"],
  // deploys are the owner's (dl-5ssh.52)
  ["make -C infra deploy", "DENY", "make -C infra deploy"],
  ["make -C infra api-deploy", "DENY", "make -C infra api-deploy"],
  ["make -C infra web-deploy", "DENY", "make -C infra web-deploy"],
  ["make -C infra site-deploy", "DENY", "make -C infra site-deploy"],
  ["cd infra && make deploy", "DENY", "cd infra && make deploy"],
  ["gmake by path", "DENY", "/opt/homebrew/bin/gmake -C infra site-deploy"],
  ["env -u CLAUDECODE make deploy", "DENY", "env -u CLAUDECODE make -C infra deploy"],
  ["env -u CLAUDECODE make api-deploy", "DENY", "env -u CLAUDECODE make -C infra api-deploy"],
  ["env -u CLAUDECODE make web-deploy", "DENY", "env -u CLAUDECODE make -C infra web-deploy"],
  ["env -u CLAUDECODE make site-deploy", "DENY", "env -u CLAUDECODE make -C infra site-deploy"],
  ["CLAUDECODE= make deploy", "DENY", "CLAUDECODE= make -C infra deploy"],
  ["env -i make deploy", "DENY", "env -i PATH=$PATH make -C infra deploy"],
  ["env - make web-deploy", "DENY", "env - make -C infra web-deploy"],
  ["exec -c make deploy", "DENY", "exec -c make -C infra deploy"],
  ["quoted target", "DENY", "make -C infra 'site-deploy'"],
  ["bash -c make deploy", "DENY", "bash -c 'make -C infra deploy'"],
  ["eval make deploy", "DENY", "eval 'make -C infra api-deploy'"],
  ["make -Cn is a directory, not a dry run", "DENY", "make -Cn deploy"],
  ["make -n -C infra deploy", "allow", "make -n -C infra deploy"],
  ["make --dry-run site-deploy", "allow", "make --dry-run -C infra site-deploy"],
  ["make -sn deploy", "allow", "make -sn -C infra deploy"],
  ["make -C infra plan", "allow", "make -C infra plan"],
  ["make api-bundle", "allow", "make api-bundle"],
  [
    "commit message naming make deploy",
    "allow",
    "git commit -m 'guard: deny make -C infra deploy'",
  ],
  ["grep deploy", "allow", "grep -n deploy infra/Makefile"],
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

  test("exec with a long run of -a stays linear (dl-5ssh.56)", () => {
    const line = `exec ${"-a ".repeat(20_000)}make db-push`;
    const start = performance.now();
    EXEC_CLEARS.test(line);
    expect(performance.now() - start).toBeLessThan(200);
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

  test("a body file path is read the way the shell would (dl-5ssh.69)", () => {
    const body = "## Summary\n\nx\n\n## Evidence\n\ny\n\n## Merge Danger\n\n**Door:** two-way\n";
    expect(
      pr(
        `S=${dir}/s; cat > $S/b.md <<'EOF'\n${body}EOF\ngh pr create --title t --body-file $S/b.md`,
      ),
    ).toBeUndefined();
    expect(pr(`P="${good}" && gh pr create --title t --body-file "$P"`)).toBeUndefined();
    expect(pr("gh pr create --title t --body-file $(mktemp)")).toMatch(/before the command runs/);
    expect(pr(`sed -i '' 's/x/y/' ${good} && gh pr create --body-file ${good}`)).toMatch(
      /before the command runs/,
    );
    expect(
      pr(`git commit -m "the guard's check: gh pr create --body-file with a body" && git push`),
    ).toBeUndefined();
    expect(pr(`gh pr create --title "x;y" --body-file ${good}`)).toBeUndefined();
  });

  test("a variable the guard cannot pin to one value is denied", () => {
    const bump = `P=${bad}; gh pr create --title t --body-file "$P"; P=${good}`;
    expect(pr(bump)).toMatch(/Merge Danger/);
    const twice = `P=${bad}; P=${good}; gh pr create --title t --body-file $P`;
    expect(pr(twice)).toMatch(/before the command runs/);
    const branch = `if false; then P=${good}; fi; gh pr create --title t --body-file $P`;
    expect(pr(branch)).toMatch(/before the command runs/);
    const sub = `(P=${good}); gh pr create --title t --body-file $P`;
    expect(pr(sub)).toMatch(/before the command runs/);
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
