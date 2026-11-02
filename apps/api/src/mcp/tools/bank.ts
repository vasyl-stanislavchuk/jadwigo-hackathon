import type { ToolDeps } from "../tool.ts";

/**
 * The headers a bank handler checks, carrying the server's own read token: the tools run after the
 * member check, and the token stays in this process, never in a tool's reply.
 */
export async function bankHeaders(deps: ToolDeps): Promise<Headers> {
  const token = await deps.bank?.readToken().catch(() => undefined);
  return new Headers(token ? { authorization: `Bearer ${token.trim()}` } : {});
}
