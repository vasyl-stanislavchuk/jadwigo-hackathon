import { describe, expect, it } from "vitest";
import {
  cleandoc,
  inputRows,
  type McpTool,
  mcpTools,
  splitDoc,
  toolPage,
  typeName,
} from "./mcp.ts";

const tool: McpTool = {
  name: "question_item",
  description:
    "One item by its id.\n\n        Returns `khan:<id>` and the key.\n          Indented more.\n        ",
  inputSchema: {
    properties: {
      language: { default: "pl", title: "Language", type: "string" },
      item_id: { title: "Item Id", type: "string" },
      skills: {
        anyOf: [{ items: { type: "string" }, type: "array" }, { type: "null" }],
        default: null,
      },
    },
    required: ["item_id"],
  },
};

describe("mcpTools", () => {
  it("reads the tools in the file's order", () => {
    const file = { tools: [tool, { ...tool, name: "a_tool" }] };
    expect(mcpTools(file).map((t) => t.name)).toEqual(["question_item", "a_tool"]);
  });

  it("refuses a file of another shape", () => {
    expect(() => mcpTools({ items: [] })).toThrow(/no tools list/);
    expect(() => mcpTools({ tools: [{ name: "x" }] })).toThrow(/tool 0/);
  });
});

describe("cleandoc", () => {
  it("dedents a docstring the way Python's inspect.cleandoc does", () => {
    expect(cleandoc(tool.description)).toBe(
      "One item by its id.\n\nReturns `khan:<id>` and the key.\n  Indented more.",
    );
  });

  it("keeps a one-line docstring as it is", () => {
    expect(cleandoc("Search each need once.")).toBe("Search each need once.");
  });
});

describe("splitDoc", () => {
  it("takes the first line as the summary and the rest as the body", () => {
    expect(splitDoc(tool.description)).toEqual({
      summary: "One item by its id.",
      body: "Returns `khan:<id>` and the key.\n  Indented more.",
    });
    expect(splitDoc("Only a summary.")).toEqual({ summary: "Only a summary.", body: "" });
  });
});

describe("typeName", () => {
  it("names arrays by their items and drops an optional's null", () => {
    expect(typeName({ type: "string" })).toBe("string");
    expect(typeName({ type: "array", items: { type: "string" } })).toBe("string[]");
    expect(typeName({ anyOf: [{ type: "integer" }, { type: "null" }] })).toBe("integer");
    expect(typeName({})).toBe("any");
  });
});

describe("inputRows", () => {
  it("lists the required inputs first, then the rest by name, with their defaults", () => {
    expect(inputRows(tool)).toEqual([
      {
        name: "item_id",
        type: "string",
        required: true,
        default: undefined,
        description: undefined,
      },
      {
        name: "language",
        type: "string",
        required: false,
        default: '"pl"',
        description: undefined,
      },
      {
        name: "skills",
        type: "string[]",
        required: false,
        default: "null",
        description: undefined,
      },
    ]);
  });
});

describe("toolPage", () => {
  it("is the tool's page at mcp/<name>, its summary the description", () => {
    const page = toolPage(tool, undefined);
    expect(page).toMatchObject({
      id: "mcp/question_item",
      title: "question_item",
      description: "One item by its id.",
    });
  });

  it("carries the body, the inputs table and the output", () => {
    const schema = { toJSONSchema: () => ({ type: "object", title: "Shape" }) };
    const page = toolPage(tool, {
      says: "One <item>, `as <is>`.",
      schema: { name: "Shape", covers: "the whole `<result>`", schema },
    });
    expect(page.body).toContain("Returns `khan:<id>` and the key.");
    expect(page.body).toContain("| `item_id` | `string` | yes |  |  |");
    expect(page.body).toContain('| `language` | `string` | no | `"pl"` |  |');
    expect(page.body).toContain("One &lt;item&gt;, `as <is>`.");
    expect(page.body).toContain("<code>Shape</code>, the whole <code>&lt;result&gt;</code>");
    expect(page.body).toContain('"title": "Shape"');
  });

  it("says when a tool's output is not documented yet", () => {
    expect(toolPage(tool, undefined).body).toContain("not documented here yet");
  });

  it("says when a tool takes no inputs", () => {
    expect(toolPage({ ...tool, inputSchema: {} }, undefined).body).toContain("no inputs");
  });
});
