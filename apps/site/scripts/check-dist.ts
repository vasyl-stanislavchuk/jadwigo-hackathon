// Run before every upload (make -C infra site-deploy): the built site carries what search engines
// and link previews read, or nothing is synced to the bucket.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { type DistCheck, parsePathPage, pathPageChecks } from "../src/lib/dist.ts";

const dist = new URL("../dist/", import.meta.url);
const landing = [
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
  ["index.html", '<a class="btn" href="https://app.jadwigo.pl/parent"'],
  ["index.html", '<a class="btn quiet" href="https://app.jadwigo.pl/"'],
  ["index.html", 'href="https://app.jadwigo.pl/play/asg_'],
  ["index.html", 'id="jak-to-dziala"'],
  ["index.html", 'id="lekcje"'],
  ["index.html", 'id="porownanie"'],
  ["index.html", '"@type":"FAQPage"'],
  ["index.html", '<img src="/cast.webp"'],
  ["cast.webp", "WEBP"],
  ["404.html", "Tej strony tu nie ma."],
  ["robots.txt", "Sitemap: https://jadwigo.pl/sitemap-index.xml"],
  ["sitemap-index.xml", "https://jadwigo.pl/sitemap-0.xml"],
  ["sitemap-0.xml", "<loc>https://jadwigo.pl/</loc>"],
] as const;

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
