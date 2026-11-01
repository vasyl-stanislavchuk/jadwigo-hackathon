import { describe, expect, it } from "vitest";
import { alternatesIn, pageFile, sitemapLinks } from "./alternates.ts";
import { headTags, type Page, xDefaultTag } from "./seo.ts";

const page: Page = { title: "Lekcje", description: "Lekcje", heading: "Lekcje", reviewed: true };

describe("xDefaultTag", () => {
  it("names the Polish page as x-default, from either twin", () => {
    expect(xDefaultTag({ ...page, translation: "/en/lessons" }, "/lekcje")).toEqual([
      { kind: "link", rel: "alternate", href: "https://jadwigo.pl/lekcje/", hreflang: "x-default" },
    ]);
    expect(xDefaultTag({ ...page, lang: "en", translation: "/lekcje" }, "/en/lessons")).toEqual([
      { kind: "link", rel: "alternate", href: "https://jadwigo.pl/lekcje/", hreflang: "x-default" },
    ]);
  });

  it("adds nothing to a page with no twin", () => {
    expect(xDefaultTag(page, "/lekcje")).toEqual([]);
  });

  it("goes with og:locale:alternate in headTags", () => {
    const tags = headTags({ ...page, translation: "/en/lessons" }, "/lekcje");
    expect(tags).toContainEqual({
      kind: "property",
      property: "og:locale:alternate",
      content: "en_US",
    });
  });
});

describe("alternatesIn", () => {
  it("reads every hreflang link, whatever the attribute order, and nothing else", () => {
    const html = `<link rel="canonical" href="https://jadwigo.pl/lekcje/">
      <link rel="alternate" href="https://jadwigo.pl/lekcje/" hreflang="pl">
      <link hreflang="en" rel="alternate" href="https://jadwigo.pl/en/lessons/">
      <link rel="icon" href="/favicon.svg">`;
    expect(alternatesIn(html)).toEqual([
      { hreflang: "pl", href: "https://jadwigo.pl/lekcje/" },
      { hreflang: "en", href: "https://jadwigo.pl/en/lessons/" },
    ]);
    expect(sitemapLinks(alternatesIn(html))[1]).toEqual({
      lang: "en",
      url: "https://jadwigo.pl/en/lessons/",
    });
  });
});

describe("pageFile", () => {
  it("finds a page's file under dist", () => {
    expect(pageFile("")).toEqual(["index.html"]);
    expect(pageFile("en/lessons/")).toEqual(["en/lessons/index.html", "en/lessons.html"]);
  });
});
