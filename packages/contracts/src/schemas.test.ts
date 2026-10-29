import { readdirSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import * as contracts from "./index.ts";

/**
 * The contract gate: every schema this package exports has a JSON Schema snapshot in schemas/, and
 * a change to a wire shape fails here until the snapshot is updated on purpose (vitest -u) and
 * reviewed in the PR. CI never writes them.
 */
const kebab = (name: string) => name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const schemas = Object.entries(contracts as Record<string, unknown>)
  .filter((entry): entry is [string, z.ZodType] => entry[1] instanceof z.ZodType)
  .sort(([a], [b]) => a.localeCompare(b));

/**
 * Each exported schema is a named `$defs` entry wherever another snapshot uses it, so a change to a
 * shared shape is one definition per file, not every inlined copy (dl-5ssh.66). The ids live in
 * zod's global registry only while this file runs, beside each schema's own `.describe()`.
 */
const own = new Map(schemas.map(([, schema]) => [schema, z.globalRegistry.get(schema)]));
const named = (name: string, schema: z.ZodType) =>
  z.globalRegistry.add(schema, { ...own.get(schema), id: name });
const restore = (schema: z.ZodType) => {
  z.globalRegistry.remove(schema);
  const meta = own.get(schema);
  if (meta) z.globalRegistry.add(schema, meta);
};

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
const inline = intersected(schemas.map(([, schema]) => schema));

/** The schema as JSON Schema, its own shape at the root and every other export as a `$ref`. */
function jsonSchema(name: string, schema: z.ZodType): string {
  restore(schema);
  try {
    return `${JSON.stringify(z.toJSONSchema(schema), null, 2)}\n`;
  } finally {
    if (!inline.has(schema)) named(name, schema);
  }
}

describe("JSON Schema snapshots", () => {
  beforeAll(() => {
    for (const [name, schema] of schemas) if (!inline.has(schema)) named(name, schema);
  });
  afterAll(() => {
    for (const [, schema] of schemas) restore(schema);
  });

  it.each(schemas)("%s", async (name, schema) => {
    await expect(jsonSchema(name, schema)).toMatchFileSnapshot(`../schemas/${kebab(name)}.json`);
  });

  it("keeps no snapshot for a schema that is gone", () => {
    const files = readdirSync(new URL("../schemas/", import.meta.url)).filter((f) =>
      f.endsWith(".json"),
    );
    expect(files.sort()).toEqual(schemas.map(([name]) => `${kebab(name)}.json`).sort());
  });
});
