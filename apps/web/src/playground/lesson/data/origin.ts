/**
 * Whom to ask about a step (dl-a38n.30): copied from a bank item whole, adapted from one by the
 * agent (its `based_on.changes`), written into a hand-made lesson, or written by the agent from
 * nothing. Read from the step's `based_on` (decision
 * jadwigo-ai-workflows/2026-10-30-lesson-from-the-bank-copies-the-bank-question-whole-then-adapts).
 */

export type Origin =
  | { kind: "copied"; from: string }
  | { kind: "adapted"; from: string; changes: string[] }
  | { kind: "authored"; from: string }
  | { kind: "written" };

export function originOf(
  based_on: { question: string; changes: { change: string }[] } | null | undefined,
): Origin {
  if (based_on === null || based_on === undefined) return { kind: "written" };
  const from = based_on.question;
  if (from.startsWith("authored:")) return { kind: "authored", from };
  if (based_on.changes.length > 0)
    return { kind: "adapted", from, changes: [...new Set(based_on.changes.map((c) => c.change))] };
  return { kind: "copied", from };
}

export function originText(origin: Origin): string {
  switch (origin.kind) {
    case "copied":
      return `copied whole from ${origin.from}`;
    case "adapted":
      return `adapted by the agent from ${origin.from}: ${origin.changes.join(", ")}`;
    case "authored":
      return `hand-written lesson (${origin.from})`;
    case "written":
      return "written by the agent, from no bank item";
  }
}
