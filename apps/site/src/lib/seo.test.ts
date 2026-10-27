import { describe, expect, it } from "vitest";
import { assertReviewed, canonical, headTags, jsonLd, type Page, robotsTxt } from "./seo.ts";

const page: Page = {
  title: "Jadwigo",
  description: "Jadwigo. Wkrótce.",
  heading: "Jadwigo.",
  reviewed: true,
};

const find = (tags: ReturnType<typeof headTags>, key: string) =>
  tags.find(
    (t) =>
      (t.kind === "meta" && t.name === key) ||
      (t.kind === "property" && t.property === key) ||
      (t.kind === "link" && t.rel === key),
  );

describe("canonical", () => {
  it("is on the apex over https, with one trailing slash", () => {
    expect(canonical("/")).toBe("https://jadwigo.pl/");
    expect(canonical("jak-to-dziala")).toBe("https://jadwigo.pl/jak-to-dziala/");
    expect(canonical("/jak-to-dziala/")).toBe("https://jadwigo.pl/jak-to-dziala/");
  });
});

describe("headTags", () => {
  it("carries the description, the canonical, Open Graph and Twitter cards", () => {
    const tags = headTags(page, "/");
    for (const key of [
      "description",
      "canonical",
      "og:type",
      "og:site_name",
      "og:locale",
      "og:title",
      "og:description",
      "og:url",
      "twitter:card",
      "twitter:title",
      "twitter:description",
    ]) {
      expect(find(tags, key), key).toBeDefined();
    }
    expect(find(tags, "canonical")).toEqual({
      kind: "link",
      rel: "canonical",
      href: "https://jadwigo.pl/",
    });
    expect(find(tags, "og:locale")).toMatchObject({ content: "pl_PL" });
  });

  it("adds the image and the large card only when the page names one", () => {
    expect(find(headTags(page, "/"), "og:image")).toBeUndefined();
    const tags = headTags({ ...page, ogImage: "/og.png" }, "/");
    expect(find(tags, "og:image")).toMatchObject({ content: "https://jadwigo.pl/og.png" });
    expect(find(tags, "twitter:card")).toMatchObject({ content: "summary_large_image" });
  });
});

describe("jsonLd", () => {
  it("names the organisation and the Polish website on the apex", () => {
    const graph = jsonLd()["@graph"] as { "@type": string; url: string; inLanguage?: string }[];
    expect(graph.map((n) => n["@type"])).toEqual(["Organization", "WebSite"]);
    expect(graph.every((n) => n.url === "https://jadwigo.pl/")).toBe(true);
    expect(graph[1]?.inLanguage).toBe("pl");
  });
});

describe("assertReviewed", () => {
  const draft = { id: "jak-to-dziala", data: { ...page, reviewed: false } };

  it("stops a prod build on a page not yet reviewed", () => {
    expect(() => assertReviewed([draft], true)).toThrow(/jak-to-dziala/);
  });

  it("lets a dev build show the draft", () => {
    expect(() => assertReviewed([draft], false)).not.toThrow();
  });
});

describe("robotsTxt", () => {
  it("points at the sitemap on the apex", () => {
    expect(robotsTxt()).toContain("Sitemap: https://jadwigo.pl/sitemap-index.xml");
  });
});
