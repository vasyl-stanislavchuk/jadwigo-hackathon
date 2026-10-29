// Run before every publish: the built docs carry their pages, the generated tables, the files
// agents read, and no link into the repo, or nothing is synced to the bucket.
import { fileURLToPath } from "node:url";
import { checkDist } from "../src/lib/check-dist.ts";

const dist = fileURLToPath(new URL("../dist/", import.meta.url));
const problems = checkDist(dist);
for (const problem of problems) console.error(problem);
if (problems.length > 0) process.exit(1);
console.warn("dist/ carries every check");
