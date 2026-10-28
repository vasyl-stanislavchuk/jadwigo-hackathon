// Two kinds of agent instructions, kept apart (dl-5ssh.34.45):
// - product AI workflows, workflows/<name>/SKILL.md, named jadwigo-<record>-<verb>, linked into
//   .claude/skills and .agents/skills;
// - dev commands, .agents/skills/dev-<verb>/SKILL.md (the cross-agent home is their source),
//   linked into .claude/skills;
// - marketing commands, .agents/skills/mk-<noun>/SKILL.md (dl-w0b4.56), linked the same way.
// Every link is committed and relative, and each frontmatter names its folder. `make skills`
// makes the links. Folders starting with _ under workflows/ and .agents/skills/ are shared
// parts, not commands, and one under .agents/skills/ that holds a SKILL.md fails.
// Run: bun tools/src/check-workflows.ts [repo]
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync } from "node:fs";
import { join } from "node:path";

const PRODUCT = /^jadwigo-[a-z0-9]+-[a-z0-9-]+$/;
const DEV = /^dev-[a-z0-9-]+$/;
const MARKETING = /^mk-[a-z0-9-]+$/;

function frontmatter(text: string): Record<string, string> {
  const block = /^---\n([\s\S]*?)\n---/.exec(text)?.[1] ?? "";
  return Object.fromEntries(
    block
      .split("\n")
      .map((line) => /^([a-z_-]+):\s*(.*)$/.exec(line))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) => [m[1] ?? "", (m[2] ?? "").replace(/^"|"$/g, "")]),
  );
}

function linkTarget(path: string): string | undefined {
  try {
    return lstatSync(path).isSymbolicLink() ? readlinkSync(path) : undefined;
  } catch {
    return undefined;
  }
}

function entries(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir) : [];
}

function checkSkill(dir: string, shown: string, name: string, problems: string[]): void {
  const skill = join(dir, "SKILL.md");
  if (!existsSync(skill)) {
    problems.push(`${shown}: holds no SKILL.md`);
    return;
  }
  const meta = frontmatter(readFileSync(skill, "utf8"));
  if (meta["name"] !== name) problems.push(`${shown}: frontmatter name is not ${name}`);
  if (!meta["description"]) problems.push(`${shown}: frontmatter has no description`);
}

export function checkWorkflows(repo: string): string[] {
  const problems: string[] = [];
  const expected = new Map<string, string>(); // link path -> wanted target

  for (const name of entries(join(repo, "workflows"))) {
    const dir = join(repo, "workflows", name);
    if (name.startsWith("_") || !lstatSync(dir).isDirectory()) continue;
    const shown = `workflows/${name}`;
    if (DEV.test(name) || MARKETING.test(name)) {
      problems.push(
        `${shown}: dev and marketing commands live in .agents/skills/, not with the product workflows`,
      );
      continue;
    }
    if (!PRODUCT.test(name))
      problems.push(`${shown}: product workflows are jadwigo-<record>-<verb>`);
    checkSkill(dir, shown, name, problems);
    expected.set(`.claude/skills/${name}`, `../../workflows/${name}`);
    expected.set(`.agents/skills/${name}`, `../../workflows/${name}`);
  }

  for (const name of entries(join(repo, ".agents/skills"))) {
    const path = join(repo, ".agents/skills", name);
    if (!lstatSync(path).isDirectory()) continue; // a product workflow's link (checked below) or a README
    const shown = `.agents/skills/${name}`;
    if (name.startsWith("_")) {
      // shared parts, such as _shared/jadwigo-rules.md; a SKILL.md here would still be found as a command
      if (existsSync(join(path, "SKILL.md")))
        problems.push(`${shown}: a _ folder holds shared parts, not a command; move its SKILL.md`);
      continue;
    }
    if (!DEV.test(name) && !MARKETING.test(name)) {
      problems.push(
        name.startsWith("jadwigo-")
          ? `${shown}: product workflows live in workflows/, linked here`
          : `${shown}: dev commands are dev-<verb>, marketing commands mk-<noun>`,
      );
      continue;
    }
    checkSkill(path, shown, name, problems);
    expected.set(`.claude/skills/${name}`, `../../.agents/skills/${name}`);
  }

  for (const [link, want] of expected) {
    if (linkTarget(join(repo, link)) !== want)
      problems.push(`${link}: not a link to ${want}; run make skills`);
  }
  for (const dir of [".claude/skills", ".agents/skills"]) {
    for (const name of entries(join(repo, dir))) {
      const link = `${dir}/${name}`;
      if (linkTarget(join(repo, link)) !== undefined && !expected.has(link))
        problems.push(`${link}: links to nothing this repo defines; remove it`);
      else if (dir === ".claude/skills" && !expected.has(link))
        problems.push(`${link}: write it in workflows/ or .agents/skills/, and link it here`);
    }
  }
  return problems;
}

if (import.meta.main) {
  const problems = checkWorkflows(process.argv[2] ?? ".");
  for (const p of problems) console.error(`workflows: ${p}`);
  if (problems.length > 0) process.exit(1);
}
