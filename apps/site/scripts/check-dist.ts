// Run before every upload (make -C infra site-deploy): the built site carries what search engines
// and link previews read, or nothing is synced to the bucket.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { type DistCheck, parsePathPage, pathPageChecks } from "../src/lib/dist.ts";

const dist = new URL("../dist/", import.meta.url);
const landing: readonly DistCheck[] = [
  ["index.html", '<html lang="pl"'],
  ["index.html", '<link rel="canonical" href="https://jadwigo.pl/"'],
  ["index.html", 'property="og:title"'],
  ["index.html", 'name="twitter:card"'],
  ["index.html", '<script type="application/ld+json">'],
  ["index.html", '<a class="logo" href="/"'],
  ["index.html", '<h1 id="hero-title"'],
  ["index.html", '<title id="jadwigo-title">Jadwigo</title>'],
  ["index.html", '<link rel="icon" href="/favicon.svg" type="image/svg+xml"'],
  ["favicon.svg", "<svg"],
  ["favicon-32.png", "PNG"],
  ["apple-touch-icon.png", "PNG"],
  ["index.html", '<a class="btn" href="/praca-domowa/"'],
  ["index.html", 'id="lekcje"'],
  ["index.html", 'href="https://app.jadwigo.pl/play/asg_'],
  // Each header link is its own page, built and in the sitemap (owner, 2026-10-31).
  ...["lekcje", "jak-to-dziala", "porownanie", "o-nas"].flatMap((p): DistCheck[] => [
    ["index.html", `href="/${p}/"`],
    [`${p}/index.html`, "<h1"],
    ["sitemap-0.xml", `<loc>https://jadwigo.pl/${p}/</loc>`],
  ]),
  ["lekcje/index.html", 'href="https://app.jadwigo.pl/play/asg_'],
  ["porownanie/index.html", "Khan Academy"],
  ["zaloguj/index.html", '<form action="https://app.jadwigo.pl/parent" method="get"'],
  ["zaloguj/index.html", 'href="https://app.jadwigo.pl/parent?provider=google"'],
  ["zaloguj/index.html", 'href="https://app.jadwigo.pl/parent?provider=facebook"'],
  ["index.html", 'href="/zaloguj/"'],
  ["sitemap-0.xml", "<loc>https://jadwigo.pl/zaloguj/</loc>"],
  ["404.html", "Tej strony tu nie ma."],
  ["robots.txt", "Sitemap: https://jadwigo.pl/sitemap-index.xml"],
  ["sitemap-index.xml", "https://jadwigo.pl/sitemap-0.xml"],
  ["sitemap-0.xml", "<loc>https://jadwigo.pl/</loc>"],
];

// The pages with their own `path`, the privacy pages today (dl-w0b4.64): each is required once its
// source says reviewed: true, and none may carry the contact placeholder. The deletion pages' URLs
// are in the Meta app's Settings Basic, so their paths never move.
const content = new URL("../src/content/", import.meta.url);
const sources = readdirSync(content, { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".md"))
  .flatMap((f) => parsePathPage(readFileSync(new URL(f, content), "utf8")) ?? []);
const paged = pathPageChecks(sources);
const must: readonly DistCheck[] = [...landing, ...paged.must];
const mustNot = paged.mustNot;

const missing = must.filter(([file, text]) => {
  const path = new URL(file, dist);
  return !existsSync(path) || !readFileSync(path, "utf8").includes(text);
});
const present = mustNot.filter(([file, text]) => {
  const path = new URL(file, dist);
  return existsSync(path) && readFileSync(path, "utf8").includes(text);
});
for (const [file, text] of missing) console.error(`dist/${file} lacks ${text}`);
for (const [file, text] of present) console.error(`dist/${file} still carries ${text}`);
if (missing.length > 0 || present.length > 0) process.exit(1);
console.warn(`dist/ carries all ${must.length} checks and none of ${mustNot.length} placeholders`);
