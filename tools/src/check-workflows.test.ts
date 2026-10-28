import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkWorkflows } from "./check-workflows.ts";

function repo() {
  const root = mkdtempSync(join(tmpdir(), "workflows-"));
  for (const dir of ["workflows", ".claude/skills", ".agents/skills"])
    mkdirSync(join(root, dir), { recursive: true });
  return root;
}

function skill(root: string, dir: string, name: string, meta = `name: ${name}\ndescription: x`) {
  mkdirSync(join(root, dir, name), { recursive: true });
  writeFileSync(join(root, dir, name, "SKILL.md"), `---\n${meta}\n---\n\n# x\n`);
}

const link = (root: string, at: string, to: string) => symlinkSync(to, join(root, at));

function good() {
  const root = repo();
  skill(root, "workflows", "jadwigo-lesson-compose");
  mkdirSync(join(root, "workflows/_shared"));
  link(root, ".claude/skills/jadwigo-lesson-compose", "../../workflows/jadwigo-lesson-compose");
  link(root, ".agents/skills/jadwigo-lesson-compose", "../../workflows/jadwigo-lesson-compose");
  skill(root, ".agents/skills", "dev-pr");
  link(root, ".claude/skills/dev-pr", "../../.agents/skills/dev-pr");
  skill(root, ".agents/skills", "mk-brief");
  link(root, ".claude/skills/mk-brief", "../../.agents/skills/mk-brief");
  mkdirSync(join(root, ".agents/skills/_shared"));
  writeFileSync(join(root, ".agents/skills/_shared/jadwigo-rules.md"), "# rules\n");
  return root;
}

describe("checkWorkflows", () => {
  it("passes a product workflow, a dev command and a marketing command, each in its home with its links, and a _shared folder", () => {
    expect(checkWorkflows(good())).toEqual([]);
  });

  it("fails a dev or marketing command among the product workflows, and a product one or a bare name in .agents", () => {
    const root = good();
    skill(root, "workflows", "dev-drop");
    skill(root, "workflows", "mk-listen");
    skill(root, ".agents/skills", "jadwigo-drop-publish");
    skill(root, ".agents/skills", "marketing-brief");
    expect(checkWorkflows(root)).toEqual([
      "workflows/dev-drop: dev and marketing commands live in .agents/skills/, not with the product workflows",
      "workflows/mk-listen: dev and marketing commands live in .agents/skills/, not with the product workflows",
      ".agents/skills/jadwigo-drop-publish: product workflows live in workflows/, linked here",
      ".agents/skills/marketing-brief: dev commands are dev-<verb>, marketing commands mk-<noun>",
    ]);
  });

  it("fails a missing link, a stray link, a bad name and a wrong frontmatter name", () => {
    const root = repo();
    skill(root, "workflows", "jadwigo-lesson", "name: other\ndescription: x");
    skill(root, ".agents/skills", "dev-pr");
    link(root, ".claude/skills/gone", "../../workflows/gone");
    expect(checkWorkflows(root)).toEqual([
      "workflows/jadwigo-lesson: product workflows are jadwigo-<record>-<verb>",
      "workflows/jadwigo-lesson: frontmatter name is not jadwigo-lesson",
      ".claude/skills/jadwigo-lesson: not a link to ../../workflows/jadwigo-lesson; run make skills",
      ".agents/skills/jadwigo-lesson: not a link to ../../workflows/jadwigo-lesson; run make skills",
      ".claude/skills/dev-pr: not a link to ../../.agents/skills/dev-pr; run make skills",
      ".claude/skills/gone: links to nothing this repo defines; remove it",
    ]);
  });
});
