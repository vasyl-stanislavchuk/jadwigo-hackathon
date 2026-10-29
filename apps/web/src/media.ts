/**
 * Where a question's pictures come from (dl-n9fr.52). A Khan picture is stored once, by the sha256
 * of its bytes, and served at `<media url>/<sha>.<ext>` from a CloudFront path over the private
 * content bucket's `khan/media/` (decision 2026-10-29-khan-pictures-are-served-from-a-cloudfront-
 * path-over-the-bucket). The media URL is `VITE_MEDIA_URL` (apps/web/.env.example), read here and
 * nowhere else; with none set, a ref stays a same-origin path.
 *
 * The player turns refs into addresses before the kit sees a step (`withMedia`), so lesson-kit's
 * parts keep taking a plain `src` and know nothing of where pictures live.
 */

/** The media URL from the build's settings, without a trailing slash; "" when unset. Read per
 * call, so a test can set it (vi.stubEnv). */
export function mediaUrl(): string {
  return String(import.meta.env["VITE_MEDIA_URL"] ?? "").replace(/\/+$/, "");
}

/** A bare picture ref: the sha256 of the bytes (40 to 64 hex digits) and the file's extension. */
const REF = /^[0-9a-f]{40,64}\.[a-z0-9]{2,5}$/;
/** The prototype's address for the same file (david-learns' /media/khan/ proxy, to_family.py). */
const KHAN_PATH = "/media/khan/";
const SCHEME = "media:";

/**
 * The `src` for a picture: a bare ref (`<sha>.<ext>`), a `media:<ref>` or a `/media/khan/<ref>`
 * becomes `<media url>/<ref>`; anything else (an absolute http(s) address, a `data:` URL, a path
 * the app serves itself) is returned as it is.
 */
export function mediaSrc(src: string, base: string = mediaUrl()): string {
  const root = base.replace(/\/+$/, "");
  const ref = src.startsWith(SCHEME)
    ? src.slice(SCHEME.length)
    : src.startsWith(KHAN_PATH)
      ? src.slice(KHAN_PATH.length)
      : src;
  return REF.test(ref) ? `${root}/${ref}` : src;
}

/** The fields that hold a picture's address in a family's data and a help rung (lesson-kit's
 * Stem `image`, a Picture's `src`, a help card's `picture`). */
const PICTURE_KEYS = new Set(["src", "image", "picture"]);

/**
 * A copy of a question's data (or its released help) with every picture address through
 * `mediaSrc`. Only string values under `src`, `image` and `picture` change; nothing else is read.
 */
export function withMedia<T>(value: T, base: string = mediaUrl()): T {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v === null || typeof v !== "object") return v;
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [
        k,
        typeof x === "string" && PICTURE_KEYS.has(k) ? mediaSrc(x, base) : walk(x),
      ]),
    );
  };
  return walk(value) as T;
}
