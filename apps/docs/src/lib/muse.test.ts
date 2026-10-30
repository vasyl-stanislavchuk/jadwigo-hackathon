import { describe, expect, it } from "vitest";
import { musePrompt, OPENAPI_URL } from "./muse.ts";

describe("musePrompt", () => {
  it("names the page's Markdown on docs.jadwigo.pl and the MCP server", () => {
    const prompt = musePrompt("/guides/first-call.md");
    expect(prompt).toContain("Read https://docs.jadwigo.pl/guides/first-call.md,");
    expect(prompt).toContain("`jw mcp serve`");
    expect(prompt).toContain("https://docs.jadwigo.pl/mcp.md");
  });

  it("names /openapi.json on a page with no Markdown", () => {
    expect(musePrompt("")).toContain(`Read ${OPENAPI_URL},`);
  });
});
