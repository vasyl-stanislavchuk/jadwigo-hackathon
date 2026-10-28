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

/** The HTTP method of a `gh api` call: -X/--method if given, else POST when it sends fields. */
function ghApiMethod(args: string[]): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const a = args[i] ?? "";
    if (a === "-X" || a === "--method") return args[i + 1]?.toUpperCase();
    if (a.startsWith("--method=")) return a.slice(9).toUpperCase();
    if (a.startsWith("-X") && a.length > 2) return a.slice(2).toUpperCase();
  }
  const sends = args.some((a) => /^(-f|-F|--field|--raw-field|--input)(=|$)|^-[fF]\S/.test(a));
  return sends ? "POST" : "GET";
}

/** The Makefile targets that write to a Supabase project; ENV=prod on any of them is the owner's. */
const DB_TARGET = /(^|[\s'",[(])db-(push|role|seed|reset)\b/;
const PROD = /\bENV\W{0,4}prod\b/;
/** Programs that can run a command on a pseudo-terminal, or hide one in a quoted script. */
const WRAPPERS =
  /^(script|expect|unbuffer|socat|python[\d.]*|perl|ruby|node|bun|deno|osascript|bash|sh|zsh|dash|fish)$/;
const CLEARS_CLAUDECODE =
  /(^|\s)(-u\s*|--unset[=\s]+)CLAUDECODE\b|\bunset\s+(-v\s+)?(\w+\s+)*CLAUDECODE\b|\bexport\s+(-\w+\s+)*-\w*n\w*\s+(\w+\s+)*CLAUDECODE\b|\b(typeset|declare|local)\s+([-+]\w+\s+)*\+\w*x\w*\s+(\w+\s+)*CLAUDECODE\b/;
/**
 * The env program: bare, by path (/usr/bin/env), GNU's under another name (genv, gnuenv), or found
 * by a substitution the text shows ($(which env), `command -v genv`). A variable holding it ($E -i)
 * is the documented limit (dl-5ssh.56).
 */
const ENV_PROGRAM =
  /(^|[\s;&|('"/])(g|gnu)?env(?=\s|$)|(\$\(|`)\s*(which|command\s+-v|type\s+-p|whence\s+-p)\s+\S*?(g|gnu)?env\s*(\)|`)/;
// exec's -a takes a name, so `exec -a x -c` still reaches the -c. The name never starts with '-',
// which keeps the two alternatives apart: otherwise 'exec ' + '-a '.repeat(n) backtracks for seconds.
export const EXEC_CLEARS =
  /(^|[\s;&|('"])exec\s+((-[A-Za-z]*a\s+[^-\s]\S*|-\w+)\s+)*-[A-Za-z]*c[A-Za-z]*(\s|$)/;
/** Whether a long option is a prefix GNU getopt accepts for one of env's: at least `--` and a letter. */
const longOption = (w: string, full: string) => w.length >= 3 && full.startsWith(w);
/** Programs that run a command on a pseudo-terminal; python counts when the line imports pty. */
const PTY_WRAPPERS = /^(script|expect|unbuffer|socat|screen|tmux)$/;
const MAKE = /(^|[\s'",[(])g?make\b/;

/**
 * Whether the text clears the whole environment, and CLAUDECODE with it: exec -c, or an env whose
 * options hold -i, - or --ignore-environment (or a prefix GNU accepts, --ig) anywhere, in a
 * short-flag cluster (-0i, -vi), after options that take a value (-u FOO, -C dir, -P path) or
 * inside an -S or --split-string string.
 */
function clearsEnv(text: string): boolean {
  if (EXEC_CLEARS.test(text)) return true;
  for (const m of text.matchAll(new RegExp(ENV_PROGRAM, "g"))) {
    // Quotes become spaces, so the words of an -S '...' string read as more options.
    const words = text
      .slice((m.index ?? 0) + m[0].length)
      .replace(/['"]/g, " ")
      .split(/\s+/)
      .filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      const w = words[i] ?? "";
      if (!w.startsWith("-") || w === "--") break;
      if (w === "-") return true;
      if (w.startsWith("--")) {
        const eq = w.indexOf("=");
        const name = eq < 0 ? w : w.slice(0, eq);
        if (longOption(name, "--ignore-environment")) return true;
        // --split-string=-i: the string's words read as more options.
        const value = w.slice(eq + 1);
        if (eq >= 0 && value && longOption(name, "--split-string")) words.splice(i + 1, 0, value);
        if (eq < 0 && ["--unset", "--chdir", "--argv0"].some((o) => longOption(name, o))) i++;
        continue;
      }
      for (let j = 1; j < w.length; j++) {
        const c = w[j] ?? "";
        if (c === "i") return true;
        if ("uCP".includes(c)) {
          if (j === w.length - 1) i++;
          break;
        }
      }
    }
  }
  return false;
}

/**
 * The line with shell quoting a word can hide behind undone: empty '' and "" pairs and backslashes
 * dropped, and quotes around a word with no space in it removed. `make db-pu''sh ENV=pr\od` reads
 * as `make db-push ENV=prod`. A quoted string with spaces stays, so prose in a commit message is
 * still prose to stripProse.
 */
export function unquoteWords(cmd: string): string {
  return cmd
    .replace(/\\(\S)/g, "$1")
    .replace(/'([^'\s]*)'/g, "$1")
    .replace(/"([^"\s]*)"/g, "$1");
}

/**
 * The prod db targets (dl-5ssh.45). The Makefile's PROD_GATE asks for a terminal and a typed prod
 * (dl-e8ov.2.34), but a session can fake the terminal with a pty, so a session never runs one: no
 * make db-* with ENV=prod, no clearing CLAUDECODE (the gate reads it), and no pty or script wrapper
 * whose quoted text names a db target and prod. Codex shells have no guard; the gate is all they meet.
 *
 * The guard reads text, so it runs on the raw line and on unquoteWords' copy of it. It does not
 * follow eval, $(...) or variables (`E=prod make db-push ENV=$E`), and it judges one call at a
 * time, so a makefile fragment written in one call and passed with `make -f` in the next gets past
 * it. The Makefile's PROD_GATE still stops both: it asks for a terminal and a typed prod.
 */
function prodDbDenial(cmd: string, bare: string, commands: string[][]): string | undefined {
  const base = (w: string) => w.slice(w.lastIndexOf("/") + 1);
  if (assignments(bare).some((a) => a.startsWith("CLAUDECODE=")) || CLEARS_CLAUDECODE.test(bare)) {
    return "clearing CLAUDECODE hides that a session runs the command, which the prod db gate reads. Leave it set.";
  }
  const runsDbTarget = MAKE.test(cmd) && DB_TARGET.test(cmd);
  // The -S string of env is quoted, so stripProse drops it: read the raw text when env runs at all.
  const envRuns = ENV_PROGRAM.test(bare);
  if (runsDbTarget && (clearsEnv(bare) || (envRuns && clearsEnv(cmd)))) {
    return "env -i, env - and exec -c clear CLAUDECODE with the rest of the environment, which the prod db gate reads. Run make db-* with the environment as it is.";
  }
  for (const words of commands) {
    const make = words.some((w) => /^g?make$/.test(base(w)));
    if (make && words.some((w) => DB_TARGET.test(w)) && PROD.test(cmd)) {
      return "make db-push, db-role, db-seed and db-reset with ENV=prod are the owner's, typed at their own terminal (`!` in Claude Code). From a session, use ENV=dev.";
    }
    const pty = words.some(
      (w) => PTY_WRAPPERS.test(base(w)) || (/^python[\d.]*$/.test(base(w)) && /\bpty\b/.test(cmd)),
    );
    if (pty && runsDbTarget) {
      return "a pty wrapper around make db-* fakes the terminal its gate asks for, whatever ENV says. Run make db-* directly; prod db steps are the owner's, typed at their own terminal.";
    }
    if (words.some((w) => WRAPPERS.test(base(w)))) {
      if (DB_TARGET.test(cmd) && /\bprod\b/.test(cmd)) {
        return "a pty or script wrapper around a prod db target fakes the terminal its gate asks for. Prod db steps are the owner's, typed at their own terminal.";
      }
      if (
        CLEARS_CLAUDECODE.test(cmd) ||
        (runsDbTarget && clearsEnv(cmd)) ||
        /CLAUDECODE/.test(cmd.replace(/\$\{?CLAUDECODE/g, ""))
      ) {
        return "a wrapped script that touches CLAUDECODE can hide that a session runs it, which the prod db gate reads. Leave it set.";
      }
    }
  }
  return undefined;
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

  // 3b. Prod db targets stay the owner's, however the terminal is faked or the words are quoted.
  const plain = unquoteWords(cmd);
  const plainBare = stripProse(plain);
  const prodDb =
    prodDbDenial(cmd, bare, commands) ?? prodDbDenial(plain, plainBare, simpleCommands(plainBare));
  if (prodDb) return prodDb;

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

    // 6. GitHub: the merge steward and ci-ok decide a merge. Nobody approves, admin-merges or
    // rewrites the ruleset from a session (david-learns/decisions/2026-10-26-the-merge-steward-is-
    // an-md-persona-that-reviews-on-the-subscript).
    if (prog === "gh") {
      const [area, sub, ...rest] = args;
      if (area === "pr" && sub === "merge" && rest.includes("--admin")) {
        return "gh pr merge --admin skips the required checks. Use `gh pr merge <n> --auto --squash` and let ci-ok and review-ok decide.";
      }
      if (area === "pr" && sub === "review" && rest.some((a) => a === "--approve" || a === "-a")) {
        return "no approvals from a session. md's merge steward posts review-ok; there is no approval gate.";
      }
      if (area === "api") {
        const method = ghApiMethod(args.slice(1));
        const settings = /(^|\/)rulesets(\/|$)|(^|\/)branches\/[^/\s]+\/protection(\/|$)/;
        const target = args.slice(1).some((a) => settings.test(a)) || settings.test(cmd);
        if (method && method !== "GET" && target) {
          return "rulesets and branch protection are the owner's to change. Edit .github/rulesets/main.json in a PR and name the apply command under Merge Danger.";
        }
      }
    }

    // 7. The board: --notes replaces a bead's whole log.
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
