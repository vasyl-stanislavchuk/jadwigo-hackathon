// The worklog layout, md's convention: docs/worklog/<epic>/<YYYY-MM-DD>-<slug>.md, and each note's
// first line names its epic. The note is deleted when the epic closes.
// Run: bun tools/src/check-worklog.ts [dir]
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const EPIC = /^[a-z]+-[a-z0-9]+(\.[0-9]+)*$/;
const NOTE = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/;

export function checkWorklog(dir: string): string[] {
  const problems: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === ".gitkeep" || entry === "README.md") continue;
    const epicDir = join(dir, entry);
    if (!statSync(epicDir).isDirectory() || !EPIC.test(entry)) {
      problems.push(`${epicDir}: worklog entries are folders named by epic id (dl-5ssh.34)`);
      continue;
    }
    for (const note of readdirSync(epicDir)) {
      const path = join(epicDir, note);
      if (!NOTE.test(note)) {
        problems.push(`${path}: notes are named <YYYY-MM-DD>-<slug>.md`);
        continue;
      }
      const first = readFileSync(path, "utf8").split("\n", 1)[0] ?? "";
      if (!first.includes(entry))
        problems.push(`${path}: the first line must name the epic ${entry}`);
    }
  }
  return problems;
}

if (import.meta.main) {
  const problems = checkWorklog(process.argv[2] ?? "docs/worklog");
  for (const p of problems) console.error(`worklog: ${p}`);
  if (problems.length > 0) process.exit(1);
}
