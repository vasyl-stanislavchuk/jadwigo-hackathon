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
