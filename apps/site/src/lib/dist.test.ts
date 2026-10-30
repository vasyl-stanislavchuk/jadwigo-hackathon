import { describe, expect, it } from "vitest";
import { contactPlaceholder, parsePathPage, pathPageChecks } from "./dist.ts";
import { assertReviewed, type Page, servedPathPages } from "./seo.ts";

const landing = {
  id: "pl/index",
  data: { title: "Jadwigo", description: "Jadwigo", heading: "Jadwigo", reviewed: true } as Page,
};
const draft = {
  id: "pl/usuwanie-danych",
  data: {
    ...landing.data,
    heading: "Usuwanie danych",
    path: "/prywatnosc/usuwanie-danych",
    reviewed: false,
  },
};

describe("an unreviewed path page", () => {
  it("is left out of a prod build, named in the log, and the build goes on", () => {
    const lines: string[] = [];
    expect(servedPathPages([landing, draft], true, (l) => lines.push(l))).toEqual([]);
    expect(lines).toEqual([
      "Not reviewed, so left out of the prod build: pl/usuwanie-danych (/prywatnosc/usuwanie-danych/)",
    ]);
    expect(() => assertReviewed([landing, draft], true)).not.toThrow();
  });

  it("is still shown in a dev build", () => {
    expect(servedPathPages([landing, draft], false, () => {})).toEqual([draft]);
  });

  it("asks nothing of dist/ but the missing placeholder", () => {
    const source = {
      path: "/prywatnosc/usuwanie-danych",
      heading: "Usuwanie danych",
      lang: "pl" as const,
      reviewed: false,
    };
    expect(pathPageChecks([source])).toEqual({
      must: [],
      mustNot: [["prywatnosc/usuwanie-danych/index.html", contactPlaceholder]],
    });
  });
});

describe("a reviewed path page", () => {
  it("is built in prod", () => {
    const reviewed = { ...draft, data: { ...draft.data, reviewed: true } };
    expect(servedPathPages([landing, reviewed], true, () => {})).toEqual([reviewed]);
  });

  it("is required in dist/: its file, its language, its heading and its sitemap entry", () => {
    const source = {
      path: "/en/privacy/data-deletion",
      heading: "Data deletion",
      lang: "en" as const,
      reviewed: true,
    };
    expect(pathPageChecks([source]).must).toEqual([
      ["en/privacy/data-deletion/index.html", '<html lang="en"'],
      ["en/privacy/data-deletion/index.html", "<h1>Data deletion</h1>"],
      ["sitemap-0.xml", "<loc>https://jadwigo.pl/en/privacy/data-deletion/</loc>"],
    ]);
  });
});

describe("the landing page's own gate", () => {
  it("still stops a prod build when it is not reviewed", () => {
    const unreviewed = { ...landing, data: { ...landing.data, reviewed: false } };
    expect(() => assertReviewed([unreviewed, draft], true)).toThrow(/pl\/index/);
  });
});

describe("parsePathPage", () => {
  it("reads path, heading, lang and reviewed from the frontmatter", () => {
    const md =
      "---\ntitle: X\nheading: Privacy\nlang: en\npath: /en/privacy\nreviewed: false\n---\n\nBody\n";
    expect(parsePathPage(md)).toEqual({
      path: "/en/privacy",
      heading: "Privacy",
      lang: "en",
      reviewed: false,
    });
  });

  it("is null for a page with no path, such as the landing page", () => {
    expect(
      parsePathPage("---\ntitle: Jadwigo\nheading: Jadwigo\nreviewed: true\n---\n\nWkrótce\n"),
    ).toBeNull();
  });
});
