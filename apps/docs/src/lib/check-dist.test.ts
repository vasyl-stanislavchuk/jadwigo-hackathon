import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { apiBase } from "../index.ts";
import { checkDist, MUST } from "./check-dist.ts";
import { API_PAGES } from "./guides.ts";

const snapshot = new URL("../../../../packages/contracts/openapi.json", import.meta.url);

let dist: string;

/** A dist/ that passes every check: each file carries every text asked of it. */
function writeGoodDist(): void {
  const document = JSON.parse(readFileSync(snapshot, "utf8")) as object;
  writeFileSync(
    join(dist, "openapi.json"),
    JSON.stringify({ ...document, servers: [{ url: apiBase }] }),
  );
  for (const page of API_PAGES) {
    mkdirSync(join(dist, page), { recursive: true });
    writeFileSync(join(dist, page, "index.html"), "");
  }
  const byFile = new Map<string, string[]>();
  for (const [file, text] of MUST) byFile.set(file, [...(byFile.get(file) ?? []), text]);
  for (const [file, texts] of byFile) {
    mkdirSync(dirname(join(dist, file)), { recursive: true });
    writeFileSync(join(dist, file), texts.join("\n"));
  }
}

beforeEach(() => {
  dist = mkdtempSync(join(tmpdir(), "docs-dist-"));
});

afterEach(() => {
  rmSync(dist, { recursive: true, force: true });
});

describe("checkDist", () => {
  it("passes a dist/ that carries every check", () => {
    writeGoodDist();
    expect(checkDist(dist)).toEqual([]);
  });

  it("names a missing file", () => {
    writeGoodDist();
    rmSync(join(dist, "sitemap-index.xml"));
    expect(checkDist(dist)).toEqual(["dist/sitemap-index.xml is missing"]);
  });

  it("names a file that lacks its text", () => {
    writeGoodDist();
    writeFileSync(join(dist, "404.html"), "<h1>Gone</h1>");
    expect(checkDist(dist)).toEqual(["dist/404.html lacks Page not found"]);
  });

  it("fails an openapi.json with no server or a missing operation page", () => {
    writeGoodDist();
    writeFileSync(join(dist, "openapi.json"), JSON.stringify({ openapi: "3.1.0", paths: {} }));
    rmSync(join(dist, "api/operations/getme"), { recursive: true });
    expect(checkDist(dist)).toEqual([
      expect.stringMatching(/^dist\/openapi.json has 0 operations, ROUTES \d+$/),
      `dist/openapi.json's servers[0].url is not ${apiBase}`,
      "dist/api/operations/getme/ is not built",
    ]);
  });

  it("fails a page that links into GitHub", () => {
    writeGoodDist();
    writeFileSync(join(dist, "guides/leak.html"), '<a href="https://github.com/x/y">code</a>');
    expect(checkDist(dist)).toEqual(["dist/guides/leak.html links into GitHub"]);
  });

  it("asks for a build when there is no dist/", () => {
    expect(checkDist(join(dist, "nope"))).toEqual([
      `${join(dist, "nope")} does not exist: run the build first`,
    ]);
  });
});
