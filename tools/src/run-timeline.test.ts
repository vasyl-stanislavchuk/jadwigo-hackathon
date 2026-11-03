// tools/run-timeline.sql (dl-hin8.37) prints a family's run records for whoever reads the output,
// so it may name only metadata. A payload field outside this list fails here, including the words
// and values it must never select: a message's text, a tool's input values or output, a lesson file.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const SQL = readFileSync(resolve(import.meta.dirname, "../run-timeline.sql"), "utf8");

const ALLOWED = new Set([
  "attempt",
  "cached_tokens",
  "call_id",
  "call_no",
  "cap_usd",
  "cost_usd",
  "entries",
  "error",
  "from",
  "input",
  "input_tokens",
  "level",
  "message",
  "model",
  "output_tokens",
  "retryable",
  "revision",
  "source",
  "spent_usd",
  "status",
  "step_id",
  "tool_calls",
  "type",
  "usage",
  "verb",
]);

/** Every key a JSON arrow reads, on any payload. */
function keysRead(sql: string): string[] {
  return [...sql.matchAll(/->>?\s*'([a-z_]+)'/g)].flatMap((m) => (m[1] ? [m[1]] : []));
}

/** The JSON read outside the two places the input may be read: its step id, and its key paths. */
function badReads(sql: string): string[] {
  const bad = keysRead(sql).filter((key) => !ALLOWED.has(key));
  // The whole input is walked for its paths only: a value prints only for these 3 enum fields.
  if (!sql.includes("name in ('family', 'input', 'entry')")) bad.push("value printing widened");
  if (/left\(value #>> '\{\}', 40\) else path/.test(sql) === false) bad.push("value not cut");
  return bad;
}

describe("run-timeline.sql", () => {
  it("reads only the metadata keys", () => {
    expect(badReads(SQL)).toEqual([]);
  });

  it.each([
    ["a message's text", "payload->>'text'"],
    ["the lesson file", "payload->'lesson_file'"],
    ["a tool's output", "payload->'output'"],
    ["a tool's view", "payload->'view'"],
  ])("catches a planted read of %s", (_name, planted) => {
    expect(badReads(`${SQL}\nselect ${planted};`).length).toBeGreaterThan(0);
  });

  it("catches a planted widening of the printed values", () => {
    const widened = SQL.replace("name in ('family', 'input', 'entry')", "name <> ''");
    expect(badReads(widened)).toContain("value printing widened");
  });

  it("changes nothing: one read-only transaction, rolled back", () => {
    expect(SQL).toContain("begin read only;");
    expect(SQL.trimEnd().endsWith("rollback;")).toBe(true);
    expect(SQL).not.toMatch(/^\s*(insert|update|delete|drop|alter|create)\b/im);
  });
});
