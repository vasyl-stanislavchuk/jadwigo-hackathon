import { describe, expect, it } from "vitest";
import { appUrl, parentUrl, servedHost } from "./index.ts";

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

describe("parentUrl", () => {
  it("is the parent's sign-in on the app", () => {
    expect(parentUrl).toBe("https://app.jadwigo.pl/parent");
  });
});
