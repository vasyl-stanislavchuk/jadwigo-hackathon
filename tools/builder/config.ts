// The live lesson builder's settings (dl-a38n.2), the one place tools/builder reads the environment.
// The drafts directory is jw's JADWIGO_DRAFTS_DIR with jw's default, so the channel, the launcher,
// jw mcp serve and the web dev server all read and write the same files.
import { homedir } from "node:os";
import { join } from "node:path";

type Env = Record<string, string | undefined>;

/** HOME as jw's expanduser reads it: the environment's HOME, else the account's home. */
function home(env: Env): string {
  return (env["HOME"] ?? "").trim() || homedir();
}

/**
 * JADWIGO_DRAFTS_DIR from the environment, trimmed, with a leading ~ or ~/ expanded to HOME as jw
 * expands it (dl-a38n.21), so jw, the channel, the launcher and the web watcher share one directory.
 */
export function draftsDir(env: Env = process.env): string {
  const set = (env["JADWIGO_DRAFTS_DIR"] ?? "").trim();
  if (!set) return join(home(env), ".local", "state", "jadwigo", "drafts");
  if (set === "~") return home(env);
  return set.startsWith("~/") ? join(home(env), set.slice(2)) : set;
}

/** The session `make builder` minted. Claude Code does not tell an MCP server its own session id. */
export function builderSession(env: Env = process.env): string {
  return (env["JADWIGO_BUILDER_SESSION"] ?? "").trim();
}

/** The `claude` the launcher starts; a test or a by-hand check of the refusal names another. */
export function claudeBin(env: Env = process.env): string {
  return (env["JADWIGO_CLAUDE_BIN"] ?? "").trim() || "claude";
}

/** Where Claude Code keeps its transcripts: CLAUDE_CONFIG_DIR, else ~/.claude. */
export function claudeConfigDir(env: Env = process.env): string {
  return (env["CLAUDE_CONFIG_DIR"] ?? "").trim() || join(homedir(), ".claude");
}
