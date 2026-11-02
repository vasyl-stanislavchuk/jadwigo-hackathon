import type { UploadsBucket } from "../attachments.ts";

/**
 * The uploads bucket in memory, for the route suites: never AWS. `put` is the browser's POST to
 * the presigned form, so a test can upload any bytes it builds, a wrong size or an Exif header
 * included. It keeps every call's key so a test can say what was copied and deleted.
 */
export class MemoryUploads implements UploadsBucket {
  readonly objects = new Map<
    string,
    { bytes: Uint8Array; contentType: string; disposition?: "inline" | "attachment" }
  >();
  readonly ranges: { key: string; start: number; end: number }[] = [];
  readonly copies: { from: string; to: string }[] = [];
  readonly removed: string[] = [];
  readonly forms: { key: string; contentType: string; bytes: number }[] = [];
  /** Set to make the next copy throw, as S3 would on a fault. */
  failCopy = false;

  /** The browser's upload to the form for `key`. */
  put(key: string, bytes: Uint8Array, contentType = "image/jpeg"): void {
    this.objects.set(key, { bytes, contentType });
  }

  async presignPost(key: string, contentType: string, bytes: number, expiresInS: number) {
    this.forms.push({ key, contentType, bytes });
    return {
      url: "https://uploads.test/",
      fields: { key, "Content-Type": contentType, "x-expires-in": String(expiresInS) },
    };
  }

  async size(key: string) {
    return this.objects.get(key)?.bytes.length;
  }

  async head(key: string, bytes: number) {
    return this.objects.get(key)?.bytes.slice(0, bytes);
  }

  async range(key: string, start: number, end: number) {
    this.ranges.push({ key, start, end });
    return this.objects.get(key)?.bytes.slice(start, end + 1);
  }

  async copy(
    from: string,
    to: string,
    contentType: string,
    disposition: "inline" | "attachment" = "inline",
  ) {
    if (this.failCopy) throw new Error("the copy failed");
    const object = this.objects.get(from);
    if (object === undefined) throw new Error(`no object at ${from}`);
    this.objects.set(to, { bytes: object.bytes, contentType, disposition });
    this.copies.push({ from, to });
  }

  async remove(keys: readonly string[]) {
    for (const key of keys) {
      this.objects.delete(key);
      this.removed.push(key);
    }
  }

  async presignGet(key: string, expiresInS: number) {
    return `https://uploads.test/${key}?expires-in=${expiresInS}`;
  }
}

/**
 * A synthetic JPEG of `bytes` bytes: SOI, a JFIF APP0, an APP1 Exif segment when `exif`, SOS, then
 * filler and EOI. No picture, no person: only the markers the check reads.
 */
export function syntheticJpeg(bytes = 2048, { exif = false } = {}): Uint8Array {
  const jfif = [
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0, 0, 1, 0, 1, 0, 0,
  ];
  const app1 = exif ? [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00] : [];
  const sos = [0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00];
  const head = [0xff, 0xd8, ...jfif, ...app1, ...sos];
  const out = new Uint8Array(bytes);
  out.set(head.slice(0, bytes));
  out[bytes - 2] = 0xff;
  out[bytes - 1] = 0xd9;
  return out;
}

/** A synthetic PNG's first bytes: its 8-byte signature, then zeros. */
export function syntheticPng(bytes = 2048): Uint8Array {
  const out = new Uint8Array(bytes);
  out.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return out;
}

/** A synthetic HEIC's first bytes: an `ftyp` box of `brand`, then zeros. */
export function syntheticHeic(bytes = 2048, brand = "heic"): Uint8Array {
  const out = new Uint8Array(bytes);
  out.set([0x00, 0x00, 0x00, 0x18]);
  out.set(new TextEncoder().encode(`ftyp${brand}`), 4);
  return out;
}

/** A synthetic PDF: its header, then filler, then `%%EOF`. No page anyone could read. */
export function syntheticPdf(bytes = 2048): Uint8Array {
  const out = new Uint8Array(bytes).fill(0x20);
  out.set(new TextEncoder().encode("%PDF-1.7\n"));
  out.set(new TextEncoder().encode("%%EOF"), bytes - 5);
  return out;
}

/**
 * A synthetic ZIP of empty stored entries named `names`, laid out as a real one is: each local
 * header, then the central directory, then the end record, with `pad` zero bytes before the
 * directory so a test can push it past the first 64 KB. A DOCX names `word/document.xml`.
 */
export function syntheticZip(names: readonly string[], { pad = 0 } = {}): Uint8Array {
  const enc = new TextEncoder();
  const parts: number[] = [];
  const le = (n: number, width: 2 | 4) =>
    width === 2
      ? [n & 0xff, (n >>> 8) & 0xff]
      : [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, n >>> 24];
  const offsets: number[] = [];
  for (const name of names) {
    offsets.push(parts.length);
    const n = [...enc.encode(name)];
    parts.push(
      ...le(0x04034b50, 4),
      ...le(20, 2),
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      ...le(0, 4),
      ...le(0, 4),
      ...le(0, 4),
      ...le(n.length, 2),
      ...le(0, 2),
      ...n,
    );
  }
  for (let i = 0; i < pad; i++) parts.push(0);
  const directoryAt = parts.length;
  names.forEach((name, i) => {
    const n = [...enc.encode(name)];
    parts.push(
      ...le(0x02014b50, 4),
      ...le(20, 2),
      ...le(20, 2),
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      ...le(0, 4),
      ...le(0, 4),
      ...le(0, 4),
      ...le(n.length, 2),
      ...le(0, 2),
      ...le(0, 2),
      ...le(0, 2),
      ...le(0, 2),
      ...le(0, 4),
      ...le(offsets[i] ?? 0, 4),
      ...n,
    );
  });
  const directoryLength = parts.length - directoryAt;
  parts.push(
    ...le(0x06054b50, 4),
    0,
    0,
    0,
    0,
    ...le(names.length, 2),
    ...le(names.length, 2),
    ...le(directoryLength, 4),
    ...le(directoryAt, 4),
    ...le(0, 2),
  );
  return Uint8Array.from(parts);
}

export const DOCX_NAMES = ["[Content_Types].xml", "_rels/.rels", "word/document.xml"] as const;
