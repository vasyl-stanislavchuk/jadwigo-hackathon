import { describe, expect, it } from "vitest";
import { findBank, SIZE_CAP_BYTES } from "./check-no-bank.ts";

describe("findBank", () => {
  it("catches every kind of bank file and passes ordinary code", () => {
    const planted = [
      "data/bank.sqlite",
      "packages/bank/questions/q-001.json",
      "data/khan-items/x.json",
      "packages/bank/media/cat.png",
      "docs/huge.pdf",
    ];
    const sizes: Record<string, number> = { "docs/huge.pdf": SIZE_CAP_BYTES + 1 };
    const findings = findBank([...planted, "packages/bank/src/index.ts"], (p) => sizes[p] ?? 10);
    expect(findings.map((f) => f.path)).toEqual(planted);
  });
});
