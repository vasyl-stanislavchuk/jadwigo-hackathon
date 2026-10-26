#!/usr/bin/env bun
// guard.ts: the rules a session must not break, enforced instead of remembered.
// Ported from david-learns's .claude/hooks/guard.sh and extended for jadwigo (dl-5ssh.34.2).
//
//   bun .claude/hooks/guard.ts pretool   PreToolUse on every tool: may deny the call
//   bun .claude/hooks/guard.ts session   SessionStart: warns when ANTHROPIC_API_KEY is exported
//   bun .claude/hooks/guard.ts format    PostToolUse on Edit|Write: Biome on the edited file
//   bun .claude/hooks/guard.ts stop      Stop: make check (the affected lint, typecheck and test)
//
// Fails OPEN on every absence (no input, unparseable input): a guard that cannot give up is a hang.
// A denial always starts with "guard:" and says what to do instead. Cases: guard.test.ts.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname, isAbsolute, join, relative } from "node:path";
import { checkPrBody } from "../../tools/src/check-pr-body.ts";

export interface HookInput {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  cwd?: string;
  stop_hook_active?: boolean;
}

type Env = Record<string, string | undefined>;

/** Where the current branch is asked for. Injected in tests. */
export type BranchOf = (cwd: string | undefined) => string | undefined;

const OTHER_DATABASES = [
  "gbrain",
  "medallion_context",
  "adam_calling",
  "preply_lesson_dev",
  "dl",
  "dl_brain",
];

/** Drop heredoc bodies and quoted strings, so prose about a command is never taken for one. */
export function stripProse(cmd: string): string {
  return cmd
    .replace(/<<-?\s*(['"]?)(\w+)\1[\s\S]*?\n\2[ \t]*(\n|$)/g, "\n")
    .replace(/'[^']*'/g, "")
    .replace(/"(?:[^"\\]|\\.)*"/g, "");
}

/** Split into simple commands and drop env assignments and wrappers, leaving argv-like words. */
export function simpleCommands(bare: string): string[][] {
  return bare
    .split(/&&|\|\||[;&|()\n]/)
    .map((segment) => segment.trim().split(/\s+/).filter(Boolean))
    .map((words) => {
      let i = 0;
      while (
        i < words.length &&
        (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[i] ?? "") ||
          ["env", "command", "exec", "time", "nohup", "sudo", "xargs"].includes(words[i] ?? ""))
      ) {
        i++;
      }
      return words.slice(i);
    })
    .filter((words) => words.length > 0);
}

/** The env assignments written in front of the command, e.g. AWS_PROFILE=prod terraform plan. */
function assignments(bare: string): string[] {
  return bare.match(/(^|\s)[A-Za-z_][A-Za-z0-9_]*=\S*/g)?.map((a) => a.trim()) ?? [];
}

function gitSub(words: string[]): { sub: string; args: string[] } | undefined {
  if (words[0] !== "git") return undefined;
  let i = 1;
  // Skip git's own options: -C dir, -c k=v, --no-pager and the like.
  while (i < words.length && (words[i] ?? "").startsWith("-")) {
    if (words[i] === "-C" || words[i] === "-c") i++;
    i++;
  }
  const sub = words[i];
  return sub ? { sub, args: words.slice(i + 1) } : undefined;
}

const USE_DEV_PR = "Write the body with /dev-pr into a file, then pass it with --body-file <path>.";

/** gh pr create always carries a body file that passes check-pr-body; gh pr edit does when it sets the body. */
/** The body a heredoc in the same command writes to file (`cat > file <<'EOF'`), since the hook runs first. */
function heredocBody(full: string, file: string): string | undefined {
  const at = full.indexOf(file);
  if (at < 0) return undefined;
  const after = full.slice(at + file.length);
  const m = /^['"]?\s*<<-?\s*(['"]?)(\w+)\1[^\n]*\n([\s\S]*?)\n\2[ \t]*(\n|$)/.exec(after);
  return m?.[3];
}

function prBodyDenial(
  cmd: string,
  full: string,
  args: string[],
  cwd: string | undefined,
): string | undefined {
  const setsBody = args.some((a) =>
    /^(--body|-b|--body-file|-F|--fill|--fill-first|--fill-verbose)(=|$)/.test(a),
  );
  // cmd is stripProse's output: heredocs and quoted text are gone, so prose that mentions
  // gh pr create is never read as the call, and an inline --body "…" leaves its flag behind.
  const at = cmd.search(/\bgh\s+pr\s+(create|edit)\b/);
  const raw = cmd.slice(Math.max(at, 0)).split(/&&|\|\||;|\n/)[0] ?? "";
  const inline = /(^|\s)(--body|-b)(=|\s)/.test(raw);
  if (args[1] === "edit" && !setsBody && !inline) return undefined;
  if (inline || args.some((a) => /^--fill/.test(a)))
    return `an inline or generated PR body skips the /dev-pr shape. ${USE_DEV_PR}`;
  const file = /(?:^|\s)(?:--body-file|-F)(?:=|\s+)(['"]?)([^'"\s]+)\1/.exec(raw)?.[2];
  if (!file || file === "-") return `this PR has no body file. ${USE_DEV_PR}`;
  const home = file.startsWith("~/") ? join(process.env["HOME"] ?? "~", file.slice(2)) : file;
  const path = isAbsolute(home) ? home : join(cwd ?? ".", home);
  const body = existsSync(path) ? readFileSync(path, "utf8") : heredocBody(full, file);
  if (body === undefined) return `the body file ${file} does not exist. ${USE_DEV_PR}`;
  const problems = checkPrBody(body);
  if (problems.length > 0) return `the PR body in ${file} is ${problems.join("; ")}. ${USE_DEV_PR}`;
  return undefined;
}

function bashDenial(
  cmd: string,
  env: Env,
  cwd: string | undefined,
  branchOf: BranchOf,
): string | undefined {
  const bare = stripProse(cmd);
  const commands = simpleCommands(bare);

  for (const words of commands) {
    const [prog = "", ...args] = words;

    // 1. gbrain without its isolation env runs against whatever brain the shell points at.
    if (prog === "gbrain") {
      const harmless =
        /^(--version|--help|-h|help|--tools-json)$/.test(args[0] ?? "") ||
        (args[0] === "schema" && args[1] === "active");
      const isolatedInCmd = cmd.includes("GBRAIN_HOME=") && cmd.includes("GBRAIN_DATABASE_URL=");
      const isolatedInEnv = Boolean(env["GBRAIN_HOME"] && env["GBRAIN_DATABASE_URL"]);
      if (!harmless && !isolatedInCmd && !isolatedInEnv) {
        return 'this gbrain command carries no isolation env. Ask the brain through md instead: `md context ask "<question>" --project jadwigo-platform`, or `md context search`.';
      }
      if (/GBRAIN_DATABASE_URL=["']?\S*\/gbrain([^_\w]|$)/.test(cmd)) {
        return "GBRAIN_DATABASE_URL points at the retired personal brain (gbrain). Use md context.";
      }
      if (args[0] === "think") {
        return "'gbrain think' spends the metered deep tier. Retrieve with search or query and synthesize in the session.";
      }
    }

    // 2. Other projects' databases are not ours to touch.
    if (["psql", "createdb", "dropdb", "pg_restore", "pg_dump"].includes(prog)) {
      const named = args.flatMap((a) => a.split(/[/=]/));
      const other = OTHER_DATABASES.find((db) => named.includes(db));
      if (other)
        return `that command names another project's Postgres database (${other}). jadwigo's databases are named jadwigo*.`;
    }

    // 3. Infra: no apply from a session, no prod profile, no containers.
    if (prog === "terraform" && args.includes("apply")) {
      return "terraform apply is the owner's, from the prod environment (dl-5ssh.34.4). Run terraform plan and put the plan in the PR.";
    }
    if (prog === "make" && args.includes("apply")) {
      return "make apply runs terraform apply, which is the owner's. Run make plan.";
    }
    const profileArg = args.indexOf("--profile");
    const profile =
      profileArg >= 0
        ? args[profileArg + 1]
        : args.find((a) => a.startsWith("--profile="))?.slice(10);
    if (profile && /prod/i.test(profile)) {
      return `the AWS profile ${profile} is prod. Sessions never hold prod credentials; the owner runs prod steps.`;
    }
    if (["docker", "docker-compose", "podman"].includes(prog)) {
      return "no Docker in jadwigo, locally or in CI. Postgres comes from Postgres.app, moto_server from pip.";
    }
    if (prog === "supabase" && args[0] === "start") {
      return "supabase start runs Docker. Apply migrations to Postgres.app with `supabase migration up --db-url` (dl-5ssh.34.34).";
    }

    // 4. Git: main is reached through a PR, history is not rewritten, staging is explicit.
    const git = gitSub(words);
    if (git) {
      const { sub, args: gargs } = git;
      if (gargs.includes("--no-verify") || (sub === "commit" && gargs.includes("-n"))) {
        return "--no-verify skips the pre-commit fences (Biome, gitleaks). Fix what they report instead.";
      }
      if (sub === "push") {
        if (
          gargs.some(
            (a) =>
              /^(--force|--force-with-lease|--force-if-includes|-f)(=|$)/.test(a) || /^\+/.test(a),
          )
        ) {
          return "no force-push. Push a new commit on top, or open a new branch.";
        }
        const refspecs = gargs.filter((a) => !a.startsWith("-")).slice(1);
        const toMain = refspecs.some((r) => /(^|:)(refs\/heads\/)?main$/.test(r));
        const implicit = refspecs.length === 0 && branchOf(cwd) === "main";
        if (toMain || implicit) {
          return "main is reached only through a PR (squash-merge after ci-ok). Push your branch and open a PR with `gh pr create`.";
        }
      }
      if (
        sub === "add" &&
        gargs.some((a) => a === "-A" || a === "--all" || a === "." || a === ":/")
      ) {
        return "stage files by name (`git add path/to/file`), so nothing unreviewed rides along.";
      }
      if (
        sub === "pull" &&
        gargs.some(
          (a) =>
            a === "--rebase" || a === "-r" || a === "--rebase=true" || a === "--rebase=interactive",
        )
      ) {
        return "a plain rebase replays merged work. Use `git pull --rebase=merges`, or `git pull --ff-only`.";
      }
    }

    // 5. PR bodies have the /dev-pr shape, checked here so a session fixes it before CI does.
    if (prog === "gh" && args[0] === "pr" && (args[1] === "create" || args[1] === "edit")) {
      const reason = prBodyDenial(bare, cmd, args, cwd);
      if (reason) return reason;
    }

    // 6. The board: --notes replaces a bead's whole log.
    if (
      prog === "bd" &&
      args.includes("update") &&
      args.some((a) => a === "--notes" || a.startsWith("--notes="))
    ) {
      return "bd update --notes replaces the whole notes field. Use --append-notes.";
    }
  }

  // Prod through the environment: AWS_PROFILE=prod-admin aws s3 ls
  const prodProfile = assignments(bare).find((a) => /^AWS_PROFILE=\S*prod/i.test(a));
  if (prodProfile) return `${prodProfile} is a prod profile. Sessions never hold prod credentials.`;
  return undefined;
}

/** The pretool decision: a reason to deny, or undefined to allow. */
export function denial(
  input: HookInput,
  env: Env,
  branchOf: BranchOf = currentBranch,
): string | undefined {
  if (env["ANTHROPIC_API_KEY"]) {
    return "ANTHROPIC_API_KEY is set in this session's environment, so it bills the API instead of the subscription. Quit, run `unset ANTHROPIC_API_KEY` in a fresh shell, and relaunch.";
  }
  const tool = input.tool_name;
  if (tool === "Agent" || tool === "Task") {
    if (input.tool_input?.["model"] !== "opus") {
      return 'every agent runs on Opus. Launch it again with model: "opus".';
    }
    return undefined;
  }
  if (tool === "Bash") {
    const cmd = input.tool_input?.["command"];
    if (typeof cmd === "string" && cmd) return bashDenial(cmd, env, input.cwd, branchOf);
  }
  return undefined;
}

function currentBranch(cwd: string | undefined): string | undefined {
  const out = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: cwd ?? ".",
    encoding: "utf8",
  });
  return out.status === 0 ? out.stdout.trim() : undefined;
}

const BIOME_FILES = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".jsonc",
  ".css",
]);

function run(mode: string, raw: string, env: Env): number {
  let input: HookInput;
  try {
    input = raw.trim() ? (JSON.parse(raw) as HookInput) : {};
  } catch {
    return 0;
  }

  if (mode === "session") {
    if (env["ANTHROPIC_API_KEY"]) {
      const msg =
        "guard: ANTHROPIC_API_KEY is exported in this session's environment, so every tool call is denied. Quit, run `unset ANTHROPIC_API_KEY` in a fresh shell, and relaunch.";
      console.log(
        JSON.stringify({
          systemMessage: msg,
          hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: msg },
        }),
      );
    }
    return 0;
  }

  if (mode === "pretool") {
    const reason = denial(input, env);
    if (reason) {
      console.log(
        JSON.stringify({
          hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: `guard: ${reason}`,
          },
        }),
      );
    }
    return 0;
  }

  const root = env["CLAUDE_PROJECT_DIR"] ?? input.cwd ?? ".";

  if (mode === "format") {
    const path = input.tool_input?.["file_path"];
    if (typeof path !== "string" || !BIOME_FILES.has(extname(path)) || !existsSync(path)) return 0;
    const rel = isAbsolute(path) ? relative(root, path) : path;
    if (rel.startsWith("..")) return 0;
    const out = spawnSync("bunx", ["biome", "check", "--write", "--no-errors-on-unmatched", rel], {
      cwd: root,
      encoding: "utf8",
    });
    if (out.status !== 0) {
      console.error(`biome found problems in ${rel} it could not fix:\n${out.stdout}${out.stderr}`);
      return 2;
    }
    return 0;
  }

  if (mode === "stop") {
    if (input.stop_hook_active) return 0;
    const out = spawnSync("make", ["check"], {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, TURBO_OUTPUT_LOGS: "errors-only" },
    });
    if (out.status !== 0) {
      console.error(
        `make check failed. Fix it before you finish:\n${(out.stdout + out.stderr).slice(-6000)}`,
      );
      return 2;
    }
    return 0;
  }
  return 0;
}

if (import.meta.main) {
  const raw = await Bun.stdin.text().catch(() => "");
  process.exit(run(process.argv[2] ?? "pretool", raw, process.env));
}
