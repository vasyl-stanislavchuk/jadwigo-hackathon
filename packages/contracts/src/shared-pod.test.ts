import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FEATURED_POD_ID, ID_PREFIXES, uuidOf } from "./ids.ts";

/**
 * The shared catalogue lives in Jadwigo's own pod, and SQL cannot import FEATURED_POD_ID, so
 * `app.shared_pod_id()` (migration 20261031120000_learner_knowledge.sql) writes its uuid out. This
 * fails when the two differ.
 */
const MIGRATIONS = new URL("../../../supabase/migrations/", import.meta.url);
const sql = readdirSync(MIGRATIONS)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(new URL(f, MIGRATIONS), "utf8"))
  .join("\n");

describe("the shared pod", () => {
  it("is FEATURED_POD_ID in app.shared_pod_id()", () => {
    const found = [
      ...sql.matchAll(/function app\.shared_pod_id\(\)[\s\S]*?'([0-9a-f-]{36})'::uuid/g),
    ].map((m) => m[1]);
    expect(found.at(-1)).toBe(uuidOf(ID_PREFIXES.pod, FEATURED_POD_ID));
  });
});
