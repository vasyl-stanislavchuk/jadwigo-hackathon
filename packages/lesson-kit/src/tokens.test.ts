// Colour and size come from Zeszyt's tokens (packages/ui/src/styles): no literal colour and no
// pixel size in a part, a family view or the stage. Ported from david-learns frontend/src/levels.test.ts.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = import.meta.dirname;

function sources(dir: string): { name: string; source: string }[] {
  return readdirSync(join(SRC, dir), { recursive: true, withFileTypes: true })
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
    .map((e) => {
      const path = join(e.parentPath, e.name);
      return { name: relative(SRC, path), source: readFileSync(path, "utf8") };
    });
}

// Comments may say "56 px"; only code is checked.
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
}

const RAW_COLOUR =
  /#[0-9a-f]{3,8}\b|\b(?:rgb|hsl|oklch)a?\(|-\[(?:#|rgb|hsl|var\(--color-)|var\(--color-/i;
const PIXELS = /\d+(?:\.\d+)?px\b/;
// Each listed with its reason.
const PIXELS_ALLOWED: Readonly<Record<string, string>> = {
  // SVG user units inside a scaled viewBox, not screen pixels.
  "parts/NumberLineSvg.tsx": "text-[34px]",
};

describe("colour and size come from the tokens", () => {
  const styled = [...sources("parts"), ...sources("families"), ...sources("stage")];

  it("finds the sources it checks", () => {
    expect(styled.length).toBeGreaterThan(100);
  });

  it.each(styled.map((f) => [f.name, f.source] as const))(
    "%s has no literal colour",
    (_, source) => {
      expect(code(source).match(RAW_COLOUR)?.[0] ?? null).toBeNull();
    },
  );

  it.each(styled.map((f) => [f.name, f.source] as const))(
    "%s has no pixel size",
    (name, source) => {
      const allowed = PIXELS_ALLOWED[name];
      const left = allowed === undefined ? code(source) : code(source).replaceAll(allowed, "");
      expect(left.match(PIXELS)?.[0] ?? null).toBeNull();
    },
  );

  it("catches a planted violation", () => {
    expect(code("className='bg-[#ff0000]'").match(RAW_COLOUR)).not.toBeNull();
    expect(code("stroke='var(--color-accent)'").match(RAW_COLOUR)).not.toBeNull();
    expect(code("className='min-w-[6px]'").match(PIXELS)).not.toBeNull();
    expect(code("// at least 56px").match(PIXELS)).toBeNull();
  });
});
