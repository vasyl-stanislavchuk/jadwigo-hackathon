import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkWorkflows } from "./check-workflows.ts";

function repo(name: string, meta: string, links: string[]) {
  const root = mkdtempSync(join(tmpdir(), "workflows-"));
  mkdirSync(join(root, "workflows", name), { recursive: true });
  writeFileSync(join(root, "workflows", name, "SKILL.md"), `---\n${meta}\n---\n\n# x\n`);
  for (const dir of [".claude/skills", ".agents/skills"]) {
    mkdirSync(join(root, dir), { recursive: true });
    if (links.includes(dir)) symlinkSync(`../../workflows/${name}`, join(root, dir, name));
  }
  return root;
}

const both = [".claude/skills", ".agents/skills"];

describe("checkWorkflows", () => {
  it("passes a named workflow with both links", () => {
    const root = repo("jadwigo-pr", 'name: jadwigo-pr\ndescription: "Use when…"', both);
    expect(checkWorkflows(root)).toEqual([]);
  });

  it("fails a missing link", () => {
    const root = repo("jadwigo-pr", "name: jadwigo-pr\ndescription: x", [".claude/skills"]);
    expect(checkWorkflows(root)).toEqual([
      ".agents/skills/jadwigo-pr: not a link to ../../workflows/jadwigo-pr; run make skills",
    ]);
  });

  it("fails a wrong name, a missing description, an unprefixed folder and a stray link", () => {
    const root = repo("pr", "name: other", both);
    symlinkSync("../../workflows/gone", join(root, ".claude/skills/gone"));
    expect(checkWorkflows(root)).toEqual([
      "workflows/pr: names start with jadwigo-",
      "workflows/pr: frontmatter name is not pr",
      "workflows/pr: frontmatter has no description",
      ".claude/skills/gone: no workflow by that name; remove the link",
    ]);
  });
});
