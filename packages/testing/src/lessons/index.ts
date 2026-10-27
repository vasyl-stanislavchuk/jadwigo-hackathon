import equalGroups from "./equal-groups.json" with { type: "json" };
import fivesEverywhere from "./fives-everywhere.json" with { type: "json" };
import multiplicationTimesFour from "./multiplication-times-four.json" with { type: "json" };
import polishSpellingPractice from "./polish-spelling-practice.json" with { type: "json" };
import spellingDiagnostic from "./spelling-diagnostic.json" with { type: "json" };

/**
 * The playground's lesson files as JSON, for the lesson import (`dl-e8ov.2.32.5`) and its seed.
 * Written by david-learns `frontend/src/playground/sim/exportLessonFiles.ts`, never by hand:
 *
 *     cd frontend && bun run src/playground/sim/exportLessonFiles.ts <this folder>
 *     bunx biome format --write packages/testing/src/lessons/
 *
 * JSON holds no comments, so no family member's name comes across from the sources' headers.
 */
export const LESSON_FILES: readonly unknown[] = [
  equalGroups,
  multiplicationTimesFour,
  fivesEverywhere,
  spellingDiagnostic,
  polishSpellingPractice,
];
