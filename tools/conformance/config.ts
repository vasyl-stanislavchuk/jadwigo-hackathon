// The conformance runner's settings (dl-a38n.31), the one place tools/conformance reads the
// environment. The items file is jw's: JW_KHAN_CONVERTED, else <JADWIGO_KHAN_DIR>/converted-pl.json,
// else the bank's synced copy under ~/.cache/jadwigo-bank/khan (apps/cli/src/jw/items.py).
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
