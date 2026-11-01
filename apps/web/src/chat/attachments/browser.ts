/**
 * The browser's half of `UploadDeps`: what `upload.ts` asks of the page, wired to the real thing.
 * The api half comes from the caller (`dl-z5ja.11.9` passes the api client once `dl-z5ja.11.3`
 * gives it `createAttachment`).
 */

import { EventId } from "@jadwigo/contracts";
import type { AttachmentPort, Decoded, FormXhr, UploadDeps } from "./upload.ts";

/** `createImageBitmap` with the file's EXIF orientation applied; null when it cannot read it. */
async function decode(file: Blob): Promise<Decoded | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  } catch {
    return null;
  }
}

/** libheif's pixels as a bitmap; the decoder's chunk loads here, the first time it is needed. */
async function decodeHeif(file: Blob): Promise<Decoded | null> {
  const { decodeHeifPixels } = await import("./heif.ts");
  const pixels = await decodeHeifPixels(new Uint8Array(await file.arrayBuffer()));
  if (!pixels) return null;
  const bitmap = await createImageBitmap(
    new ImageData(new Uint8ClampedArray(pixels.data), pixels.width, pixels.height),
  );
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
  };
}

export function browserDeps(api: AttachmentPort): UploadDeps {
  return {
    api,
    decode,
    decodeHeif,
    canvas: () => document.createElement("canvas"),
    xhr: () => new XMLHttpRequest() as unknown as FormXhr,
    eventId: () => EventId.parse(crypto.randomUUID()),
    objectUrl: {
      create: (blob) => URL.createObjectURL(blob),
      revoke: (url) => URL.revokeObjectURL(url),
    },
  };
}
