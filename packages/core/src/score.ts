/** Clamp a raw score into [0, 1]. NaN counts as 0, so a broken grader never reads as mastery. */
export function clampScore(raw: number): number {
  if (Number.isNaN(raw)) return 0;
  return Math.min(1, Math.max(0, raw));
}
