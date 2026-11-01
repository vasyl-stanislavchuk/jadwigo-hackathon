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

export function browserDeps(api: AttachmentPort): UploadDeps {
  return {
    api,
    decode,
    canvas: () => document.createElement("canvas"),
    xhr: () => new XMLHttpRequest() as unknown as FormXhr,
    eventId: () => EventId.parse(crypto.randomUUID()),
    objectUrl: {
      create: (blob) => URL.createObjectURL(blob),
      revoke: (url) => URL.revokeObjectURL(url),
    },
  };
}
