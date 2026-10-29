import { describe, expect, it } from "vitest";
import { checkBunLock } from "./check-bun-lock.ts";

const entry = (name: string, meta: string) =>
  `    "${name}": ["${name}@1.0.0", "", { ${meta} }, "sha512-x"],`;

const lock = (lines: string[]) =>
  `{\n  "lockfileVersion": 1,\n  "packages": {\n${lines.join("\n")}\n  }\n}\n`;

describe("checkBunLock", () => {
  it("passes the lock bun 1.4.4 writes", () => {
    expect(
      checkBunLock(
        lock([
          entry("@biomejs/cli-linux-x64", '"os": "linux", "cpu": "x64", "libc": "glibc"'),
          entry("@rollup/rollup-linux-arm64-musl", '"os": "linux", "cpu": "arm64", "libc": "musl"'),
          entry("lightningcss-linux-x64-gnu", '"os": "linux", "cpu": "x64", "libc": "glibc"'),
          entry("lightningcss-linux-arm-gnueabihf", '"os": "linux", "cpu": "arm"'),
          entry("@rollup/rollup-darwin-arm64", '"os": "darwin", "cpu": "arm64"'),
        ]),
      ),
    ).toEqual([]);
  });

  it("fails the lock bun 1.4.2 writes, which strips every libc field", () => {
    expect(
      checkBunLock(
        lock([
          entry("@rollup/rollup-linux-arm64-musl", '"os": "linux", "cpu": "arm64"'),
          entry("lightningcss-linux-x64-gnu", '"os": "linux", "cpu": "x64"'),
          entry("lightningcss-linux-arm-gnueabihf", '"os": "linux", "cpu": "arm"'),
        ]),
      ),
    ).toEqual(["@rollup/rollup-linux-arm64-musl", "lightningcss-linux-x64-gnu"]);
  });

  it("names a binding once, though bun.lock lists it under 2 keys", () => {
    const stripped = entry("lightningcss-linux-x64-gnu", '"os": "linux", "cpu": "x64"');
    const nested = stripped.replace(
      '"lightningcss-linux-x64-gnu":',
      '"@tailwindcss/node/lightningcss-linux-x64-gnu":',
    );
    expect(checkBunLock(lock([stripped, nested]))).toEqual(["lightningcss-linux-x64-gnu"]);
  });
});
