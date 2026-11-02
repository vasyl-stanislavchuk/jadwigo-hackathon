import type { BankPort } from "@jadwigo/jadwigo-ai";
import type { MemberScope, Store } from "@jadwigo/store";
import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import type { Claims } from "../auth.ts";

/** What every tool call runs with: the caller's pod member, found by `authorizeMember`, in one unit. */
export interface ToolContext {
  readonly store: Store;
  readonly member: MemberScope;
  readonly claims: Claims;
  /** The bank the lesson verbs draw from (`mcpBank`). */
  readonly bank: BankPort;
  /** A path of the app (`/parent/lessons/<cnv_>`) as the full URL a parent's AI can link to. */
  appUrl(path: string): string;
}

/**
 * One remote MCP tool, one file under `tools/`, listed once in `tools/index.ts`. `run` gets the
 * arguments `inputSchema` validated (undefined when it has none) and returns the tool's JSON
 * result. Read only through the store's pod-scoped methods with `member.pod`, so another pod's id
 * answers as not found. An `ApiError` or `StoreError` it throws reaches the caller as its message.
 */
export interface McpTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema?: StandardSchemaWithJSON;
  run(input: unknown, context: ToolContext): Promise<unknown>;
}
