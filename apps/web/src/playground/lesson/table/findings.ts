/**
 * The check's findings as the builder reads them from `<draft_id>.check.json` (lead decision 2):
 * `{ok, findings: Finding[], ...}`, and the old `errors: [{step_id, message}]` for the one release
 * it stays. A finding that is not one is left out rather than drawn wrong; the file is jw's to
 * write, and a half-written one must not take the page down.
 */

import { FINDING_LEVELS, type Finding } from "@jadwigo/lesson-import/file";

const LEVELS: readonly string[] = FINDING_LEVELS;

const isFinding = (f: unknown): f is Finding => {
  if (f === null || typeof f !== "object") return false;
  const { step_id, path, level, rule, text, fix } = f as Record<string, unknown>;
  return (
    (step_id === null || typeof step_id === "string") &&
    typeof path === "string" &&
    typeof level === "string" &&
    LEVELS.includes(level) &&
    typeof rule === "string" &&
    typeof text === "string" &&
    typeof fix === "string"
  );
};

/** Every finding in a check file, in the order it lists them. */
export function findingsOf(check: unknown): Finding[] {
  if (check === null || typeof check !== "object") return [];
  const { findings, errors } = check as { findings?: unknown; errors?: unknown };
  if (Array.isArray(findings)) return findings.filter(isFinding);
  if (!Array.isArray(errors)) return [];
  return errors.flatMap((e) => {
    const { step_id, message } = (e ?? {}) as { step_id?: unknown; message?: unknown };
    if (typeof message !== "string") return [];
    return [
      {
        step_id: typeof step_id === "string" ? step_id : null,
        path: "",
        level: "error",
        rule: "compile",
        text: message,
        fix: "",
      } satisfies Finding,
    ];
  });
}
