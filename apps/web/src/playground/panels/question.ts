/**
 * A written example as the page plays it: its question resolved to one language and put through the
 * playground switches, with its twin as help rung 4, and what a committed value is in the authored
 * data (owner, "scenarios to play + data lookup"). Nothing here is judged: a value is one of the
 * example's written scenarios, the key's accepted answer, or one of the key's known wrong answers,
 * each compared exactly, or it is none of them. Nothing is tolerant, no maths is parsed and no
 * accent is folded.
 */

import type { Help, PartMark, Verdict } from "@jadwigo/contracts";
import { type Category, copy, type Language } from "@jadwigo/copy";
import { type FamilySpec, solutionOf } from "@jadwigo/lesson-kit";
import type { WrittenExample, WrittenQuestion, WrittenScenario } from "../examples/index.ts";
import { resolve } from "../localize.ts";
import { applySwitches } from "../switchApply.ts";

/** The id a question type's example plays under: unique across the playground. */
export const specId = (example: WrittenExample): string =>
  `${example.question.question_type}/${example.id}`;

function specOfQuestion(id: string, question: WrittenQuestion, language: Language): FamilySpec {
  const q = resolve<WrittenQuestion>(question, language);
  return {
    id,
    question_type: q.question_type,
    family: q.family,
    say: q.say as string,
    data: q.data,
    key: q.key,
    ...(q.help === undefined ? {} : { help: q.help as Help }),
  } as FamilySpec;
}

/** The example's question in `language` under the page's switches, its twin on help rung 4. */
export function specOf(
  example: WrittenExample,
  language: Language,
  query: URLSearchParams = new URLSearchParams(),
): FamilySpec {
  const spec = applySwitches(specOfQuestion(specId(example), example.question, language), query);
  if (example.twin === undefined) return spec;
  const { help: _help, ...twin } = applySwitches(
    specOfQuestion(`${specId(example)}~twin`, example.twin, language),
    query,
  );
  return { ...spec, help: { ...(spec.help ?? {}), twin } } as FamilySpec;
}

/** The scenarios that play in `language`. */
export function scenariosIn(example: WrittenExample, language: Language): WrittenScenario[] {
  return example.scenarios.filter((s) => s.only === undefined || s.only.includes(language));
}

/** Deep equality of two committed values; a Choose value's `chosen` compares as a set. */
export function sameValue(family: string, a: unknown, b: unknown): boolean {
  if (family === "choose") {
    const x = (a as { chosen?: unknown } | null)?.chosen;
    const y = (b as { chosen?: unknown } | null)?.chosen;
    if (!Array.isArray(x) || !Array.isArray(y)) return false;
    const sx = new Set(x);
    const sy = new Set(y);
    return sx.size === sy.size && [...sy].every((id) => sx.has(id));
  }
  return deepEqual(a, b);
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) =>
    deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

/** The written scenario a committed value is, in `language`, or null: the value is not judged. */
export function scenarioFor(
  example: WrittenExample,
  value: unknown,
  language: Language,
): WrittenScenario | null {
  return (
    scenariosIn(example, language).find((s) =>
      sameValue(example.question.family, resolve(s.value, language), value),
    ) ?? null
  );
}

/** What a committed value is in the authored data: a written scenario, the key's accepted answer
 * (right, nothing marked), or a known wrong answer the key names (missed, the whole question). */
export interface Found {
  via: "scenario" | "key" | "near";
  outcome: "correct" | "incorrect";
  mistake_class: string | null;
  marks: PartMark[];
}

const fromKey: Found = { via: "key", outcome: "correct", mistake_class: null, marks: [] };
const near = (mistake_class: string): Found => ({
  via: "near",
  outcome: "incorrect",
  mistake_class,
  marks: [],
});

/** Whether `value` is the key's accepted answer: the solution itself, Enter's `accept`, or every
 * gap of a Slots question at an accepted form (a typed gap's `accept`, a chosen gap's `correct`). */
function accepted(spec: FamilySpec, value: unknown): boolean {
  if (spec.family !== "explain" && sameValue(spec.family, value, solutionOf(spec))) return true;
  if (spec.family === "enter") {
    const entered = (value as { entered?: unknown } | null)?.entered;
    return typeof entered === "string" && spec.key.accept.includes(entered);
  }
  if (spec.family === "slots") {
    const gaps = (value as { gaps?: Record<string, unknown> } | null)?.gaps;
    if (gaps === undefined || gaps === null) return false;
    return Object.entries(spec.key.gaps).every(([id, k]) => {
      const given = gaps[id];
      if (typeof given !== "string") return false;
      return k.kind === "enter" ? k.accept.includes(given) : k.correct.includes(given);
    });
  }
  return false;
}

/** The known wrong answer `value` is: Enter's `near[entered]`, or Choose's `near[option]` for the
 * first option picked that has one. */
function knownWrong(spec: FamilySpec, value: unknown): Found | null {
  if (spec.family === "enter") {
    const entered = (value as { entered?: unknown } | null)?.entered;
    const cls = typeof entered === "string" ? spec.key.near?.[entered] : undefined;
    return cls === undefined ? null : near(cls);
  }
  if (spec.family === "choose") {
    const chosen = (value as { chosen?: unknown } | null)?.chosen;
    if (!Array.isArray(chosen)) return null;
    for (const id of chosen) {
      const cls = typeof id === "string" ? spec.key.near?.[id] : undefined;
      if (cls !== undefined) return near(cls);
    }
  }
  return null;
}

/**
 * What a free answer is, in this order: (a) one of the example's scenarios, by value; (b) the
 * key's accepted answer; (c) a known wrong answer the key names. Null: not in the authored data,
 * and not judged. `spec` is the question being answered (the twin has no scenarios, only its key).
 */
export function lookUp(
  example: WrittenExample | null,
  spec: FamilySpec,
  value: unknown,
  language: Language,
): Found | null {
  const scenario = example === null ? null : scenarioFor(example, value, language);
  if (scenario !== null)
    return {
      via: "scenario",
      outcome: scenario.outcome,
      mistake_class: scenario.mistake_class,
      marks: scenario.marks,
    };
  if (accepted(spec, value)) return fromKey;
  return knownWrong(spec, value);
}

/** A written scenario as what it shows. */
export const foundOf = (scenario: WrittenScenario): Found => ({
  via: "scenario",
  outcome: scenario.outcome,
  mistake_class: scenario.mistake_class,
  marks: scenario.marks,
});

/** A scenario as the verdict a review draws: its outcome, its class and its marks, as written. */
export function verdictOf(scenario: Found | WrittenScenario | null | undefined): Verdict {
  if (scenario === null || scenario === undefined)
    return { correct: false, mistake_class: null, parts: [] };
  const correct = scenario.outcome === "correct";
  return {
    correct,
    mistake_class: scenario.mistake_class,
    parts: scenario.marks.map((m: PartMark) => ({
      id: m.id,
      correct: m.correct,
      mistake_class: m.correct ? null : scenario.mistake_class,
    })),
  };
}

/** A scenario's button names, written {check}, {done}, {yes}, {no}, {next}, {show}, in the
 * learner's language. */
export function fillButtons(text: string, language: Language, category: Category): string {
  const keys = {
    check: "check",
    done: "done",
    yes: "yes",
    no: "no",
    next: "continue",
    show: "reveal_show",
  } as const;
  return text.replace(
    /\{(check|done|yes|no|next|show)\}/g,
    (_, name: keyof typeof keys) => `“${copy(language, keys[name], {}, category)}”`,
  );
}

/** A mistake class as an owner reads it: `swapped_neighbours` → "swapped neighbours". */
export const humanClass = (c: string | null): string =>
  c === null ? "right" : c.replaceAll("_", " ");
