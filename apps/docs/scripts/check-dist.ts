// Run before every publish: the built docs carry their pages, the generated tables, the files
// agents read, and no link into the repo, or nothing is synced to the bucket. CI's docs-site job
// runs it on every code change, so it also holds the Monorepo diagram to the workspace's
// package.json files, which `turbo --affected` would not rerun the docs test for.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { checkDist } from "../src/lib/check-dist.ts";
import { checkWorkspaceDiagram } from "../src/lib/workspace.ts";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const monorepo = readFileSync(
  new URL("../src/content/docs/architecture/monorepo.md", import.meta.url),
  "utf8",
);
const problems = [...checkDist(dist), ...checkWorkspaceDiagram(monorepo)];
for (const problem of problems) console.error(problem);
if (problems.length > 0) process.exit(1);
console.warn("dist/ carries every check");
