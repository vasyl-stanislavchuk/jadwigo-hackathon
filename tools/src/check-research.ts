// Research notes end in an outcome the next session can act on (dl-5ssh.34.8), ported from
// david-learns scripts/check_research.py. A note in docs/research/ ends with one fenced
// `json jadwigo-outcome` block: the answer closes the issue, owner_decisions become the owner's
// questions (options, never a pick) and proposed_issues become issues.
// Run: bun tools/src/check-research.ts [dir | note.md] [--issue <id>]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const FENCE = /```json jadwigo-outcome\n([\s\S]*?)\n```/g;
const HEADING = "## What this means for jadwigo";
const STATUSES = ["answered", "partial"];
const PICK_KEYS = ["recommended", "pick", "choice", "decision"];

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (o: Obj, k: string) => typeof o[k] === "string" && (o[k] as string).trim() !== "";
const strings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === "string" && s.trim() !== "");

function list(out: Obj, key: string, errors: string[]): unknown[] {
  const value = out[key];
  if (!Array.isArray(value)) {
    errors.push(`${key}: a list (may be empty)`);
    return [];
  }
  return value;
}

/** Every problem with a note's outcome; an empty list means the next session can read it. */
export function checkNote(note: string, issue?: string): string[] {
  const errors = note.includes(HEADING) ? [] : [`missing heading "${HEADING}"`];
  const blocks = [...note.matchAll(FENCE)].map((m) => m[1] ?? "");
  if (blocks.length !== 1)
    return [...errors, `expected one json jadwigo-outcome block, found ${blocks.length}`];
  let out: unknown;
  try {
    out = JSON.parse(blocks[0] ?? "");
  } catch (e) {
    return [...errors, `jadwigo-outcome is not valid JSON: ${(e as Error).message}`];
  }
  if (!isObj(out)) return [...errors, "jadwigo-outcome must be a JSON object"];

  for (const key of ["issue", "question", "answer"]) {
    if (!text(out, key)) errors.push(`${key}: a non-empty string is required`);
  }
  if (issue && out["issue"] !== issue)
    errors.push(`issue: expected ${issue}, found ${out["issue"]}`);
  if (!STATUSES.includes(out["status"] as string))
    errors.push(`status: one of ${STATUSES.join(", ")}`);
  const sources = out["sources"];
  if (!strings(sources) || !sources.some((s) => s.startsWith("http")))
    errors.push("sources: a list of links, at least one http(s)");

  for (const [n, d] of list(out, "owner_decisions", errors).entries()) {
    const where = `owner_decisions[${n}]`;
    if (!isObj(d)) {
      errors.push(`${where}: an object`);
      continue;
    }
    if (!text(d, "question")) errors.push(`${where}.question: required`);
    const options = d["options"];
    if (!strings(options) || options.length < 2) errors.push(`${where}.options: at least two`);
    if (PICK_KEYS.some((k) => k in d))
      errors.push(`${where}: product questions stay with the owner; options, not a pick`);
  }
  for (const [n, p] of list(out, "proposed_issues", errors).entries()) {
    const where = `proposed_issues[${n}]`;
    if (!isObj(p)) {
      errors.push(`${where}: an object`);
      continue;
    }
    for (const key of ["title", "scope", "done_when"]) {
      if (!text(p, key)) errors.push(`${where}.${key}: required`);
    }
    for (const key of ["depends_on", "labels"]) {
      if (!Array.isArray(p[key])) errors.push(`${where}.${key}: a list (may be empty)`);
    }
  }
  for (const [n, c] of list(out, "page_changes", errors).entries()) {
    if (!isObj(c) || !text(c, "section") || !text(c, "change"))
      errors.push(`page_changes[${n}]: needs section and change`);
  }
  return errors;
}

/** Every note under dir, except its README. */
export function checkResearch(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const notes = statSync(dir).isDirectory()
    ? readdirSync(dir)
        .filter((f) => f.endsWith(".md") && f !== "README.md")
        .map((f) => join(dir, f))
    : [dir];
  return notes.flatMap((path) => checkNote(readFileSync(path, "utf8")).map((e) => `${path}: ${e}`));
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--issue");
  const issue = at >= 0 ? args[at + 1] : undefined;
  const target = args.find((a, i) => !a.startsWith("--") && i !== at + 1) ?? "docs/research";
  const problems =
    issue && target.endsWith(".md")
      ? checkNote(readFileSync(target, "utf8"), issue).map((e) => `${target}: ${e}`)
      : checkResearch(target);
  for (const p of problems) console.error(`research: ${p}`);
  if (problems.length > 0) process.exit(1);
}
