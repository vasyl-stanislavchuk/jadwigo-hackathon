// The Paraglide messages beside the typed tables (dl-9t2o.1 step 0; the tables move here in
// dl-5ssh.34.22). Each live language has every key, and each key has a review flag in its
// language's sidecar. src/paraglide is compiled from messages/ by `bun run messages`.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { m } from "./paraglide/messages.js";
import { locales } from "./paraglide/runtime.js";

const read = (file: string): Record<string, unknown> =>
  JSON.parse(readFileSync(new URL(`../messages/${file}`, import.meta.url), "utf8"));
const keys = (file: string) =>
  Object.keys(read(file))
    .filter((k) => k !== "$schema")
    .sort();

describe("messages", () => {
  it("speaks the languages the tables do", () => {
    expect([...locales]).toEqual(["pl", "en"]);
  });

  it("has the same keys in pl and en, and a review flag for each in both sidecars", () => {
    const pl = keys("pl.json");
    expect(keys("en.json")).toEqual(pl);
    expect(keys("review.pl.json")).toEqual(pl);
    expect(keys("review.en.json")).toEqual(pl);
  });

  it("answers in the locale it is asked for", () => {
    expect(m.site_language_name({}, { locale: "pl" })).toBe("Polski");
    expect(m.site_language_name({}, { locale: "en" })).toBe("English");
  });
});
