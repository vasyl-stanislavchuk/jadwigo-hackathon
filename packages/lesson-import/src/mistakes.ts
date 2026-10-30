import { FamilyQuestion, Language } from "@jadwigo/contracts";
import { mistakeClassesOf } from "@jadwigo/core";
import { resolve } from "./lesson-file.ts";

/**
 * The mistake classes a question's judge can give a miss on its own data and key, which are all a
 * `boost_by_mistake` key may name: packages/core's `mistakeClassesOf` (dl-e8ov.5.38.15). Read
 * from the file as given, its lines resolved to its language, so a check can list them for a file
 * that does not parse as a whole.
 */

const record = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

/** A question's classes, or null when it is not a family question the contract parses. */
function classesOf(question: Record<string, unknown>, language: Language): string[] | null {
  const { family, data, key } = record(resolve(question, language)) ?? {};
  const parsed = FamilyQuestion.safeParse({ family, data, key });
  return parsed.success ? mistakeClassesOf(parsed.data) : null;
}

/**
 * Each question step's classes by step id, a twin's under its own (`<step id>t`, as compile names
 * it). A step whose question does not parse is left out; an empty list is a step no judge reads.
 */
export function mistakeClassesByStep(raw: unknown): Record<string, string[]> {
  const file = record(raw);
  const language = Language.safeParse(file?.["language"]);
  const parts = record(file?.["script"])?.["parts"];
  const out: Record<string, string[]> = {};
  for (const part of Array.isArray(parts) ? parts : []) {
    const steps = record(part)?.["steps"];
    for (const step of Array.isArray(steps) ? steps : []) {
      const id = record(step)?.["id"];
      const question = record(record(step)?.["question"]);
      if (typeof id !== "string" || question === null) continue;
      const lang = language.success ? language.data : "pl";
      const classes = classesOf(question, lang);
      if (classes !== null) out[id] = classes;
      const twin = record(record(question["help"])?.["twin"]);
      const twinClasses = twin && classesOf({ family: question["family"], ...twin }, lang);
      if (twinClasses) out[`${id}t`] = twinClasses;
    }
  }
  return out;
}

/** The boost keys a question never gives, as one sentence naming the ones it does, or null. */
export function unknownBoosts(
  question: FamilyQuestion,
  boostByMistake: object | undefined,
): string | null {
  const classes = mistakeClassesOf(question);
  const unknown = Object.keys(boostByMistake ?? {}).filter((k) => !classes.includes(k));
  if (unknown.length === 0) return null;
  const valid = classes.length > 0 ? classes.join(", ") : "none";
  return `boost_by_mistake names ${unknown.join(", ")}, which this ${question.family} question never gives; its classes are ${valid}`;
}
