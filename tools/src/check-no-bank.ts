// No question bank in git, ever (david-learns/decisions/2026-10-24-the-question-bank-is-never-
// committed-to-the-jadwigo-repo). Fails on a question page, a Khan item, a SQLite file, bank media,
// or any file over the size cap. Run: bun tools/src/check-no-bank.ts [--root dir] (files from git).
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";

export const SIZE_CAP_BYTES = 1_000_000;

const RULES: ReadonlyArray<{ readonly pattern: RegExp; readonly why: string }> = [
  { pattern: /\.(sqlite3?|db)$/i, why: "a SQLite file (the bank's index lives outside the repo)" },
  { pattern: /(^|\/)questions?\/.+\.(json|ya?ml|md)$/i, why: "a question page" },
  { pattern: /(^|\/)khan[^/]*\/|khan[-_]?item/i, why: "a Khan item" },
  { pattern: /(^|\/)bank\/(media|img|images|audio)\//i, why: "bank media" },
];

export interface Finding {
  readonly path: string;
  readonly why: string;
}

/** Judge repo-relative paths. `sizeOf` returns bytes, or undefined for a file that is gone. */
export function findBank(
  paths: readonly string[],
  sizeOf: (path: string) => number | undefined,
): Finding[] {
  const findings: Finding[] = [];
  for (const path of paths) {
    if (path.startsWith("tools/src/") && path.endsWith(".test.ts")) continue;
    const rule = RULES.find((r) => r.pattern.test(path));
    if (rule) {
      findings.push({ path, why: rule.why });
      continue;
    }
    const size = sizeOf(path);
    if (size !== undefined && size > SIZE_CAP_BYTES) {
      findings.push({ path, why: `${size} bytes, over the ${SIZE_CAP_BYTES}-byte cap` });
    }
  }
  return findings;
}

function trackedFiles(root: string): string[] {
  const out = spawnSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8",
  });
  if (out.status !== 0) throw new Error(`git ls-files failed: ${out.stderr}`);
  return out.stdout.split("\0").filter(Boolean);
}

if (import.meta.main) {
  const rootFlag = process.argv.indexOf("--root");
  const root = rootFlag > 0 ? (process.argv[rootFlag + 1] ?? ".") : ".";
  const findings = findBank(trackedFiles(root), (path) => {
    try {
      return statSync(join(root, path)).size;
    } catch {
      return undefined;
    }
  });
  for (const f of findings) console.error(`no-bank: ${f.path}: ${f.why}`);
  if (findings.length > 0) {
    console.error(
      "no-bank: the question bank never goes in git. Keep it under the bank's own storage.",
    );
    process.exit(1);
  }
}
