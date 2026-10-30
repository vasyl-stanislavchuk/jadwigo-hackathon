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
