// lint/no-jsx-literal.grit (dl-uukj.34) on a planted tree: words typed into JSX text or an
// aria-label fail in apps/web and lesson-kit; numbers and symbols, the playground and tests pass.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../..");
const MESSAGE = "Words on a screen come from @jadwigo/copy";
const ARIA = "An aria-label is read aloud";

function lint(files: Record<string, string>): { status: number | null; output: string } {
  const dir = mkdtempSync(join(tmpdir(), "jsx-literal-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  cpSync(join(repo, "biome.json"), join(dir, "biome.json"));
  cpSync(join(repo, "lint"), join(dir, "lint"), { recursive: true });
  const out = spawnSync(
    join(repo, "node_modules/.bin/biome"),
    ["lint", "--vcs-enabled=false", "--max-diagnostics=50", "."],
    { cwd: dir, encoding: "utf8" },
  );
  return { status: out.status, output: `${out.stdout}${out.stderr}` };
}

describe("no-jsx-literal", { timeout: 60_000 }, () => {
  it('fails a planted <p>Hello</p> and aria-label="Zamknij"', () => {
    const { status, output } = lint({
      "apps/web/src/Hello.tsx": "export const H = () => <p>Hello</p>;\n",
      "packages/lesson-kit/src/Close.tsx":
        'export const C = () => <button aria-label="Zamknij" type="button" />;\n',
      "packages/lesson-kit/src/Next.tsx":
        'export const N = () => <button aria-label={"Dalej"} type="button" />;\n',
      "apps/web/src/City.tsx": "export const L = () => <b>Łódź</b>;\n",
    });
    expect(status).not.toBe(0);
    expect(output).toMatch(new RegExp(`Hello\\.tsx[\\s\\S]*${MESSAGE}`));
    expect(output).toMatch(new RegExp(`City\\.tsx[\\s\\S]*${MESSAGE}`));
    expect(output).toMatch(new RegExp(`Close\\.tsx[\\s\\S]*${ARIA}`));
    expect(output).toMatch(new RegExp(`Next\\.tsx[\\s\\S]*${ARIA}`));
  });

  it("passes copy(), numbers, symbols, the playground and tests", () => {
    const { output } = lint({
      "apps/web/src/Fine.tsx": [
        'declare function copy(language: "pl", key: string): string;',
        "export const F = ({ n }: { n: number }) => (",
        '  <p aria-label={copy("pl", "close")}>',
        '    {n} × 8 = {copy("pl", "check")} · 3/4 →',
        "  </p>",
        ");",
        "",
      ].join("\n"),
      "apps/web/src/playground/Tool.tsx":
        'export const T = () => <h1 aria-label="Tool">Lesson builder</h1>;\n',
      "packages/lesson-kit/src/Part.test.tsx": "export const P = () => <p>Hello</p>;\n",
      "apps/site/src/Page.tsx": "export const S = () => <p>Hello</p>;\n",
    });
    expect(output).not.toContain(MESSAGE);
    expect(output).not.toContain(ARIA);
  });
});
