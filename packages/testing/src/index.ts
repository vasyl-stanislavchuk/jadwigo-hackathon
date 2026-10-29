/** The instant every unit test's clock is pinned to (unit-setup.ts). */
export const FIXED_NOW = new Date("2026-09-01T08:00:00.000Z");
export { GOLDEN_CASES } from "./golden/index.ts";
export { LESSON_FILES } from "./lessons/index.ts";
export {
  type AllowEntry,
  allowlistFor,
  checkTokens,
  TOKEN_RULES,
  type TokenReport,
  type TokenViolation,
} from "./tokens.ts";
