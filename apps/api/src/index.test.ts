import { describe, expect, it } from "vitest";
import { health } from "./index.ts";

describe("health", () => {
  it("says ok", () => {
    expect(health()).toEqual({ status: "ok" });
  });
});
