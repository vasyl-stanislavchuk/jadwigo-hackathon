import { describe, expect, it } from "vitest";
import { appUrl, parentUrl, providerUrl, servedHost } from "./index.ts";

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

describe("providerUrl", () => {
  it("hands a provider over to the app's sign-in", () => {
    expect(providerUrl("google")).toBe("https://app.jadwigo.pl/parent?provider=google");
    expect(providerUrl("facebook")).toBe("https://app.jadwigo.pl/parent?provider=facebook");
  });
});
