import { servedHost } from "../index.ts";

/** Where an agent reads a page with no Markdown of its own: the API reference's pages. */
export const OPENAPI_URL = `https://${servedHost}/openapi.json`;

/**
 * What Copy for Muse puts on the clipboard: a prompt to paste into Muse Code, a terminal agent
 * with no URL to open, naming the page's Markdown on docs.jadwigo.pl and the MCP server
 * (dl-5ssh.90.32). `markdownPath` is the page's root-relative `.md` path, empty for a page
 * without one.
 */
export function musePrompt(markdownPath: string): string {
  const page = markdownPath === "" ? OPENAPI_URL : `https://${servedHost}${markdownPath}`;
  return [
    `Read ${page}, a page of Jadwigo's docs, and help me with what it covers.`,
    `Jadwigo's MCP server is \`jw mcp serve\`; if the jadwigo server isn't registered yet, https://${servedHost}/mcp.md says how.`,
  ].join("\n");
}
