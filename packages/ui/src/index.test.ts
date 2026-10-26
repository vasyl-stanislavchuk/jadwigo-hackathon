import { describe, expect, it } from "vitest";
import { tokens } from "./index.ts";

describe("tokens", () => {
  it("are six-digit hex colours", () => {
    for (const value of Object.values(tokens)) expect(value).toMatch(/^#[0-9a-f]{6}$/);
  });
});
