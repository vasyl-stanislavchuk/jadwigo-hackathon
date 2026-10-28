/** For the part tests: the value, or a thrown error naming what was missing. */
export function must<T>(value: T | null | undefined, what = "a value"): T {
  if (value === null || value === undefined) throw new Error(`expected ${what}`);
  return value;
}
