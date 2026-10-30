// The live lesson builder's settings (dl-a38n.2), the one place tools/builder reads the environment.
// The drafts directory is jw's JADWIGO_DRAFTS_DIR with jw's default, so the channel, the launcher,
// jw mcp serve and the web dev server all read and write the same files.
import { homedir } from "node:os";
import { join } from "node:path";

type Env = Record<string, string | undefined>;

export function draftsDir(env: Env = process.env): string {
  const set = (env["JADWIGO_DRAFTS_DIR"] ?? "").trim();
  return set || join(homedir(), ".local", "state", "jadwigo", "drafts");
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

/** The Claude Code profile `claude` reads its user-scope MCP servers from, and how it was chosen. */
export function claudeProfile(env: Env = process.env): { file: string; from: string } {
  const dir = (env["CLAUDE_CONFIG_DIR"] ?? "").trim();
  return dir
    ? { file: join(dir, ".claude.json"), from: `CLAUDE_CONFIG_DIR=${dir}` }
    : { file: join(homedir(), ".claude.json"), from: "the default, as CLAUDE_CONFIG_DIR is unset" };
}

/**
 * The builder session's environment: this one, without ANTHROPIC_API_KEY (the subscription runs
 * the session; a key would bill it instead), with the session id and the drafts directory named.
 */
export function sessionEnv(
  sessionId: string,
  drafts: string,
  env: Env = process.env,
): Record<string, string | undefined> {
  const copy: Record<string, string | undefined> = { ...env };
  delete copy["ANTHROPIC_API_KEY"];
  copy["JADWIGO_BUILDER_SESSION"] = sessionId;
  copy["JADWIGO_DRAFTS_DIR"] = drafts;
  return copy;
}
