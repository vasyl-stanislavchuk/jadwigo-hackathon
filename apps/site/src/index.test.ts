import { describe, expect, it } from "vitest";
import { servedHost } from "./index.ts";

describe("servedHost", () => {
  it("is a jadwigo host", () => {
    expect(servedHost).toMatch(/jadwigo\.pl$/);
  });
});
