// jadwigo.pl's language twins hold together in a built site (dl-w0b4.83). Every page names its twin
// in each language with hreflang, the twin exists and links back, x-default names the Polish page,
// and each page's <html lang> is its language: /en/* is English, the rest Polish. A 404 page has no
// twin, so it is skipped. A tree in one language (a prod dist before English is live) has nothing
// to pair, so it passes. Reads HTML as text: tools imports nothing of ours.
// Run: bun tools/src/check-hreflang.ts [dist-dir]   (default apps/site/dist-preview), or from
// apps/site: bun run check:hreflang [dist-dir]. CI wires it in dl-9t2o.6.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "pl";

interface Alternate {
  hreflang: string;
  path: string;
}

const attr = (tag: string, name: string): string | undefined =>
  new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

/** A page URL's path, origin dropped, with its trailing slash: `https://jadwigo.pl/en` is `/en/`. */
export function urlPath(href: string): string {
  const path = href.replace(/^https?:\/\/[^/]+/, "").replace(/[?#].*$/, "");
  return path.endsWith("/") ? path : `${path}/`;
}

/** A page's language, read from its <html lang>. */
export const htmlLang = (html: string): string | undefined =>
  /<html\b[^>]*\slang="([^"]+)"/.exec(html)?.[1];

/** Every hreflang alternate a page names. */
export function alternates(html: string): Alternate[] {
  return [...html.matchAll(/<link\b[^>]*>/g)].flatMap(([tag]) => {
    const hreflang = attr(tag, "hreflang");
    const href = attr(tag, "href");
    return attr(tag, "rel") === "alternate" && hreflang && href
      ? [{ hreflang, path: urlPath(href) }]
      : [];
  });
}

/** The language a path is served in: its first segment when that is a language here, else Polish. */
const pathLang = (path: string, languages: Set<string>): string => {
  const first = path.split("/")[1] ?? "";
  return first !== BASE && languages.has(first) ? first : BASE;
};

const isNotFound = (path: string): boolean => /(^|\/)404\/$/.test(path);

/** The problems in a built site, given each page's path (`/en/lessons/`) and its HTML. */
export function checkHreflang(pages: ReadonlyMap<string, string>): string[] {
  const problems: string[] = [];
  const served = [...pages].filter(([path]) => !isNotFound(path));
  // The languages here: every <html lang>, and every language a page's hreflang links name.
  const languages = new Set(
    served.flatMap(([, html]) => [
      htmlLang(html) ?? BASE,
      ...alternates(html)
        .map((a) => a.hreflang)
        .filter((l) => l !== "x-default"),
    ]),
  );
  for (const [path, html] of served) {
    const lang = htmlLang(html);
    const expected = pathLang(path, languages);
    if (lang !== expected) problems.push(`${path}: <html lang="${lang}">, expected "${expected}"`);
  }
  if (languages.size < 2) return problems;

  for (const [path, html] of served) {
    const lang = htmlLang(html) ?? "";
    const links = alternates(html);
    const named = new Map(links.map((a) => [a.hreflang, a.path]));
    if (links.length === 0) {
      problems.push(`${path}: no twin, it names no hreflang alternate`);
      continue;
    }
    if (named.get(lang) !== path) problems.push(`${path}: no hreflang="${lang}" naming itself`);
    for (const other of languages) {
      const twin = named.get(other);
      if (other === lang) continue;
      if (!twin) {
        problems.push(`${path}: no twin in ${other}`);
        continue;
      }
      const twinHtml = pages.get(twin);
      if (twinHtml === undefined) {
        problems.push(`${path}: its ${other} twin ${twin} is not in the build`);
        continue;
      }
      const back = new Map(alternates(twinHtml).map((a) => [a.hreflang, a.path]));
      if (back.get(lang) !== path)
        problems.push(`${path}: its ${other} twin ${twin} does not link back`);
    }
    const polish = lang === BASE ? path : named.get(BASE);
    if (!named.has("x-default")) problems.push(`${path}: no x-default`);
    else if (named.get("x-default") !== polish) {
      problems.push(
        `${path}: x-default is ${named.get("x-default")}, not the Polish page ${polish}`,
      );
    }
  }
  return problems;
}

/** Every HTML page under a built site, by its path. */
export function readSite(dir: string): Map<string, string> {
  const pages = new Map<string, string>();
  for (const file of readdirSync(dir, { recursive: true, encoding: "utf8" })) {
    if (!file.endsWith(".html")) continue;
    const rel = relative(dir, join(dir, file)).replaceAll("\\", "/");
    const path = `/${rel.replace(/(^|\/)index\.html$/, "").replace(/\.html$/, "/")}`;
    pages.set(path.endsWith("/") ? path : `${path}/`, readFileSync(join(dir, file), "utf8"));
  }
  return pages;
}

if (import.meta.main) {
  const dir =
    process.argv[2] ?? fileURLToPath(new URL("../../apps/site/dist-preview", import.meta.url));
  const pages = readSite(dir);
  const problems = checkHreflang(pages);
  if (problems.length > 0) {
    console.error(`check-hreflang: ${problems.length} problem(s) in ${dir}`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-hreflang: ${pages.size} pages in ${dir}, every twin linked both ways`);
}
