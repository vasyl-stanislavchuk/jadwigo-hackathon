import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// A broken internal link fails the build only while astro.config.mjs keeps starlight-links-validator
// in Starlight's plugins with errorOnLocalLinks on (dl-5ssh.90.19). The build proves it once; this
// keeps it from being dropped quietly.
const config = readFileSync(new URL("../astro.config.mjs", import.meta.url), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  scripts: Record<string, string>;
};

/** The text of the first call `name(...)`, its parentheses balanced, or undefined. */
function callOf(source: string, name: string): string | undefined {
  const start = source.indexOf(`${name}(`);
  if (start < 0) return undefined;
  let depth = 0;
  for (let i = start + name.length; i < source.length; i++) {
    if (source[i] === "(") depth++;
    if (source[i] === ")" && --depth === 0) return source.slice(start, i + 1);
  }
  return undefined;
}

describe("astro.config.mjs", () => {
  it("imports starlight-links-validator", () => {
    expect(config).toMatch(/import starlightLinksValidator from "starlight-links-validator";/);
  });

  it("calls it inside Starlight's plugins, with errorOnLocalLinks on", () => {
    const starlight = callOf(config, "starlight");
    expect(starlight).toMatch(/plugins:\s*\[/);
    const validator = callOf(starlight ?? "", "starlightLinksValidator");
    expect(validator).toMatch(/errorOnLocalLinks:\s*true/);
  });

  it("is what the build script runs", () => {
    expect(pkg.scripts["build"]).toMatch(/astro build$/);
  });
});
