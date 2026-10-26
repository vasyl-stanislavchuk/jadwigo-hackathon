import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkDrops } from "./check-drops.ts";

function repo(site: object, files: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), "drops-"));
  const drop = join(root, "docs/drops/demo");
  mkdirSync(join(drop, "img"), { recursive: true });
  writeFileSync(join(root, "AGENTS.md"), "x\n");
  writeFileSync(join(drop, "site.json"), JSON.stringify(site));
  for (const [path, body] of Object.entries(files)) writeFileSync(join(drop, path), body);
  return { root, dir: join(root, "docs/drops") };
}

const good = {
  version: 1,
  pages: { "index.html": "index.md" },
  nav: [{ page: "index.html", label: "Overview" }],
  copy: ["img"],
  evidence: ["../../../AGENTS.md"],
};

describe("checkDrops", () => {
  it("passes a complete drop", () => {
    const { root, dir } = repo(good, { "index.md": "# Hi\n" });
    expect(checkDrops(dir, root)).toEqual([]);
  });

  it("names a missing source, a stray nav page, missing evidence and a password", () => {
    const site = {
      ...good,
      nav: [...good.nav, { page: "gone.html" }],
      evidence: ["../../../nope.md", "../../../../outside.md"],
    };
    const { root, dir } = repo(site, { "notes.md": "see https://x/?password=abc\n" });
    const problems = checkDrops(dir, root).join("\n");
    expect(problems).toContain("index.md, is missing");
    expect(problems).toContain("nav names gone.html");
    expect(problems).toContain("evidence ../../../nope.md is missing");
    expect(problems).toContain("is outside the repo");
    expect(problems).toContain("holds a password");
  });

  it("passes a one-page drop that is a spec.json alone, and still finds a password in it", () => {
    const { root, dir } = repo(good, { "index.md": "x" });
    mkdirSync(join(dir, "one"));
    writeFileSync(join(dir, "one/spec.json"), JSON.stringify({ title: "One page" }));
    expect(checkDrops(dir, root)).toEqual([]);
    writeFileSync(join(dir, "one/build.ts"), "// ?password=abc\n");
    expect(checkDrops(dir, root)).toEqual([
      `${join(dir, "one/build.ts")}: holds a password; point to md drops history instead`,
    ]);
  });

  it("fails a folder with no site.json or broken JSON", () => {
    const { root, dir } = repo(good, { "index.md": "x" });
    mkdirSync(join(dir, "empty"));
    mkdirSync(join(dir, "broken"));
    writeFileSync(join(dir, "broken/site.json"), "{");
    expect(checkDrops(dir, root)).toHaveLength(2);
  });
});
