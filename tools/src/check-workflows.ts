// AI workflows in workflows/<name>/SKILL.md (dl-5ssh.34.8): each is reachable from Claude Code
// (.claude/skills/<name>) and from other agents (.agents/skills/<name>) through a committed
// relative link, and its frontmatter names it as its folder does. `make skills` makes the links.
// Run: bun tools/src/check-workflows.ts [repo]
import { existsSync, lstatSync, readdirSync, readFileSync, readlinkSync, statSync } from "node:fs";
import { join } from "node:path";

const LINK_DIRS = [".claude/skills", ".agents/skills"];

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

export function checkWorkflows(repo: string): string[] {
  const dir = join(repo, "workflows");
  if (!existsSync(dir)) return [];
  const problems: string[] = [];
  const names = readdirSync(dir).filter((e) => statSync(join(dir, e)).isDirectory());
  for (const name of names) {
    const skill = join(dir, name, "SKILL.md");
    if (!existsSync(skill)) {
      problems.push(`workflows/${name}: holds no SKILL.md`);
      continue;
    }
    const meta = frontmatter(readFileSync(skill, "utf8"));
    if (!name.startsWith("jadwigo-")) problems.push(`workflows/${name}: names start with jadwigo-`);
    if (meta["name"] !== name) problems.push(`workflows/${name}: frontmatter name is not ${name}`);
    if (!meta["description"]) problems.push(`workflows/${name}: frontmatter has no description`);
    for (const links of LINK_DIRS) {
      const link = join(repo, links, name);
      const want = `../../workflows/${name}`;
      let target: string | undefined;
      try {
        target = lstatSync(link).isSymbolicLink() ? readlinkSync(link) : undefined;
      } catch {
        target = undefined;
      }
      if (target !== want)
        problems.push(`${links}/${name}: not a link to ${want}; run make skills`);
    }
  }
  for (const links of LINK_DIRS) {
    if (!existsSync(join(repo, links))) continue;
    for (const entry of readdirSync(join(repo, links))) {
      if (!names.includes(entry))
        problems.push(`${links}/${entry}: no workflow by that name; remove the link`);
    }
  }
  return problems;
}

if (import.meta.main) {
  const problems = checkWorkflows(process.argv[2] ?? ".");
  for (const p of problems) console.error(`workflows: ${p}`);
  if (problems.length > 0) process.exit(1);
}
