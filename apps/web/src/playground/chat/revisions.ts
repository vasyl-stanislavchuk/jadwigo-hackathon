/**
 * Which steps an AI revision changed (dl-z5ja.30): the lesson the pane drew before against the one
 * it draws now, step by step id. The highlight and "Cofnij" read it. Pure, on the opaque lesson
 * file the fold keeps (`RunView.lesson.lesson_file`), so a reload diffs against nothing and
 * highlights nothing rather than guessing.
 */

type Fields = Record<string, unknown>;

const isFields = (value: unknown): value is Fields =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Each step of a lesson file by its id, as JSON text: what one step's sameness is judged on. */
function stepsById(file: unknown): Map<string, string> {
  const steps = new Map<string, string>();
  const script = isFields(file) ? file["script"] : undefined;
  const parts = isFields(script) && Array.isArray(script["parts"]) ? script["parts"] : [];
  for (const part of parts) {
    const list = isFields(part) && Array.isArray(part["steps"]) ? part["steps"] : [];
    for (const step of list)
      if (isFields(step) && typeof step["id"] === "string")
        steps.set(step["id"], JSON.stringify(step));
  }
  return steps;
}

/** The ids of the steps `next` adds or changes against `previous`; none when there is no previous. */
export function changedSteps(previous: unknown, next: unknown): ReadonlySet<string> {
  if (previous === null || previous === undefined) return new Set();
  const before = stepsById(previous);
  const changed = new Set<string>();
  for (const [id, step] of stepsById(next)) if (before.get(id) !== step) changed.add(id);
  return changed;
}
