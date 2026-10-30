// The crown favicon on every service (dl-uukj.32.28, decision jadwigo-marketing/decisions/2026-10-30-
// jadwigo-wears-lockup-4a-an-andika-wordmark-with-a-crown-tipped-o). The sources are the SVGs in
// packages/ui/src/brand; each app's public/ carries a copy of favicon.svg and the PNGs rendered
// from them, and icons.json beside the sources holds the hashes of the SVGs they were rendered from.
// The check fails when a file is missing or a source changed since the PNGs were rendered. The files
// are read as files: tools imports nothing of ours.
// Run: bun tools/src/brand-icons.ts (check), bun tools/src/brand-icons.ts --write (render, needs Chromium)
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BRAND = "packages/ui/src/brand";
const STAMP = join(BRAND, "icons.json");

/** Each PNG: its file name, its size in px, and the SVG it is drawn from. */
export const ICONS: ReadonlyArray<{ file: string; px: number; from: string; square?: true }> = [
  { file: "favicon-16.png", px: 16, from: "favicon-16.svg" },
  { file: "favicon-32.png", px: 32, from: "favicon.svg" },
  { file: "favicon-48.png", px: 48, from: "favicon.svg" },
  // iOS rounds the corners itself and paints a transparent corner black, so this one is square.
  { file: "apple-touch-icon.png", px: 180, from: "favicon.svg", square: true },
  { file: "icon-192.png", px: 192, from: "favicon.svg" },
  { file: "icon-512.png", px: 512, from: "favicon.svg" },
];

/** Each app's public/ folder that serves the icons. */
export const TARGETS: readonly string[] = ["apps/web/public", "apps/site/public"];

const SOURCES = [...new Set(ICONS.map((i) => i.from))].sort();

export const sha256 = (text: string): string => createHash("sha256").update(text).digest("hex");

/** The stamp a target carries: each source SVG's hash when its PNGs were rendered. */
export function stamp(read: (path: string) => string): Record<string, string> {
  return Object.fromEntries(SOURCES.map((s) => [s, sha256(read(join(BRAND, s)))]));
}

/** Every problem with the icons in every target; an empty list passes. */
export function checkBrandIcons(
  read: (path: string) => string | undefined,
  targets: readonly string[] = TARGETS,
): string[] {
  const problems: string[] = [];
  const source = read(join(BRAND, "favicon.svg"));
  if (source === undefined) return [`${BRAND}/favicon.svg is missing`];
  const want = stamp((p) => read(p) ?? "");
  for (const dir of targets) {
    for (const file of ["favicon.svg", ...ICONS.map((i) => i.file)]) {
      if (read(join(dir, file)) === undefined) problems.push(`${dir}/${file} is missing`);
    }
    const copy = read(join(dir, "favicon.svg"));
    if (copy !== undefined && copy !== source)
      problems.push(`${dir}/favicon.svg differs from ${BRAND}/favicon.svg`);
  }
  const got = JSON.parse(read(STAMP) ?? "{}") as Record<string, string>;
  for (const [svg, hash] of Object.entries(want)) {
    if (got[svg] !== hash) problems.push(`the PNGs predate ${BRAND}/${svg}`);
  }
  return problems;
}

async function write(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const pngs = new Map<string, Buffer>();
  for (const { file, px, from, square } of ICONS) {
    let svg = readFileSync(join(BRAND, from), "utf8").replace(/ width="\d+" height="\d+"/, "");
    if (square) svg = svg.replace(/ rx="\d+"/, "");
    await page.setViewportSize({ width: px, height: px });
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${px}px;height:${px}px}</style>${svg}`,
    );
    pngs.set(file, await page.screenshot({ omitBackground: true }));
  }
  await browser.close();
  const hashes = `${JSON.stringify(
    stamp((p) => readFileSync(p, "utf8")),
    null,
    2,
  )}\n`;
  for (const dir of TARGETS) {
    mkdirSync(dir, { recursive: true });
    copyFileSync(join(BRAND, "favicon.svg"), join(dir, "favicon.svg"));
    for (const [file, png] of pngs) writeFileSync(join(dir, file), png);
    console.log(`brand-icons: wrote ${dir}`);
  }
  writeFileSync(STAMP, hashes);
}

if (import.meta.main) {
  if (process.argv.includes("--write")) await write();
  const problems = checkBrandIcons((p) => (existsSync(p) ? readFileSync(p, "utf8") : undefined));
  for (const p of problems) console.error(`brand-icons: ${p}`);
  if (problems.length > 0) {
    console.error("brand-icons: render them again with bun tools/src/brand-icons.ts --write.");
    process.exit(1);
  }
}
