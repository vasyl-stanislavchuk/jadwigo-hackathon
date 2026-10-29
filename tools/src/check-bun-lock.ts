// bun.lock was written by the bun package.json's packageManager pins (dl-5ssh.82). bun 1.4.2, first on
// PATH in a shell that never activated mise, accepts the lock but strips every "libc" field when it
// rewrites it (a `bun add`), and `bun install --frozen-lockfile` accepts the stripped lock, so CI
// never notices. The mark it leaves: a Linux binding named for its libc (`-gnu`, `-musl`) with no
// "libc" field. The `-gnueabihf` and `-musleabihf` builds are skipped: most publish none.
// Run: bun tools/src/check-bun-lock.ts
import { readFileSync } from "node:fs";

/** One package entry of bun.lock's "packages" block: its key, then `["name@version", ...`. */
const ENTRY = /^ {4}"[^"]+": \["((?:@[^/"]+\/)?[^@"]+)@[^"]*"(.*)$/;
const NAMED_FOR_LIBC = /-linux-.*-(gnu|musl)$/;

export function checkBunLock(lock: string): string[] {
  const missing = new Set<string>();
  for (const line of lock.split("\n")) {
    const m = ENTRY.exec(line);
    const name = m?.[1];
    const rest = m?.[2] ?? "";
    if (name && NAMED_FOR_LIBC.test(name) && rest.includes('"os": "linux"')) {
      if (!rest.includes('"libc"')) missing.add(name);
    }
  }
  return [...missing];
}

if (import.meta.main) {
  const pinned = (JSON.parse(readFileSync("package.json", "utf8")) as { packageManager?: string })
    .packageManager;
  const missing = checkBunLock(readFileSync("bun.lock", "utf8"));
  if (missing.length > 0) {
    console.error(
      `bun.lock: ${missing.length} Linux bindings have no "libc" field (${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ", ..." : ""}),` +
        ` so a bun other than ${pinned} rewrote it. Restore it with \`git checkout origin/main -- bun.lock\`,` +
        " then redo the change with `mise exec -- bun ...`.",
    );
    process.exit(1);
  }
}
