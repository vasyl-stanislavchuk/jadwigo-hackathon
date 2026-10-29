import { describe, expect, it } from "vitest";
import { apiBase, SIDEBAR, servedHost, sidebar } from "./index.ts";

describe("servedHost", () => {
  it("is the docs host in prod", () => {
    expect(servedHost).toBe("docs.jadwigo.pl");
  });
});

describe("apiBase", () => {
  it("is the app's host, which serves the API", () => {
    expect(apiBase).toBe("https://app.jadwigo.pl");
  });
});

describe("SIDEBAR", () => {
  it("lists the guides first and every slug once", () => {
    expect(SIDEBAR[0]?.label).toBe("Guides");
    const slugs = SIDEBAR.flatMap((group) => group.items);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("becomes Starlight's sidebar option group for group", () => {
    expect(sidebar.map((group) => group.label)).toEqual(SIDEBAR.map((group) => group.label));
    expect(sidebar[0]?.items[0]).toEqual({ slug: "guides/introduction" });
  });
});
