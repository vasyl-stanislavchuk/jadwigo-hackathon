import { describe, expect, it } from "vitest";
import type { ConvertedItem } from "./items.ts";
import { keyFindings } from "./keys.ts";
import { PLANTED } from "./planted.ts";
import { compileStrictly } from "./strict.ts";

/** What the page finds on an item before drawing it: the strict compile, then the key. */
function before(item: ConvertedItem) {
  const { question, findings } = compileStrictly(item);
  return question === null ? findings : keyFindings(item.id, question);
}

describe("the checks before an item is drawn", () => {
  it("finds nothing on the ready item", () => {
    expect(compileStrictly(PLANTED.ready).findings).toEqual([]);
    expect(before(PLANTED.ready)).toEqual([]);
  });

  it("finds a key whose own answer does not grade, and names the converter", () => {
    const found = before(PLANTED.key);
    expect(found.map((f) => [f.rule, f.level, f.path])).toEqual([
      ["key-grades", "error", "spec.key"],
    ]);
    expect(found[0]?.text).toContain("choose key");
    expect(found[0]?.text).toContain('"o9"');
    expect(found[0]?.fix).toContain("converter");
  });

  it("finds a field the contract would drop, at its path", () => {
    const found = before(PLANTED.loose);
    expect(found.map((f) => [f.rule, f.path])).toEqual([["unknown-field", "spec.data.colour"]]);
    expect(found[0]?.fix).toContain("converter");
  });

  it("finds data the contract refuses, and a question type of another family", () => {
    const bad = { ...PLANTED.ready, spec: { ...PLANTED.ready.spec, data: { options: "none" } } };
    expect(new Set(before(bad).map((f) => f.rule))).toEqual(new Set(["contract"]));
    const other = {
      ...PLANTED.ready,
      spec: { ...PLANTED.ready.spec, question_type: "production" },
    };
    expect(before(other).map((f) => [f.rule, f.path, f.text])).toEqual([
      ["question-type-family", "spec.family", "production is a enter question, not choose."],
    ]);
  });

  it("checks help less its twin, then the twin as a question of its own, as the import does", () => {
    const twin = {
      say: "Wybierz.",
      family: "choose",
      data: PLANTED.ready.spec.data,
      key: { correct: ["o2"] },
    };
    const withHelp = {
      ...PLANTED.ready,
      spec: { ...PLANTED.ready.spec, help: { look: { text: "Policz." }, twin } },
    };
    expect(before(withHelp)).toEqual([]);
    const badTwin = {
      ...PLANTED.ready,
      spec: { ...PLANTED.ready.spec, help: { twin: { ...twin, extra: 1 } } },
    };
    expect(before(badTwin).map((f) => [f.rule, f.path])).toEqual([
      ["unknown-field", "spec.help.twin.extra"],
    ]);
    const loose = { ...PLANTED.ready, spec: { ...PLANTED.ready.spec, help: { nope: 1 } } };
    expect(before(loose).map((f) => f.path)).toEqual(["spec.help.nope"]);
  });

  it("leaves the picture, TeX and not-checked items to the page and to jw", () => {
    expect(before(PLANTED.picture)).toEqual([]);
    expect(before(PLANTED.tex)).toEqual([]);
    expect(before(PLANTED.unchecked)).toEqual([]);
  });
});
