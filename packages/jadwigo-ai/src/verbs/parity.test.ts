import { readFileSync } from "node:fs";
import { VerbName } from "@jadwigo/contracts/run";
import { describe, expect, it } from "vitest";
import { ENGINE_ONLY, TOOLS } from "./index.ts";

/**
 * `jw mcp serve` and the hosted engine expose one tool set (Lead decision 11): every verb the
 * engine has is a tool in `apps/cli/mcp-tools.json`, with the same name, the same inputs and the
 * same required ones. The learner verbs (`ENGINE_ONLY`, dl-z5ja.25) are the one exception, named
 * here: they read a learner of the run's pod, which jw holds none of.
 */
interface McpTool {
  name: string;
  inputSchema: { properties: Record<string, unknown>; required?: string[] };
}

const mcp = JSON.parse(
  readFileSync(new URL("../../../../apps/cli/mcp-tools.json", import.meta.url), "utf8"),
) as { tools: McpTool[] };

describe("the verbs match jw's MCP tools", () => {
  const shared = VerbName.options.filter(
    (name) => !(ENGINE_ONLY as readonly string[]).includes(name),
  );

  it.each(shared)("%s has jw's name, inputs and required inputs", (name) => {
    const theirs = mcp.tools.find((t) => t.name === name);
    expect(theirs, `${name} in apps/cli/mcp-tools.json`).toBeDefined();
    const ours = TOOLS[name];
    expect(ours.name).toBe(name);
    const parameters = ours.parameters as {
      properties: Record<string, unknown>;
      required: string[];
    };
    expect(Object.keys(parameters.properties).sort()).toEqual(
      Object.keys(theirs?.inputSchema.properties ?? {}).sort(),
    );
    expect([...parameters.required].sort()).toEqual(
      [...(theirs?.inputSchema.required ?? [])].sort(),
    );
  });

  it.each(ENGINE_ONLY)("%s is the engine's only, and jw has no tool of that name", (name) => {
    expect(TOOLS[name].name).toBe(name);
    expect(mcp.tools.find((t) => t.name === name)).toBeUndefined();
  });
});
