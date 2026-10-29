import { z } from "zod";
import * as contracts from "./index.ts";

/**
 * The schemas this package exports, each named by its export, for the two documents generated
 * from them: the JSON Schema snapshots in schemas/ and the OpenAPI document. Private to the package.
 */
export const schemas = Object.entries(contracts as Record<string, unknown>)
  .filter((entry): entry is [string, z.ZodType] => entry[1] instanceof z.ZodType)
  .sort(([a], [b]) => a.localeCompare(b));

/**
 * The operands of an intersection stay inline: zod merges two inline objects into one, while a
 * `$ref` operand leaves an `allOf` whose `additionalProperties: false` halves reject each other.
 */
function intersected(roots: z.ZodType[]): Set<z.ZodType> {
  const found = new Set<z.ZodType>();
  const seen = new Set<unknown>();
  const walk = (v: unknown): void => {
    if (seen.has(v) || v === null || typeof v !== "object") return;
    seen.add(v);
    if (v instanceof z.ZodType) {
      const def = v._zod.def as unknown as Record<string, unknown>;
      if (def["type"] === "intersection") {
        found.add(def["left"] as z.ZodType);
        found.add(def["right"] as z.ZodType);
      }
      if (typeof def["getter"] === "function") walk((def["getter"] as () => unknown)());
      for (const value of Object.values(def)) walk(value);
    } else for (const value of Object.values(v)) walk(value);
  };
  roots.forEach(walk);
  return found;
}
export const inline = intersected(schemas.map(([, schema]) => schema));

/**
 * A registry of every export that is not inline, by its export name, keeping each schema's own
 * `.describe()`: what `z.toJSONSchema(registry)` turns into named components.
 */
export function components(): {
  registry: z.core.$ZodRegistry<{ id: string }>;
  names: Map<z.ZodType, string>;
} {
  const registry = z.registry<{ id: string }>();
  const names = new Map<z.ZodType, string>();
  for (const [name, schema] of schemas) {
    if (inline.has(schema) || names.has(schema)) continue;
    registry.add(schema, { ...z.globalRegistry.get(schema), id: name });
    names.set(schema, name);
  }
  return { registry, names };
}
