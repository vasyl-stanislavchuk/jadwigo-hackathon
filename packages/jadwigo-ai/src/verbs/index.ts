import type { Finding } from "@jadwigo/lesson-import/file";
import type { Verbs } from "./types.ts";

/**
 * Where the verbs read questions from: `question_search`, and the questions `lesson_draft` copies
 * whole into a draft. The verbs lane (dl-z5ja.15) may sharpen these shapes inside `src/verbs/`;
 * the runner never calls the bank.
 */
export interface BankPort {
  search(input: Record<string, unknown>): Promise<Record<string, unknown>>;
  sources(input: Record<string, unknown>): Promise<readonly Record<string, unknown>[]>;
}

export interface VerbDeps {
  bank: BankPort;
}

/** What `lesson_check` answers in its output: `@jadwigo/lesson-import/check` findings. */
export type CheckFindings = readonly Finding[];

const WAITS = "waits on dl-z5ja.15 (the verbs lane)";

/** The 5 verbs: lesson_draft, lesson_show, lesson_edit, lesson_check, question_search. */
export function createVerbs(_deps: VerbDeps): Verbs {
  throw new Error(`createVerbs ${WAITS}`);
}

/**
 * A bank of made-up questions for the dev page and the tests: no bank content, no Khan item, no
 * name (AGENTS.md fences 8 and 9). Outside `src/testing/` because the dev page runs it.
 */
export function fixtureBank(): BankPort {
  throw new Error(`fixtureBank ${WAITS}`);
}
