// Drop sources under docs/drops/<folder>/ (dl-5ssh.34.8): the structure CI can check without md.
// Every site.json parses; its pages' sources, nav pages, copy folders and evidence files exist;
// and no file holds a password. `make drops` runs md's own check (links, numbers, secrets) locally.
// Run: bun tools/src/check-drops.ts [dir]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

interface Site {
  pages?: Record<string, string>;
  nav?: Array<{ page?: string }>;
  copy?: string[];
  evidence?: string[];
}

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

function passwords(drop: string): string[] {
  return files(drop)
    .filter((file) => /password=/i.test(readFileSync(file, "utf8")))
    .map((file) => `${file}: holds a password; point to md drops history instead`);
}

export function checkDrops(dir: string, repo = "."): string[] {
  if (!existsSync(dir)) return [];
  const problems: string[] = [];
  for (const entry of readdirSync(dir)) {
    const drop = join(dir, entry);
    if (!statSync(drop).isDirectory()) continue;
    const sitePath = join(drop, "site.json");
    const specPath = join(drop, "spec.json");
    if (!existsSync(sitePath)) {
      // A one-page drop is a spec.json alone.
      if (!existsSync(specPath))
        problems.push(`${drop}: a drop folder holds a site.json or a spec.json`);
      else {
        try {
          JSON.parse(readFileSync(specPath, "utf8"));
        } catch (e) {
          problems.push(`${specPath}: not valid JSON (${(e as Error).message})`);
        }
        problems.push(...passwords(drop));
      }
      continue;
    }
    let site: Site;
    try {
      site = JSON.parse(readFileSync(sitePath, "utf8")) as Site;
    } catch (e) {
      problems.push(`${sitePath}: not valid JSON (${(e as Error).message})`);
      continue;
    }
    const pages = site.pages ?? {};
    if (Object.keys(pages).length === 0) problems.push(`${sitePath}: pages is empty`);
    for (const [page, source] of Object.entries(pages)) {
      if (!existsSync(join(drop, source)))
        problems.push(`${sitePath}: the source of ${page}, ${source}, is missing`);
    }
    for (const { page } of site.nav ?? []) {
      if (page && !(page in pages))
        problems.push(`${sitePath}: nav names ${page}, which pages does not`);
    }
    for (const folder of site.copy ?? []) {
      if (!existsSync(join(drop, folder)))
        problems.push(`${sitePath}: copy names ${folder}, which is missing`);
    }
    for (const evidence of site.evidence ?? []) {
      const path = resolve(drop, evidence);
      if (relative(resolve(repo), path).startsWith(".."))
        problems.push(`${sitePath}: evidence ${evidence} is outside the repo`);
      else if (!existsSync(path)) problems.push(`${sitePath}: evidence ${evidence} is missing`);
    }
    problems.push(...passwords(drop));
  }
  return problems;
}

if (import.meta.main) {
  const problems = checkDrops(process.argv[2] ?? "docs/drops");
  for (const p of problems) console.error(`drops: ${p}`);
  if (problems.length > 0) process.exit(1);
}
