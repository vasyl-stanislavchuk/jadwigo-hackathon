import { Family } from "@jadwigo/contracts";
import { MISTAKE_CLASSES } from "@jadwigo/core";

/**
 * The mistake classes a question can give a miss, which are all a `boost_by_mistake` key may name
 * (dl-e8ov.5.38.11): its family's own (`MISTAKE_CLASSES` in packages/core) and every class the
 * author wrote in its key's `near` tables. Read from the file as given, so a check can list them
 * for a file that does not parse.
 */

const record = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

const strings = (vs: readonly unknown[]): string[] =>
  vs.filter((v): v is string => typeof v === "string");

/** The classes a key's `near` table names, in each family's shape. */
function nearClasses(family: Family, key: unknown): string[] {
  const k = record(key);
  if (k === null) return [];
  switch (family) {
    case "choose":
    case "enter":
      return strings(Object.values(record(k["near"]) ?? {}));
    case "group":
      return Object.values(record(k["near"]) ?? {}).flatMap((byGroup) =>
        strings(Object.values(record(byGroup) ?? {})),
      );
    case "place":
      return Array.isArray(k["near"])
        ? strings(k["near"].map((region) => record(region)?.["mistake_class"]))
        : [];
    case "slots":
      return Object.values(record(k["gaps"]) ?? {}).flatMap((gap) =>
        strings(Object.values(record(record(gap)?.["near"]) ?? {})),
      );
    case "sequence":
    case "explain":
      return [];
  }
}

/** A question's classes, sorted, or null when its family is not one the contract knows. */
export function mistakeClassesOf(question: unknown): string[] | null {
  const q = record(question);
  const family = Family.safeParse(q?.["family"]);
  if (!family.success) return null;
  return [
    ...new Set([...MISTAKE_CLASSES[family.data], ...nearClasses(family.data, q?.["key"])]),
  ].sort();
}

/** Each question step's classes by step id, a twin's under its own (`<step id>t`, as compile names it). */
export function mistakeClassesByStep(raw: unknown): Record<string, string[]> {
  const parts = record(record(raw)?.["script"])?.["parts"];
  const out: Record<string, string[]> = {};
  for (const part of Array.isArray(parts) ? parts : []) {
    const steps = record(part)?.["steps"];
    for (const step of Array.isArray(steps) ? steps : []) {
      const id = record(step)?.["id"];
      const question = record(record(step)?.["question"]);
      if (typeof id !== "string" || question === null) continue;
      const classes = mistakeClassesOf(question);
      if (classes !== null) out[id] = classes;
      const twin = record(record(question["help"])?.["twin"]);
      const twinClasses = twin && mistakeClassesOf({ family: question["family"], ...twin });
      if (twinClasses) out[`${id}t`] = twinClasses;
    }
  }
  return out;
}

/** The boost keys a question's classes lack, as one sentence naming the valid ones, or null. */
export function unknownBoosts(
  question: unknown,
  boostByMistake: object | undefined,
): string | null {
  const classes = mistakeClassesOf(question) ?? [];
  const unknown = Object.keys(boostByMistake ?? {}).filter((k) => !classes.includes(k));
  if (unknown.length === 0) return null;
  const family = String(record(question)?.["family"]);
  const valid = classes.length > 0 ? classes.join(", ") : "none";
  return `boost_by_mistake names ${unknown.join(", ")}, which this ${family} question never gives; its classes are ${valid}`;
}
