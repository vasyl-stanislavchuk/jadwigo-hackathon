// The landing page's share picture (dl-w0b4.141): what Messenger, WhatsApp, Facebook and X show
// above a link to jadwigo.pl. One picture for both languages, with no words in it but the wordmark,
// because every one of those apps prints the page's title under the picture. It is the hero's table
// picture under the crown wordmark, on the white Zeszyt paper, at 1200x630, the size each app crops to.
// The files are read as files: tools imports nothing of ours.
// Run: bun tools/src/og-image.ts (check), bun tools/src/og-image.ts --write (render, needs Chromium)
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const OG = "apps/site/public/og.png";
export const WIDTH = 1200;
export const HEIGHT = 630;
/** Messenger and WhatsApp skip a big picture; this keeps it well under their limits. */
export const MAX_BYTES = 600_000;

const ART = "apps/site/src/assets/illustrations/partner.webp";
const WORDMARK = "packages/ui/src/brand/wordmark.svg";

/** A PNG's width and height from its IHDR chunk, or undefined when the bytes are no PNG. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || signature.some((b, i) => bytes[i] !== b)) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/** Every problem with the share picture; an empty list passes. */
export function checkOgImage(read: (path: string) => Uint8Array | undefined): string[] {
  const bytes = read(OG);
  if (bytes === undefined) return [`${OG} is missing`];
  const size = pngSize(bytes);
  if (size === undefined) return [`${OG} is not a PNG`];
  const problems: string[] = [];
  if (size.width !== WIDTH || size.height !== HEIGHT)
    problems.push(`${OG} is ${size.width}x${size.height}, not ${WIDTH}x${HEIGHT}`);
  if (bytes.length > MAX_BYTES) problems.push(`${OG} is ${bytes.length} bytes, over ${MAX_BYTES}`);
  return problems;
}

async function write(): Promise<void> {
  const { chromium } = await import("@playwright/test");
  const art = readFileSync(ART).toString("base64");
  const wordmark = readFileSync(WORDMARK, "utf8");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
  await page.setContent(
    `<style>
      html,body{margin:0;width:${WIDTH}px;height:${HEIGHT}px;background:#fff}
      body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px}
      svg{display:block;height:96px;width:auto}
      img{display:block;width:1010px;height:auto}
    </style>${wordmark}<img src="data:image/webp;base64,${art}" alt="">`,
  );
  await page.waitForLoadState("load");
  writeFileSync(OG, await page.screenshot({ type: "png" }));
  await browser.close();
  console.log(`og-image: wrote ${OG}`);
}

if (import.meta.main) {
  if (process.argv.includes("--write")) await write();
  const problems = checkOgImage((p) => (existsSync(p) ? readFileSync(p) : undefined));
  for (const p of problems) console.error(`og-image: ${p}`);
  if (problems.length > 0) {
    console.error("og-image: render it again with bun tools/src/og-image.ts --write.");
    process.exit(1);
  }
}
