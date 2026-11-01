import { VerbError } from "./types.ts";

/**
 * Reading a verb's input by hand: the model's arguments are JSON, and every refusal is a
 * `VerbError` the model reads and may correct. A key the tool does not name is refused, so a pod,
 * a learner or an owner never rides in on the arguments (Lead decision 7).
 */

export type Json = Record<string, unknown>;

export function isObject(value: unknown): value is Json {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export class Input {
  constructor(
    readonly verb: string,
    readonly raw: Json,
    allowed: readonly string[],
  ) {
    const unknown = Object.keys(raw).filter((k) => !allowed.includes(k));
    if (unknown.length > 0) {
      throw new VerbError(
        "input",
        `${verb} takes ${allowed.join(", ")}; it does not take ${unknown.join(", ")}`,
      );
    }
  }

  #refuse(key: string, what: string): never {
    throw new VerbError("input", `${this.verb}: ${key} is ${what}`);
  }

  string(key: string): string {
    const v = this.raw[key];
    if (typeof v !== "string" || v.trim() === "") this.#refuse(key, "a string, and required");
    return v;
  }

  optionalString(key: string): string | null {
    const v = this.raw[key];
    if (v === undefined || v === null) return null;
    if (typeof v !== "string") this.#refuse(key, "a string or null");
    return v;
  }

  oneOf<T extends string>(key: string, values: readonly T[], fallback: T): T {
    const v = this.raw[key] ?? fallback;
    if (typeof v !== "string" || !(values as readonly string[]).includes(v)) {
      this.#refuse(key, `one of ${values.join(", ")}`);
    }
    return v as T;
  }

  strings(key: string, required: boolean): string[] {
    const v = this.raw[key];
    if ((v === undefined || v === null) && !required) return [];
    if (!Array.isArray(v) || !v.every((s) => typeof s === "string")) {
      this.#refuse(key, required ? "a list of strings, and required" : "a list of strings or null");
    }
    return v;
  }

  optionalInt(key: string, min: number, max: number): number | null {
    const v = this.raw[key];
    if (v === undefined || v === null) return null;
    if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
      this.#refuse(key, `a whole number from ${min} to ${max}`);
    }
    return v;
  }

  object(key: string): Json {
    const v = this.raw[key];
    if (!isObject(v)) this.#refuse(key, "an object, and required");
    return v;
  }
}

/** RFC 7386: an object patch merges key by key, `null` removes, any other value replaces. */
export function mergePatch(target: unknown, patch: unknown): unknown {
  if (!isObject(patch)) return structuredClone(patch);
  const out: Json = isObject(target) ? structuredClone(target) : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) delete out[key];
    else out[key] = mergePatch(out[key], value);
  }
  return out;
}
