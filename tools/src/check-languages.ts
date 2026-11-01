// Every language in packages/config/src/languages.ts has the parts its status needs (dl-5ssh.34.20,
// docs/runbooks/add-a-language.md). A part is a path that must exist, or `{ pending: "<issue>" }`
// naming the issue that builds it; the issue swaps in the path, and from then on a missing file
// fails here. The list is read as text: tools imports nothing of ours.
// Run: bun tools/src/check-languages.ts
import { existsSync, readFileSync } from "node:fs";

const LIST = "packages/config/src/languages.ts";
const ISSUE = /^dl-[a-z0-9]+(\.[0-9]+)*$/;

export interface Language {
  readonly code: string;
  readonly status: string;
  /** Each part: a path, or the issue it is pending on. */
  readonly parts: ReadonlyMap<string, { path: string } | { pending: string }>;
}

/** The parts each status needs, from `NEEDED_PARTS`. */
export function neededParts(source: string): Map<string, string[]> {
  const block = /NEEDED_PARTS[^=]*=\s*\{([\s\S]*?)\n\};/.exec(source)?.[1] ?? "";
  const needed = new Map<string, string[]>();
  for (const [, status = "", list = ""] of block.matchAll(/(\w+): \[([^\]]*)\]/g)) {
    needed.set(
      status,
      [...list.matchAll(/"(\w+)"/g)].map(([, part]) => part ?? ""),
    );
  }
  return needed;
}

/** Every entry of `LANGUAGES`, with its parts. */
export function languages(source: string): Language[] {
  const list = /export const LANGUAGES = \[([\s\S]*?)\n\] as const/.exec(source)?.[1] ?? "";
  const found: Language[] = [];
  for (const [, code = "", status = "", body = ""] of list.matchAll(
    /code: "([a-z]+)",[\s\S]*?status: "(\w+)",[\s\S]*?parts: \{([\s\S]*?)\n {4}\},/g,
  )) {
    const parts = new Map<string, { path: string } | { pending: string }>();
    for (const [, part = "", path, pending] of body.matchAll(
      /(\w+): (?:"([^"]+)"|\{ pending: "([^"]+)" \})/g,
    )) {
      parts.set(part, path !== undefined ? { path } : { pending: pending ?? "" });
    }
    found.push({ code, status, parts });
  }
  return found;
}

/** Every problem with the list; an empty list passes. */
export function checkLanguages(
  source: string,
  exists: (path: string) => boolean = existsSync,
): string[] {
  const needed = neededParts(source);
  const all = languages(source);
  const problems: string[] = [];
  if (all.length === 0)
    problems.push(`${LIST}: no languages found; has the LANGUAGES shape changed?`);
  if (needed.size === 0) problems.push(`${LIST}: no NEEDED_PARTS found`);
  for (const { code, status, parts } of all) {
    const wants = needed.get(status);
    if (!wants) {
      problems.push(`${code}: unknown status "${status}"`);
      continue;
    }
    for (const part of wants) {
      const where = parts.get(part);
      if (!where) problems.push(`${code} is ${status} and names no ${part}`);
      else if ("path" in where && !exists(where.path))
        problems.push(`${code} is ${status} and its ${part} is missing: ${where.path}`);
      else if ("pending" in where && !ISSUE.test(where.pending))
        problems.push(
          `${code}'s ${part} is pending on "${where.pending}", which is not an issue id`,
        );
    }
  }
  return problems;
}

/**
 * The packages that import nothing of ours keep their own copy of the language codes: the
 * contracts enum and packages/copy's type (dl-5ssh.34.69). Each must list exactly the codes in
 * `LANGUAGES`, in order. Apps import the list from @jadwigo/config and need no entry here.
 */
export const MIRRORS: readonly { path: string; pattern: RegExp }[] = [
  {
    path: "packages/contracts/src/records.ts",
    pattern: /export const Language = z\.enum\(\[([^\]]*)\]\)/,
  },
  { path: "packages/copy/src/types.ts", pattern: /export type Language = ([^;]*);/ },
];

/** The codes a mirror lists, in order, or null when its line is not found. */
export function mirroredCodes(text: string, pattern: RegExp): string[] | null {
  const found = pattern.exec(text)?.[1];
  if (found === undefined) return null;
  return [...found.matchAll(/"([a-z]+)"/g)].map(([, code]) => code ?? "");
}

/** Every mirror that disagrees with the list; an empty list passes. */
export function checkMirrors(
  source: string,
  read: (path: string) => string = (path) => readFileSync(path, "utf8"),
): string[] {
  const codes = languages(source).map((l) => l.code);
  const problems: string[] = [];
  for (const { path, pattern } of MIRRORS) {
    const listed = mirroredCodes(read(path), pattern);
    if (listed === null) problems.push(`${path}: its language list is not found`);
    else if (listed.join() !== codes.join())
      problems.push(`${path} lists ${listed.join(", ")}; ${LIST} lists ${codes.join(", ")}`);
  }
  return problems;
}

if (import.meta.main) {
  const source = readFileSync(LIST, "utf8");
  const problems = [...checkLanguages(source), ...checkMirrors(source)];
  for (const p of problems) console.error(`languages: ${p}`);
  if (problems.length > 0) {
    console.error(`languages: restore the part, or fix its entry in ${LIST}.`);
    process.exit(1);
  }
}
