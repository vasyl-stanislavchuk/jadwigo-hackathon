// `make builder` (dl-a38n.10): starts the Claude Code session the live lesson builder talks to.
// It mints the session id, writes it to JADWIGO_DRAFTS_DIR/.builder/session.json for the web dev server,
// and runs claude --session-id <id> --dangerously-load-development-channels=server:jadwigo-builder
// with JADWIGO_BUILDER_SESSION exported to the channel. Claude Code does not tell an MCP server its
// session id, so the launcher names it (md's annotate launch, commands/annotate.py).
// A claude that started without the flag drops every comment silently, so the launcher reads the
// started process's command line with `ps` and stops it, plainly, when the flag is missing.
// Run: bun tools/builder/launch.ts [claude args...]
import { execFile, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { claudeBin, claudeConfigDir, claudeProfile, draftsDir, sessionEnv } from "./config.ts";
import { type BuilderSession, sessionFile } from "./drafts.ts";
import { CHANNELS_FLAG, claudeBelow, loadsThisChannel, psTable, SERVER_NAME } from "./flag.ts";

// The equals form: the flag takes many values, and as two tokens it would take what follows too.
export const CHANNEL_ARG = `${CHANNELS_FLAG}=server:${SERVER_NAME}`;
// Long enough for claude to have exec'd past any wrapper, short of anyone typing a comment.
const CHECK_AFTER_MS = 2_000;

const REPO = resolve(dirname(new URL(import.meta.url).pathname), "..", "..");

/** Claude Code's folder name for a project: the cwd with every character but letters and digits as -. */
export function projectSlug(cwd: string): string {
  return cwd.replace(/[^A-Za-z0-9]/g, "-");
}

export function sessionRecord(
  sessionId: string,
  cwd: string,
  configDir: string,
  now: Date,
): BuilderSession {
  return {
    session_id: sessionId,
    started_at: now.toISOString(),
    cwd,
    transcript: join(configDir, "projects", projectSlug(cwd), `${sessionId}.jsonl`),
  };
}

export function writeSession(dir: string, record: BuilderSession): string {
  const path = sessionFile(dir);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(record, null, 2)}\n`);
  return path;
}

export function claudeArgs(sessionId: string, extra: readonly string[]): string[] {
  return ["--session-id", sessionId, CHANNEL_ARG, ...extra];
}

/** The line to register the channel for this user: the owner runs it, the launcher only prints it. */
export function registerLine(repo: string): string {
  const config = JSON.stringify({
    type: "stdio",
    command: "bun",
    args: [join(repo, "tools", "builder", "channel.ts")],
  });
  return `claude mcp add-json --scope user ${SERVER_NAME} '${config}'`;
}

/** What `claude mcp get <name>` said: not there, or there with its Args line. */
export type Registration = { found: false } | { found: true; args: string };

/** The Args line of `claude mcp get`'s answer. */
export function argsOf(output: string): string {
  return /^\s*Args:\s*(.*)$/m.exec(output)?.[1]?.trim() ?? "";
}

/**
 * jw's own registration line, as apps/cli/README.md writes it under "Registering it" (the name
 * before its -e flags, dl-e8ov.5.38.9), so the launcher's hint and the README never drift.
 */
export function jadwigoLine(readme: string): string {
  const block = /```sh\n(claude mcp add [\s\S]*?)\n```/.exec(readme)?.[1];
  return block ?? "";
}

const indent = (text: string) =>
  text
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");

/**
 * Why the session cannot work, or "" when it can, then any note to act on later. Each line is one
 * the owner acts on: a server that is not registered is never started, so the page's comments
 * would go nowhere. A registration lives in one Claude Code profile, so the refusal names the one
 * it checked.
 */
export function registrationHints(
  regs: { builder: Registration; jadwigo: Registration },
  repo: string,
  readme: string,
  profile: { file: string; from: string },
): { refuse: string; note: string } {
  const lines: string[] = [];
  if (!regs.builder.found) {
    lines.push(
      `${SERVER_NAME} is not registered, so comments from the page would reach no one. Register it:`,
      "",
      indent(registerLine(repo)),
      "",
    );
  }
  if (!regs.jadwigo.found) {
    const line = jadwigoLine(readme);
    lines.push(
      "jadwigo (jw mcp serve) is not registered, so the session cannot draft a lesson. Register it",
      `as ${join(repo, "apps", "cli", "README.md")} does, with your paths:`,
      "",
      indent(line || `the line under "Registering it" in apps/cli/README.md`),
      "",
    );
  }
  const refuse = lines.length
    ? [
        `make builder checked the Claude Code profile at ${profile.file} (${profile.from}).`,
        "A registration counts only in the profile the session runs in: run these lines in this same",
        "terminal, or set CLAUDE_CONFIG_DIR to the profile that has them, then run make builder again.",
        "",
        ...lines,
      ].join("\n")
    : "";
  const channel = join(repo, "tools", "builder", "channel.ts");
  const note =
    regs.builder.found && !regs.builder.args.includes(channel)
      ? [
          `${SERVER_NAME} runs ${regs.builder.args || "another server"}, not this checkout's ${channel}.`,
          "To point it here, remove it first (add-json does not overwrite a name), then add it:",
          "",
          `  claude mcp remove --scope user ${SERVER_NAME}`,
          indent(registerLine(repo)),
          "",
        ].join("\n")
      : "";
  return { refuse, note };
}

/** The refusal for a started claude, or "" when it loaded the channel or no claude was found. */
export function refusal(command: string | null): string {
  if (command === null || loadsThisChannel(command)) return "";
  return [
    `make builder: the claude it started has no ${CHANNEL_ARG},`,
    "so Claude Code would drop every comment from the page without a word. It was stopped.",
    `Start the session with make builder, and check that ${claudeBin()} passes its arguments through.`,
  ].join("\n");
}

/** What `claude mcp get <name>` says; exit 0 means registered. */
function registration(bin: string, name: string): Promise<Registration> {
  return new Promise((done) => {
    execFile(bin, ["mcp", "get", name], { cwd: REPO }, (error, stdout) =>
      done(error ? { found: false } : { found: true, args: argsOf(String(stdout)) }),
    );
  });
}

async function main() {
  const bin = claudeBin();
  const [builder, jadwigo] = await Promise.all([
    registration(bin, SERVER_NAME),
    registration(bin, "jadwigo"),
  ]);
  const readme = readFileSync(join(REPO, "apps", "cli", "README.md"), "utf8");
  const hints = registrationHints({ builder, jadwigo }, REPO, readme, claudeProfile());
  if (hints.refuse) {
    console.error(hints.refuse);
    process.exit(1);
  }
  if (hints.note) console.error(hints.note);

  const dir = draftsDir();
  const sessionId = randomUUID();
  const path = writeSession(dir, sessionRecord(sessionId, REPO, claudeConfigDir(), new Date()));
  console.error(`make builder: session ${sessionId}, written to ${path}`);

  const env = sessionEnv(sessionId, dir);
  const child = spawn(bin, claudeArgs(sessionId, process.argv.slice(2)), {
    cwd: REPO,
    env,
    stdio: "inherit",
  });
  let refused = "";
  const check = setTimeout(() => {
    if (child.pid === undefined || child.exitCode !== null) return;
    refused = refusal(claudeBelow(psTable(), child.pid));
    if (refused) child.kill("SIGTERM");
  }, CHECK_AFTER_MS);
  child.on("exit", (code, signal) => {
    clearTimeout(check);
    if (refused) {
      console.error(refused);
      process.exit(1);
    }
    process.exit(code ?? (signal ? 1 : 0));
  });
  child.on("error", (error) => {
    console.error(`make builder: cannot start ${bin}: ${error.message}`);
    process.exit(1);
  });
}

if (import.meta.main) {
  await main();
}
