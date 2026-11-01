import { describe, expect, it } from "vitest";
import { mergePatch } from "./merge-patch.ts";

describe("mergePatch, RFC 7386", () => {
  // The RFC's own examples, Appendix A.
  it.each([
    [{ a: "b" }, { a: "c" }, { a: "c" }],
    [{ a: "b" }, { b: "c" }, { a: "b", b: "c" }],
    [{ a: "b" }, { a: null }, {}],
    [{ a: "b", b: "c" }, { a: null }, { b: "c" }],
    [{ a: ["b"] }, { a: "c" }, { a: "c" }],
    [{ a: "c" }, { a: ["b"] }, { a: ["b"] }],
    [{ a: { b: "c" } }, { a: { b: "d", c: null } }, { a: { b: "d" } }],
    [{ a: [{ b: "c" }] }, { a: [1] }, { a: [1] }],
    [
      ["a", "b"],
      ["c", "d"],
      ["c", "d"],
    ],
    [{ a: "b" }, ["c"], ["c"]],
    [{ a: "foo" }, null, null],
    [{ a: "foo" }, "bar", "bar"],
    [{ e: null }, { a: 1 }, { e: null, a: 1 }],
    [[1, 2], { a: "b", c: null }, { a: "b" }],
    [{}, { a: { bb: { ccc: null } } }, { a: { bb: {} } }],
  ])("patches %j with %j into %j", (target, patch, result) => {
    expect(mergePatch(target, patch)).toEqual(result);
  });

  it("leaves the target as it was", () => {
    const target = { title: { en: "Halves" }, parts: [1] };
    const before = structuredClone(target);
    mergePatch(target, { title: { en: "Quarters" }, parts: null });
    expect(target).toEqual(before);
  });
});
