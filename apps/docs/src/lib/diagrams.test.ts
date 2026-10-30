// @vitest-environment happy-dom
// Mermaid draws in the reader's browser, so a diagram that does not parse would only show as an
// error box on the live page. Parsing each one here fails the docs test instead.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import mermaid from "mermaid";
import { describe, expect, it } from "vitest";

const PAGES = join(import.meta.dirname, "../content/docs");

const diagrams = readdirSync(PAGES, { recursive: true, encoding: "utf8" })
  .filter((path) => /\.mdx?$/.test(path))
  .flatMap((path) =>
    [...readFileSync(join(PAGES, path), "utf8").matchAll(/```mermaid\n([\s\S]*?)```/g)].map(
      (m, i): [string, string] => [`${path} #${i + 1}`, m[1] ?? ""],
    ),
  );

describe("the docs' mermaid diagrams", () => {
  it("are on the architecture pages", () => {
    expect(diagrams.length).toBeGreaterThanOrEqual(5);
  });

  it.each(diagrams)("%s parses", async (_, source) => {
    await expect(mermaid.parse(source)).resolves.toBeTruthy();
  });
});
