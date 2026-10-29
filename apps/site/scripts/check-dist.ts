// Run before every upload (make -C infra site-deploy): the built site carries what search engines
// and link previews read, or nothing is synced to the bucket.
import { existsSync, readFileSync } from "node:fs";

const dist = new URL("../dist/", import.meta.url);
const must = [
  ["index.html", '<html lang="pl"'],
  ["index.html", '<link rel="canonical" href="https://jadwigo.pl/"'],
  ["index.html", 'property="og:title"'],
  ["index.html", 'name="twitter:card"'],
  ["index.html", '<script type="application/ld+json">'],
  ["index.html", "<h1>Jadwigo</h1>"],
  ["index.html", "<p>Wkrótce</p>"],
  ["index.html", '<a href="https://app.jadwigo.pl/">Zagraj w lekcję</a>'],
  ["404.html", "Tej strony tu nie ma."],
  ["robots.txt", "Sitemap: https://jadwigo.pl/sitemap-index.xml"],
  ["sitemap-index.xml", "https://jadwigo.pl/sitemap-0.xml"],
  ["sitemap-0.xml", "<loc>https://jadwigo.pl/</loc>"],
] as const;

const missing = must.filter(([file, text]) => {
  const path = new URL(file, dist);
  return !existsSync(path) || !readFileSync(path, "utf8").includes(text);
});
for (const [file, text] of missing) console.error(`dist/${file} lacks ${text}`);
if (missing.length > 0) process.exit(1);
console.warn(`dist/ carries all ${must.length} checks`);
