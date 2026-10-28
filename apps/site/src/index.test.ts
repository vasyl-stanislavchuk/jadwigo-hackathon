import { describe, expect, it } from "vitest";
import { appUrl, servedHost } from "./index.ts";

describe("servedHost", () => {
  it("is a jadwigo host", () => {
    expect(servedHost).toMatch(/jadwigo\.pl$/);
  });
});

describe("appUrl", () => {
  it("is the app's front page in prod", () => {
    expect(appUrl).toBe("https://app.jadwigo.pl/");
  });
});
