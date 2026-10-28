import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
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

describe("JSON Schema snapshots", () => {
  it.each(schemas)("%s", async (name, schema) => {
    await expect(`${JSON.stringify(z.toJSONSchema(schema), null, 2)}\n`).toMatchFileSnapshot(
      `../schemas/${kebab(name)}.json`,
    );
  });

  it("keeps no snapshot for a schema that is gone", () => {
    const files = readdirSync(new URL("../schemas/", import.meta.url)).filter((f) =>
      f.endsWith(".json"),
    );
    expect(files.sort()).toEqual(schemas.map(([name]) => `${kebab(name)}.json`).sort());
  });
});
