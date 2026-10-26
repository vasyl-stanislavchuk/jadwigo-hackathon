import { describe, expect, it } from "vitest";
import { apiUrl } from "./index.ts";

describe("apiUrl", () => {
  it("joins with exactly one slash", () => {
    expect(apiUrl("https://api.example/", "/v1/lessons")).toBe("https://api.example/v1/lessons");
    expect(apiUrl("https://api.example", "v1/lessons")).toBe("https://api.example/v1/lessons");
  });
});
