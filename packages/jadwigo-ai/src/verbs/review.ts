import { type CheckResult, check } from "@jadwigo/lesson-import/check";
import type { Finding } from "@jadwigo/lesson-import/file";
import { harshWordsIn } from "./harsh.ts";
import { isObject, type Json } from "./input.ts";

/**
 * What a lesson revision is checked against before a parent may publish it (Lead decision 25,
 * `dl-z5ja.31`, research `posthog-ai-ux-patterns.md` 16.1): `check()`, the hand-written lesson's
 * check, and the harsh-word check over every string a child reads. A revision with an error
 * finding is not publishable. The mark is a function of the lesson file alone, so whatever
 * publishes later reads it again from the revision it publishes, never from a stored flag.
 */

/** The rule a harsh word in a child's text is cited by. */
export const HARSH_WORD_RULE = "harsh-word";

/**
 * Parts of a step a child never reads: the key and its near misses, and the names the page draws
 * by (an option's id, a family, a layout). Everything else under `say`, `teach` and `question` is
 * on the child's screen, the help, its mistake cards and the twin included.
 */
const NOT_READ = new Set(["key", "near", "id", "family", "select", "layout", "kind"]);
/** The parts of a step a child reads. `reason` is the parent's and `scenarios` are test taps. */
const READ = ["say", "teach", "question"] as const;

interface Line {
  path: string;
  text: string;
}

function linesOf(value: unknown, path: string, out: Line[]): void {
  if (typeof value === "string") out.push({ path, text: value });
  else if (Array.isArray(value)) {
    for (const [i, v] of value.entries()) linesOf(v, `${path}[${i}]`, out);
  } else if (isObject(value)) {
    for (const [k, v] of Object.entries(value)) {
      if (!NOT_READ.has(k)) linesOf(v, `${path}.${k}`, out);
    }
  }
}

/** Every string a child reads, with its path into the file and the step it is on. */
function childLines(file: Json): (Line & { step_id: string | null })[] {
  const out: (Line & { step_id: string | null })[] = [];
  if (typeof file["title"] === "string")
    out.push({ step_id: null, path: "title", text: file["title"] });
  const script = isObject(file["script"]) ? file["script"] : {};
  const parts = Array.isArray(script["parts"]) ? script["parts"] : [];
  parts.forEach((part: unknown, p) => {
    const steps = isObject(part) && Array.isArray(part["steps"]) ? part["steps"] : [];
    steps.forEach((step: unknown, s) => {
      if (!isObject(step)) return;
      const step_id = typeof step["id"] === "string" ? step["id"] : null;
      const lines: Line[] = [];
      for (const k of READ) linesOf(step[k], `script.parts[${p}].steps[${s}].${k}`, lines);
      out.push(...lines.map((l) => ({ ...l, step_id })));
    });
  });
  return out;
}

/** An error finding for each line a child reads that holds a harsh word. */
function harshFindings(file: Json): Finding[] {
  return childLines(file).flatMap(({ step_id, path, text }) => {
    const words = [...new Set(harshWordsIn(text))];
    if (words.length === 0) return [];
    return [
      {
        step_id,
        path,
        level: "error" as const,
        rule: HARSH_WORD_RULE,
        text: `a child reads ${words.map((w) => `"${w}"`).join(", ")} here: a miss is "not yet", never a bare judgement`,
        fix: `say what to try next, kindly ("Jeszcze nie", "Not yet"), without ${words.join(", ")}`,
      },
    ];
  });
}

export interface Review {
  result: CheckResult;
  /** check()'s findings, then the harsh-word ones. */
  findings: Finding[];
  /** No error finding: a parent may publish this revision. */
  publishable: boolean;
}

/** The checks a revision passes before it can be published. */
export function review(file: Json): Review {
  const result = check(file);
  const findings = [...result.findings, ...harshFindings(file)];
  return { result, findings, publishable: !findings.some((f) => f.level === "error") };
}
