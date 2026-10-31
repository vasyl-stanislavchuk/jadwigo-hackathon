import { describe, expect, it } from "vitest";
import {
  assertReviewed,
  canonical,
  headTags,
  jsonLd,
  type Page,
  pageSchema,
  robotsTxt,
} from "./seo.ts";

const page: Page = {
  title: "Jadwigo",
  description: "Jadwigo, wkrótce",
  heading: "Jadwigo",
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

  it("carries the crown favicon: the SVG, a 32 px PNG and the apple-touch-icon", () => {
    const tags = headTags(page, "/");
    expect(tags.filter((t) => t.kind === "link" && t.rel === "icon")).toEqual([
      { kind: "link", rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { kind: "link", rel: "icon", href: "/favicon-32.png", type: "image/png", sizes: "32x32" },
    ]);
    expect(find(tags, "apple-touch-icon")).toMatchObject({ href: "/apple-touch-icon.png" });
  });

  it("names the page's language in og:locale, Polish when left out", () => {
    expect(find(headTags({ ...page, lang: "en" }, "/en/privacy"), "og:locale")).toMatchObject({
      content: "en_GB",
    });
  });

  it("links the page's translation as an hreflang alternate, both ways", () => {
    expect(find(headTags(page, "/"), "alternate")).toBeUndefined();
    const tags = headTags({ ...page, translation: "/en/privacy" }, "/prywatnosc");
    expect(tags.filter((t) => t.kind === "link" && t.rel === "alternate")).toEqual([
      { kind: "link", rel: "alternate", href: "https://jadwigo.pl/prywatnosc/", hreflang: "pl" },
      { kind: "link", rel: "alternate", href: "https://jadwigo.pl/en/privacy/", hreflang: "en" },
    ]);
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

describe("pageSchema", () => {
  it("takes a stable path of lowercase segments, and refuses a trailing slash or a capital", () => {
    expect(pageSchema.safeParse({ ...page, path: "/prywatnosc/usuwanie-danych" }).success).toBe(
      true,
    );
    expect(pageSchema.safeParse({ ...page, path: "/prywatnosc/" }).success).toBe(false);
    expect(pageSchema.safeParse({ ...page, path: "/Privacy" }).success).toBe(false);
  });
});

describe("robotsTxt", () => {
  it("points at the sitemap on the apex", () => {
    expect(robotsTxt()).toContain("Sitemap: https://jadwigo.pl/sitemap-index.xml");
  });
});
