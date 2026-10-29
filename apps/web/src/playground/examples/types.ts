/**
 * The shape of a written example as the page plays it: a question in packages/contracts' shapes,
 * its twin, and the scenarios that show it at work. They come from the API in one language
 * (examples/load.ts); the tests also play them as authored, in both. Every state the playground draws reads from here: a scenario is
 * the value a child might commit, what it shows (`outcome`, `mistake_class`) and the parts the page
 * marks. Nothing is judged in the playground; Sprawdź finds the scenario whose value was committed.
 */

import type { Family, PartMark, QuestionType } from "@jadwigo/contracts";
import type { Language } from "@jadwigo/copy";
import type { Text } from "../localize.ts";

/** A question as written: its family's data and key, in either language. Typed loosely here and
 * held to the contracts by the seed (packages/lesson-import) and the route's reply schema. */
export interface WrittenQuestion {
  question_type: QuestionType;
  family: Family;
  say: Text;
  data: unknown;
  key: unknown;
  help?: unknown;
}

export interface WrittenScenario {
  /** What the child tries, for the owner: "types 54". */
  try: Text;
  /** The committed value, in its family's shape (packages/contracts valueFor). */
  value: unknown;
  outcome: "correct" | "incorrect";
  mistake_class: string | null;
  /** The parts the page marks after this value: right or missed, never the class. */
  marks: PartMark[];
  /** The languages it plays in, when not both. */
  only?: Language[];
}

export interface WrittenExample {
  /** Unique within its question type, used in the URL. */
  id: string;
  /** What sets this example apart, for the owner, in English. */
  label: string;
  /** The example the question type leads with. */
  showcase?: boolean;
  question: WrittenQuestion;
  /** Help rung 4's twin: a question of its own (v0 keeps a twin as its own lesson question). */
  twin?: WrittenQuestion;
  scenarios: WrittenScenario[];
}
