import type { McpTool } from "../tool.ts";
import { me } from "./me.ts";

/** Every remote MCP tool. A new tool is one file beside this one and one line here. */
export const TOOLS: readonly McpTool[] = [me];
