/**
 * The MCP pages, made from `mcp-tools.json`, the tool list `jw mcp serve` gives a client
 * (`dl-5ssh.90.8`). Each tool becomes one page: how it is called, its description, its inputs, its
 * output and where to go next (`dl-5ssh.90.31`).
 */

/** Where the MCP overview shows how to register the server, which every tool page links to. */
export const REGISTER_HREF = "/mcp/#register-the-server";

/** The closing section of every tool page. */
const NEXT = [
  "## Next",
  "",
  "- [Every tool](/mcp/#every-tool): the other tools the server gives an agent.",
  "- [Use with agents](/guides/agents/): what else these docs publish for an agent.",
  "",
];

/** A JSON Schema, as far as these pages read one. */
export interface JsonSchema {
  readonly type?: string;
  readonly items?: JsonSchema;
  readonly anyOf?: readonly JsonSchema[];
  readonly properties?: Readonly<Record<string, JsonSchema>>;
  readonly required?: readonly string[];
  readonly default?: unknown;
  readonly title?: string;
  readonly description?: string;
}

/** One tool as the server lists it. `description` is the raw Python docstring. */
export interface McpTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: JsonSchema;
}

/** What a tool returns: a few words on its shape, and the contracts schema it follows, if any. */
export interface McpOutput {
  readonly says: string;
  readonly schema?: {
    readonly name: string;
    /** What the schema covers: the whole result, or a part of it. */
    readonly covers: string;
    readonly schema: { toJSONSchema(): unknown };
  };
}

/** The tools in `mcp-tools.json`, in its order. A file of another shape throws. */
export function mcpTools(file: unknown): McpTool[] {
  const tools = (file as { tools?: unknown } | null)?.tools;
  if (!Array.isArray(tools)) throw new Error("mcp-tools.json has no tools list");
  return tools.map((tool: Partial<McpTool>, i) => {
    if (typeof tool.name !== "string" || typeof tool.description !== "string")
      throw new Error(`mcp-tools.json tool ${i} has no name or description`);
    return { name: tool.name, description: tool.description, inputSchema: tool.inputSchema ?? {} };
  });
}

/** Python's inspect.cleandoc: the first line stripped, the common indent of the rest removed. */
export function cleandoc(doc: string): string {
  const lines = doc.replaceAll("\t", "        ").split("\n");
  const indents = lines
    .slice(1)
    .filter((line) => line.trim() !== "")
    .map((line) => line.length - line.trimStart().length);
  const margin = indents.length > 0 ? Math.min(...indents) : 0;
  const out = [
    (lines[0] ?? "").trim(),
    ...lines.slice(1).map((line) => line.slice(margin).trimEnd()),
  ];
  while (out.length > 0 && out[0] === "") out.shift();
  while (out.length > 0 && out.at(-1) === "") out.pop();
  return out.join("\n");
}

/** A docstring's first line, the summary, and the rest, the body. */
export function splitDoc(doc: string): { summary: string; body: string } {
  const [summary = "", ...rest] = cleandoc(doc).split("\n");
  return { summary, body: rest.join("\n").trim() };
}

/** One input's row: its name, type, whether it is required, its default and what it is. */
export interface InputRow {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  /** The default as JSON, or undefined when there is none. */
  readonly default: string | undefined;
  readonly description: string | undefined;
}

/** A schema's type in a few characters: `string`, `string[]`, `object`; an optional's null dropped. */
export function typeName(schema: JsonSchema): string {
  if (schema.anyOf !== undefined) {
    const types = schema.anyOf.filter((s) => s.type !== "null").map(typeName);
    return types.length > 0 ? types.join(" or ") : "null";
  }
  if (schema.type === "array") return `${schema.items ? typeName(schema.items) : "any"}[]`;
  return schema.type ?? "any";
}

/** A tool's inputs: the required ones in the server's order, then the rest by name. */
export function inputRows(tool: McpTool): InputRow[] {
  const properties = tool.inputSchema.properties ?? {};
  const required = tool.inputSchema.required ?? [];
  const names = [
    ...required.filter((name) => name in properties),
    ...Object.keys(properties)
      .filter((name) => !required.includes(name))
      .sort(),
  ];
  return names.map((name) => {
    const schema = properties[name] ?? {};
    return {
      name,
      type: typeName(schema),
      required: required.includes(name),
      default: "default" in schema ? JSON.stringify(schema.default) : undefined,
      description: schema.description,
    };
  });
}

/** Text outside `code` spans with `<` and `>` escaped, so a docstring never turns into HTML. */
function escapeProse(text: string): string {
  return text
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 === 1 ? part : part.replaceAll("<", "&lt;").replaceAll(">", "&gt;")))
    .join("");
}

/** Markdown's `code` spans as HTML, for text that sits inside an HTML element. */
function inlineHtml(text: string): string {
  return text
    .split(/`([^`]*)`/)
    .map((part, i) => {
      const escaped = part.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      return i % 2 === 1 ? `<code>${escaped}</code>` : escaped;
    })
    .join("");
}

function cell(text: string): string {
  return escapeProse(text).replaceAll("|", "\\|").replaceAll("\n", " ");
}

/** One tool's page: its id in the docs collection, its title and description, and its markdown. */
export interface ToolPage {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly body: string;
}

/** The page for one tool. With no output entry, the page says its output is not documented yet. */
export function toolPage(tool: McpTool, output: McpOutput | undefined): ToolPage {
  const { summary, body } = splitDoc(tool.description);
  const rows = inputRows(tool);
  const lines = [
    `\`${tool.name}\` is a tool of \`jw mcp serve\`, Jadwigo's MCP server. An agent calls it once the server is [registered](${REGISTER_HREF}).`,
    "",
    escapeProse(summary),
    "",
  ];
  if (body !== "") lines.push(escapeProse(body), "");

  lines.push("## Inputs", "");
  if (rows.length === 0) lines.push("It takes no inputs.", "");
  else {
    lines.push(
      "| Name | Type | Required | Default | Description |",
      "| --- | --- | --- | --- | --- |",
    );
    for (const row of rows) {
      const cells = [
        `\`${row.name}\``,
        `\`${row.type}\``,
        row.required ? "yes" : "no",
        row.default === undefined ? "" : `\`${row.default}\``,
        row.description === undefined ? "" : cell(row.description),
      ];
      lines.push(`| ${cells.join(" | ")} |`);
    }
    lines.push("");
  }

  lines.push("## Output", "");
  if (output === undefined) {
    lines.push("A JSON object. Its shape is not documented here yet.", "");
  } else {
    lines.push(escapeProse(output.says), "");
    if (output.schema !== undefined) {
      const json = JSON.stringify(output.schema.schema.toJSONSchema(), null, 2);
      lines.push(
        "<details>",
        `<summary>The JSON Schema of <code>${output.schema.name}</code>, ${inlineHtml(output.schema.covers)}</summary>`,
        "",
        "```json",
        json,
        "```",
        "",
        "</details>",
        "",
      );
    }
  }
  lines.push(...NEXT);
  return { id: `mcp/${tool.name}`, title: tool.name, description: summary, body: lines.join("\n") };
}
