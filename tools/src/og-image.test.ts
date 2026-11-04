import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkOgImage, HEIGHT, MAX_BYTES, OG, pngSize, WIDTH } from "./og-image.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const repo = (path: string) =>
  existsSync(`${ROOT}${path}`) ? readFileSync(`${ROOT}${path}`) : undefined;

/** The first 24 bytes of a PNG of the given size: the signature, then the IHDR chunk. */
function png(width: number, height: number, length = 24): Uint8Array {
  const bytes = new Uint8Array(length);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

describe("og-image", () => {
  it("passes on the repo as it is", () => {
    expect(checkOgImage(repo)).toEqual([]);
  });

  it("reads a PNG's size and refuses bytes that are no PNG", () => {
    expect(pngSize(png(1200, 630))).toEqual({ width: 1200, height: 630 });
    expect(pngSize(new TextEncoder().encode("GIF89a and then some more bytes"))).toBeUndefined();
  });

  it("fails a missing picture", () => {
    expect(checkOgImage(() => undefined)).toEqual([`${OG} is missing`]);
  });

  it("fails a picture of the wrong size", () => {
    expect(checkOgImage(() => png(512, 512))).toEqual([`${OG} is 512x512, not ${WIDTH}x${HEIGHT}`]);
  });

  it("fails a picture too big for the messaging apps", () => {
    expect(checkOgImage(() => png(WIDTH, HEIGHT, MAX_BYTES + 1))).toEqual([
      `${OG} is ${MAX_BYTES + 1} bytes, over ${MAX_BYTES}`,
    ]);
  });
});
