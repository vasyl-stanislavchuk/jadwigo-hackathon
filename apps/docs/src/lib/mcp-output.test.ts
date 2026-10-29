import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { mcpTools } from "./mcp.ts";
import { MCP_OUTPUT } from "./mcp-output.ts";

/** The server's tool list, read from the snapshot the CLI keeps (apps/cli/mcp-tools.json). */
const tools = mcpTools(
  JSON.parse(readFileSync(new URL("../../../cli/mcp-tools.json", import.meta.url), "utf8")),
);

describe("MCP_OUTPUT", () => {
  it("documents the output of every tool in mcp-tools.json, and of no other", () => {
    expect(Object.keys(MCP_OUTPUT).sort()).toEqual(tools.map((tool) => tool.name).sort());
  });

  it("turns every schema it names into JSON Schema", () => {
    for (const output of Object.values(MCP_OUTPUT)) {
      if (output.schema) expect(output.schema.schema.toJSONSchema()).toBeTypeOf("object");
    }
  });
});
