// The conformance runner's settings (dl-a38n.31), the one place tools/conformance reads the
// environment. The items file is jw's: JW_KHAN_CONVERTED, else <JADWIGO_KHAN_DIR>/converted-pl.json,
// else the bank's synced copy under ~/.cache/jadwigo-bank/khan (apps/cli/src/jw/items.py). The
// media URL is the dev server's (apps/web/vite.config.ts, devMediaUrl in apps/web/src/media.ts):
// a blank one refuses the run (dl-a38n.32.1), since every picture would read as missing.
import { homedir } from "node:os";
import { join } from "node:path";

type Env = Record<string, string | undefined>;

export function itemsPath(env: Env = process.env): string {
  const converted = (env["JW_KHAN_CONVERTED"] ?? "").trim();
  if (converted) return converted.replace(/^~(?=\/)/, homedir());
  const dir = (env["JADWIGO_KHAN_DIR"] ?? "").trim().replace(/^~(?=\/)/, homedir());
  return join(dir || join(homedir(), ".cache", "jadwigo-bank", "khan"), "converted-pl.json");
}

/** The environment the web dev server starts with, its port set to the one the runner picked. */
export function serverEnv(port: number, env: Env = process.env): Env {
  return { ...env, WEB_PORT: String(port) };
}

/** apps/web's NO_MEDIA_URL, by name: the runner refuses to start with a blank media URL. */
export const NO_MEDIA_URL =
  "NO_MEDIA_URL: VITE_MEDIA_URL is blank, so every picture would read as missing. Set it in apps/web/.env.local (apps/web/.env.example has the URL), or unset it so the dev server takes .env.example's.";

const MEDIA_LINE = /^VITE_MEDIA_URL=(.*)$/m;

/** A VITE_MEDIA_URL line's value, without quotes; undefined when the text has no such line. */
function mediaLine(text: string): string | undefined {
  const value = MEDIA_LINE.exec(text)?.[1]?.trim();
  return value?.replace(/^(["'])(.*)\1$/, "$2").trim();
}

/**
 * The media URL the web dev server will run with, as vite.config.ts picks it: the environment's,
 * else the last of apps/web's env files (lowest priority first: .env, .env.local,
 * .env.development, .env.development.local) that sets it, else .env.example's. "" when blank.
 */
export function devMediaUrl(env: Env, envFiles: readonly string[], example: string): string {
  const set = env["VITE_MEDIA_URL"];
  if (set !== undefined) return set.trim();
  const fromFiles = envFiles.map(mediaLine).filter((v) => v !== undefined);
  if (fromFiles.length > 0) return fromFiles[fromFiles.length - 1] ?? "";
  return mediaLine(example) ?? "";
}

/** The languages the app speaks (packages/copy), the ones `--lang` takes. */
const LANGS = ["pl", "en"] as const;
type Lang = (typeof LANGS)[number];

/**
 * The language a run checks, and the items it serves (dl-a38n.32.3). With `--lang`, only the items
 * that name that language: an item naming none, or another, is left out and counted, never drawn
 * in the flag's language and marked ready for a language it does not name (dl-a38n.32.22). A
 * `--lang` that keeps no item is an error, so a run in the wrong language never overwrites the
 * file's sidecar with an empty one. Without `--lang`, the items' own language, refused when they
 * mix languages or one names none. Every item is drawn in its own copy.
 */
export function itemsInLanguage(
  items: readonly unknown[],
  flag: string | undefined,
): { lang: Lang; items: unknown[]; left_out: number; unnamed: number } | { error: string } {
  const languageOf = (i: unknown): unknown => (i as { language?: unknown } | null)?.language;
  if (flag !== undefined) {
    if (!(LANGS as readonly string[]).includes(flag))
      return { error: `--lang takes ${LANGS.join(" or ")}, not ${flag}` };
    const kept = items.filter((i) => languageOf(i) === flag);
    const unnamed = items.filter((i) => languageOf(i) === undefined).length;
    if (kept.length === 0)
      return {
        error: `no item names ${flag} (${unnamed} name no language): nothing to check with --lang ${flag}`,
      };
    return {
      lang: flag as Lang,
      items: kept,
      left_out: items.length - kept.length - unnamed,
      unnamed,
    };
  }
  const named = new Set(items.map(languageOf));
  if (named.has(undefined))
    return { error: "some items name no language: pass --lang pl or --lang en" };
  if (named.size !== 1)
    return {
      error: `the items mix languages (${[...named].map(String).sort().join(", ")}): pass --lang to check one`,
    };
  const [only] = [...named];
  if (!(LANGS as readonly unknown[]).includes(only))
    return { error: `the items are in ${String(only)}, which the app does not speak` };
  return { lang: only as Lang, items: [...items], left_out: 0, unnamed: 0 };
}
