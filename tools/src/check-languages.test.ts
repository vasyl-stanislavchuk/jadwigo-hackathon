import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkLanguages, checkMirrors, languages, neededParts } from "./check-languages.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const source = readFileSync(`${ROOT}packages/config/src/languages.ts`, "utf8");
const exists = (path: string) => existsSync(`${ROOT}${path}`);

describe("check-languages", () => {
  it("passes on the repo as it is, with pl and en live", () => {
    expect(checkLanguages(source, exists)).toEqual([]);
    expect(languages(source).map((l) => `${l.code} ${l.status}`)).toEqual(["pl live", "en live"]);
    expect(neededParts(source).get("live")).toEqual([
      "copy",
      "checklist",
      "workflow",
      "number_words",
      "site",
    ]);
  });

  it("fails when pl loses its checklist file", () => {
    const withoutFile = (path: string) =>
      path !== "workflows/_lang/pl/checklist.md" && exists(path);
    expect(checkLanguages(source, withoutFile)).toEqual([
      "pl is live and its checklist is missing: workflows/_lang/pl/checklist.md",
    ]);
  });

  it("fails when a live language loses its copy table or its site", () => {
    const gone = (path: string) => path !== "packages/copy/messages/pl.json" && exists(path);
    expect(checkLanguages(source, gone)).toEqual([
      "pl is live and its copy is missing: packages/copy/messages/pl.json",
    ]);
    const noSite = source.replace('      site: "apps/site/src/content/pl",\n', "");
    expect(checkLanguages(noSite, exists)).toEqual(["pl is live and names no site"]);
  });

  it("needs no site in the studio, but does once the language goes live", () => {
    const noEnSite = (path: string) => path !== "apps/site/src/content/en" && exists(path);
    // en went live in dl-5ssh.34.70, so the studio case is planted.
    const live = source;
    const studio = source.replace(/(code: "en",[\s\S]*?)status: "live"/, '$1status: "studio"');
    expect(checkLanguages(studio, noEnSite)).toEqual([]);
    expect(checkLanguages(live, exists)).toEqual([]);
    expect(checkLanguages(live, noEnSite)).toEqual([
      "en is live and its site is missing: apps/site/src/content/en",
    ]);
  });

  it("refuses a pending part that names no issue, and an unknown status", () => {
    const vague = source.replace(
      'number_words: "packages/core/src/lang/pl/number-words.ts"',
      'number_words: { pending: "later" }',
    );
    expect(checkLanguages(vague, exists)).toContain(
      `pl's number_words is pending on "later", which is not an issue id`,
    );
    const odd = source.replace(/(code: "en",[\s\S]*?)status: "live"/, '$1status: "beta"');
    expect(checkLanguages(odd, exists)).toContain('en: unknown status "beta"');
  });

  it("passes when the contracts enum and the copy type list the same codes as the list", () => {
    const read = (path: string) => readFileSync(`${ROOT}${path}`, "utf8");
    expect(checkMirrors(source, read)).toEqual([]);
  });

  it("fails when a mirror lists a code the list does not, or loses its line", () => {
    const read = (path: string) => {
      const text = readFileSync(`${ROOT}${path}`, "utf8");
      return path === "packages/contracts/src/records.ts"
        ? text.replace('z.enum(["pl", "en"])', 'z.enum(["pl", "en", "de"])')
        : text.replace('export type Language = "pl" | "en";', "");
    };
    expect(checkMirrors(source, read)).toEqual([
      "packages/contracts/src/records.ts lists pl, en, de; packages/config/src/languages.ts lists pl, en",
      "packages/copy/src/types.ts: its language list is not found",
    ]);
  });

  it("fails when it can read no language", () => {
    expect(checkLanguages("export const LANGUAGES = [];", exists)).toContain(
      "packages/config/src/languages.ts: no languages found; has the LANGUAGES shape changed?",
    );
  });
});
