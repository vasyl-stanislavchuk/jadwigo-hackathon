import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkBrandIcons, ICONS, sha256, stamp, TARGETS } from "./brand-icons.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const repo = (path: string) =>
  existsSync(`${ROOT}${path}`) ? readFileSync(`${ROOT}${path}`, "utf8") : undefined;

const SVG = '<svg viewBox="0 0 64 64"><rect rx="16"/></svg>';
/** A tree with the sources and one target rendered from them; `edit` plants a change. */
function tree(edit: Record<string, string | undefined> = {}) {
  const files: Record<string, string | undefined> = {
    "packages/ui/src/brand/favicon.svg": SVG,
    "packages/ui/src/brand/favicon-16.svg": `${SVG} `,
  };
  const hashes = stamp((p) => files[p] ?? "");
  files["t/favicon.svg"] = SVG;
  files["packages/ui/src/brand/icons.json"] = JSON.stringify(hashes);
  for (const { file } of ICONS) files[`t/${file}`] = "png";
  Object.assign(files, edit);
  return (path: string) => files[path];
}

describe("brand-icons", () => {
  it("passes on the repo as it is", () => {
    expect(TARGETS).toContain("apps/web/public");
    expect(checkBrandIcons(repo)).toEqual([]);
  });

  it("passes when every target matches its sources", () => {
    expect(checkBrandIcons(tree(), ["t"])).toEqual([]);
  });

  it("fails when a PNG is missing", () => {
    expect(checkBrandIcons(tree({ "t/favicon-32.png": undefined }), ["t"])).toEqual([
      "t/favicon-32.png is missing",
    ]);
  });

  it("fails when a source changed after its PNGs were rendered", () => {
    const changed = SVG.replace("16", "12");
    expect(checkBrandIcons(tree({ "packages/ui/src/brand/favicon.svg": changed }), ["t"])).toEqual([
      "t/favicon.svg differs from packages/ui/src/brand/favicon.svg",
      "the PNGs predate packages/ui/src/brand/favicon.svg",
    ]);
  });

  it("names the stamp by each source's hash", () => {
    const read = tree();
    expect(stamp((p) => read(p) ?? "")).toEqual({
      "favicon-16.svg": sha256(`${SVG} `),
      "favicon.svg": sha256(SVG),
    });
  });
});
