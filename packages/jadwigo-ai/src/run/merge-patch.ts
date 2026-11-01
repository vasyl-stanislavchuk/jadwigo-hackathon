/**
 * A JSON merge patch (RFC 7386) on a lesson file, pure: a key set to `null` is removed, an object
 * merges into the object it names, and any other value, an array included, replaces what was
 * there. The target is never changed; the answer shares no object the patch changed.
 */
export function mergePatch(
  target: unknown,
  patch: Record<string, unknown>,
): Record<string, unknown>;
export function mergePatch(target: unknown, patch: unknown): unknown;
export function mergePatch(target: unknown, patch: unknown): unknown {
  if (!isObject(patch)) return patch;
  const out: Record<string, unknown> = isObject(target) ? { ...target } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete out[key];
    else out[key] = mergePatch(out[key], value);
  }
  return out;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
