import equalGroups from "./equal-groups.json" with { type: "json" };
import fivesEverywhere from "./fives-everywhere.json" with { type: "json" };
import multiplicationTimesFour from "./multiplication-times-four.json" with { type: "json" };
import polishSpellingPractice from "./polish-spelling-practice.json" with { type: "json" };
import spellingDiagnostic from "./spelling-diagnostic.json" with { type: "json" };

/**
 * The playground's lesson files as JSON, for the lesson import (`dl-e8ov.2.32.5`) and its seed.
 * Exported by david-learns `frontend/src/playground/sim/exportLessonFiles.ts`, then made ours:
 *
 *     cd frontend && bun run src/playground/sim/exportLessonFiles.ts <this folder>
 *     bunx biome format --write packages/testing/src/lessons/
 *
 * After an export, remove every step `based_on` a `khan:` item, with its credit, and the sentence
 * of `reasoning` that names Khan (AGENTS.md fence 8: no bank in git), and rename a character
 * named like a family member the way the playground port did (fence 9). JSON holds no comments,
 * so no name comes across from the sources' headers.
 */
export const LESSON_FILES: readonly unknown[] = [
  equalGroups,
  multiplicationTimesFour,
  fivesEverywhere,
  spellingDiagnostic,
  polishSpellingPractice,
];
