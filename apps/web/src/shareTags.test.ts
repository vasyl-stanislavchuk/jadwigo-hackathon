import { describe, expect, it } from "vitest";
import { shareTags } from "./shareTags.ts";

const content = (key: string): string | undefined =>
  shareTags().find((t) => t.attrs["property"] === key || t.attrs["name"] === key)?.attrs["content"];

describe("shareTags", () => {
  it("names Jadwigo and shows the app icon at its absolute address", () => {
    expect(content("og:title")).toBe("Jadwigo");
    expect(content("og:site_name")).toBe("Jadwigo");
    expect(content("og:image")).toBe("https://app.jadwigo.pl/icon-512.png");
    expect(content("twitter:image")).toBe("https://app.jadwigo.pl/icon-512.png");
    expect([content("og:image:width"), content("og:image:height")]).toEqual(["512", "512"]);
    expect(content("twitter:card")).toBe("summary");
  });

  it("says what it is in Polish, the page's language, from packages/copy", () => {
    const description = content("og:description");
    expect(description).toMatch(/klas 1–3/);
    expect(content("description")).toBe(description);
    expect(content("twitter:description")).toBe(description);
    expect(content("og:locale")).toBe("pl_PL");
  });

  it("goes into the head only", () => {
    expect(shareTags().every((t) => t.tag === "meta" && t.injectTo === "head")).toBe(true);
  });
});
