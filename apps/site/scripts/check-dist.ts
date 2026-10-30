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
  ["index.html", '<h1 class="logo">'],
  ["index.html", '<title id="jadwigo-title">Jadwigo</title>'],
  ["index.html", '<link rel="icon" href="/favicon.svg" type="image/svg+xml"'],
  ["favicon.svg", "<svg"],
  ["favicon-32.png", "PNG"],
  ["apple-touch-icon.png", "PNG"],
  ["index.html", "<p>Wkrótce</p>"],
  ["index.html", '<a href="https://app.jadwigo.pl/">Zagraj w lekcję</a>'],
  ["404.html", "Tej strony tu nie ma."],
  ["robots.txt", "Sitemap: https://jadwigo.pl/sitemap-index.xml"],
  ["sitemap-index.xml", "https://jadwigo.pl/sitemap-0.xml"],
  ["sitemap-0.xml", "<loc>https://jadwigo.pl/</loc>"],
  // The privacy pages (dl-w0b4.64). The deletion pages' URLs are in the Meta app's Settings Basic,
  // so their paths never move.
  ["prywatnosc/index.html", '<html lang="pl"'],
  ["prywatnosc/usuwanie-danych/index.html", "Usuwanie danych"],
  ["en/privacy/index.html", '<html lang="en"'],
  ["en/privacy/data-deletion/index.html", "Data deletion"],
  ["sitemap-0.xml", "<loc>https://jadwigo.pl/prywatnosc/usuwanie-danych/</loc>"],
  ["sitemap-0.xml", "<loc>https://jadwigo.pl/en/privacy/data-deletion/</loc>"],
] as const;

/** Text no uploaded page may carry: the placeholder for the address a parent writes to. */
const mustNot = [
  ["prywatnosc/usuwanie-danych/index.html", "CONTACT_EMAIL_TBD"],
  ["en/privacy/data-deletion/index.html", "CONTACT_EMAIL_TBD"],
] as const;

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
