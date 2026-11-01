/**
 * The HEIF fallback (wave 5 decision 57): libheif compiled to WebAssembly, for a HEIC the browser
 * cannot decode itself (Chrome, Firefox, Android). Safari decodes HEIC natively, and iOS already
 * hands `accept="image/*"` a JPEG, so this runs only off Apple. `browser.ts` imports this module
 * with `import()`, so its ~2 MB chunk loads the first time a HEIC needs it and never otherwise.
 * libheif applies the file's own rotation and mirror, so the pixels come out the right way up.
 */

import libheif from "libheif-js/wasm-bundle";

export interface Pixels {
  width: number;
  height: number;
  /** RGBA, 4 bytes a pixel, row by row. */
  data: Uint8ClampedArray;
}

/** The first image in a HEIF file as RGBA pixels, or null when libheif cannot read it. */
export async function decodeHeifPixels(bytes: Uint8Array): Promise<Pixels | null> {
  let images: ReturnType<InstanceType<typeof libheif.HeifDecoder>["decode"]>;
  try {
    images = new libheif.HeifDecoder().decode(bytes);
  } catch {
    return null;
  }
  const image = images[0];
  if (!image) return null;
  try {
    const width = image.get_width();
    const height = image.get_height();
    if (width < 1 || height < 1) return null;
    const target = { data: new Uint8ClampedArray(width * height * 4), width, height };
    return await new Promise<Pixels | null>((done) => {
      image.display(target, (shown) => done(shown ? { width, height, data: shown.data } : null));
    });
  } catch {
    return null;
  } finally {
    for (const each of images) each.free();
  }
}
