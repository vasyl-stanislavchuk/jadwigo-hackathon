import { createHash } from "node:crypto";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "./sha256.ts";

describe("sha256Hex", () => {
  it("gives FIPS 180-4's digests for the empty string and abc", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });

  it("agrees with node's crypto on any text, Polish letters and multi-block lengths included", () => {
    fc.assert(
      fc.property(fc.string({ unit: "grapheme", maxLength: 300 }), (text) => {
        expect(sha256Hex(text)).toBe(createHash("sha256").update(text, "utf8").digest("hex"));
      }),
    );
    expect(sha256Hex("zażółć gęślą jaźń")).toBe(
      createHash("sha256").update("zażółć gęślą jaźń", "utf8").digest("hex"),
    );
  });
});
