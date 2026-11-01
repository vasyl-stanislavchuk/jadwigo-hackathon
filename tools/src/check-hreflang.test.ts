import { describe, expect, it } from "vitest";
import { alternates, checkHreflang, urlPath } from "./check-hreflang.ts";

const page = (lang: string, links: Record<string, string>): string =>
  `<!doctype html><html lang="${lang}"><head>${Object.entries(links)
    .map(
      ([hreflang, path]) =>
        `<link rel="alternate" href="https://jadwigo.pl${path}" hreflang="${hreflang}">`,
    )
    .join("")}</head></html>`;

const pair = { pl: "/lekcje/", en: "/en/lessons/", "x-default": "/lekcje/" };
const good = (): Map<string, string> =>
  new Map([
    ["/lekcje/", page("pl", pair)],
    ["/en/lessons/", page("en", pair)],
    ["/404/", page("pl", {})],
  ]);

describe("check-hreflang", () => {
  it("passes on twins that link both ways, with x-default on the Polish page", () => {
    expect(checkHreflang(good())).toEqual([]);
  });

  it("passes on a tree in one language, as a prod dist is before English is live", () => {
    expect(checkHreflang(new Map([["/lekcje/", page("pl", {})]]))).toEqual([]);
  });

  it("fails on a page with no twin", () => {
    const site = good();
    site.set("/en/compare/", page("en", {}));
    expect(checkHreflang(site)).toEqual(["/en/compare/: no twin, it names no hreflang alternate"]);
  });

  it("fails on a one-way link", () => {
    const site = good();
    site.set(
      "/en/lessons/",
      page("en", { en: "/en/lessons/", pl: "/porownanie/", "x-default": "/porownanie/" }),
    );
    site.set("/porownanie/", page("pl", { pl: "/porownanie/", "x-default": "/porownanie/" }));
    expect(checkHreflang(site)).toEqual(
      expect.arrayContaining([
        "/lekcje/: its en twin /en/lessons/ does not link back",
        "/en/lessons/: its pl twin /porownanie/ does not link back",
      ]),
    );
  });

  it("fails on a twin that is not in the build, and on a missing x-default", () => {
    const site = good();
    site.set("/lekcje/", page("pl", { pl: "/lekcje/", en: "/en/gone/" }));
    expect(checkHreflang(site)).toEqual(
      expect.arrayContaining([
        "/lekcje/: its en twin /en/gone/ is not in the build",
        "/lekcje/: no x-default",
      ]),
    );
  });

  it("fails on an English page whose <html lang> is not en", () => {
    const site = good();
    site.set("/en/lessons/", page("pl", pair));
    expect(checkHreflang(site)).toContain('/en/lessons/: <html lang="pl">, expected "en"');
  });
});

describe("urlPath and alternates", () => {
  it("reads a link's path with its trailing slash, origin dropped", () => {
    expect(urlPath("https://jadwigo.pl/en")).toBe("/en/");
    expect(alternates(page("pl", { pl: "/" }))).toEqual([{ hreflang: "pl", path: "/" }]);
  });
});
