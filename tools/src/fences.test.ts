// Planted violations: each fence gets a small bad tree in a temp directory and must fail on it.
// A fence that stays green here has stopped guarding anything. The guard's cases are in
// .claude/hooks/guard.test.ts, the no-bank and ports checks in their own test files.
import { spawnSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../..");
const bin = (name: string) => join(repo, "node_modules/.bin", name);

function plant(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "fence-"));
  for (const [path, body] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), body);
  }
  return dir;
}

function run(cmd: string, args: string[], cwd: string) {
  const out = spawnSync(cmd, args, { cwd, encoding: "utf8" });
  return { status: out.status, output: `${out.stdout}${out.stderr}` };
}

describe("fences fail on planted violations", { timeout: 60_000 }, () => {
  it("Biome: any, @ts-ignore, .only, .skip and the process.env house rule", () => {
    const dir = plant({
      "src/any.ts": "export const f = (x: any) => x;\n",
      "src/ignore.ts": "// @ts-ignore\nexport const n: number = 'x';\n",
      "src/focused.test.ts": 'import { it } from "vitest";\nit.only("x", () => {});\n',
      "src/skipped.test.ts": 'import { it } from "vitest";\nit.skip("x", () => {});\n',
      "apps/x/src/env.ts": 'export const k = process.env["KEY"];\n',
      "apps/x/src/view.tsx": 'export const v = process.env["KEY"];\n',
    });
    cpSync(join(repo, "biome.json"), join(dir, "biome.json"));
    cpSync(join(repo, "lint"), join(dir, "lint"), { recursive: true });
    const { status, output } = run(
      bin("biome"),
      ["lint", "--vcs-enabled=false", "--max-diagnostics=50", "."],
      dir,
    );
    expect(status).not.toBe(0);
    for (const rule of ["noExplicitAny", "noTsIgnore", "noFocusedTests", "noSkippedTests"]) {
      expect(output).toContain(rule);
    }
    expect(output).toContain("Read process.env only in src/config.ts");
    expect(output).toMatch(/view\.tsx[\s\S]*Read process\.env only in src\/config\.ts/);
  });

  it("Biome: boundary values through their constants (RULES.md rule 22)", () => {
    const dir = plant({
      "packages/x/src/store.ts":
        'class StoreError extends Error { constructor(readonly type: string, m: string) { super(m); } }\nexport const e = new StoreError("WriteOnce", "taken");\n',
      "apps/x/src/envelope.ts":
        'export const body = { error: { type: "NotFound", message: "gone" } };\n',
      "apps/x/src/route.ts": 'export const path = "/api/v1/attempts";\n',
      "packages/x/src/prefix.ts": 'export const prefix = "att_";\n',
      "packages/x/src/fine.ts":
        'export const kind = { type: "try" };\nexport const done = (s: string) => s === "finished";\n',
      "packages/x/src/fine.test.ts": 'export const path = "/api/v1/attempts";\n',
    });
    cpSync(join(repo, "biome.json"), join(dir, "biome.json"));
    cpSync(join(repo, "lint"), join(dir, "lint"), { recursive: true });
    const { status, output } = run(
      bin("biome"),
      ["lint", "--vcs-enabled=false", "--max-diagnostics=50", "."],
      dir,
    );
    expect(status).not.toBe(0);
    expect(output).toMatch(/store\.ts[\s\S]*ErrorType\.enum/);
    expect(output).toMatch(/envelope\.ts[\s\S]*ErrorType\.enum/);
    expect(output).toMatch(/route\.ts[\s\S]*through ROUTES/);
    expect(output).toMatch(/prefix\.ts[\s\S]*through ID_PREFIXES/);
    expect(output).not.toContain("fine.ts");
    expect(output).not.toContain("fine.test.ts");
  });

  it("TypeScript: unchecked index access, exact optional properties and branded ids", () => {
    const dir = plant({
      "tsconfig.json": JSON.stringify({
        extends: join(repo, "tsconfig.base.json"),
        compilerOptions: { types: [] },
        include: ["*.ts"],
      }),
      "index.ts": "const xs: string[] = [];\nexport const first: string = xs[0];\n",
      "optional.ts": "type T = { a?: string };\nexport const t: T = { a: undefined };\n",
      "brand.ts": `import type { LearnerId } from "${join(repo, "packages/contracts/src/ids.ts")}";\nexport const id: LearnerId = "lrn_000000000001";\n`,
    });
    const { status, output } = run(bin("tsc"), ["-p", "tsconfig.json"], dir);
    expect(status).not.toBe(0);
    expect(output).toMatch(/index\.ts.*TS2322/);
    expect(output).toMatch(/optional\.ts.*TS2375/);
    expect(output).toMatch(/brand\.ts.*TS2322/);
  });

  it("dependency-cruiser: package to app, contracts to ours, testing outside tests", () => {
    const dir = plant({
      "apps/api/src/index.ts": "export const app = 1;\n",
      "packages/core/src/index.ts":
        'import { app } from "../../../apps/api/src/index.ts";\nexport const core = app;\n',
      "packages/contracts/src/index.ts":
        'import { helper } from "../../store/src/index.ts";\nexport const c = helper;\n',
      "packages/store/src/index.ts":
        'import { FIXED } from "../../testing/src/index.ts";\nexport const helper = FIXED;\n',
      "packages/testing/src/index.ts": "export const FIXED = 1;\n",
      "packages/store/src/ok.test.ts":
        'import { FIXED } from "../../testing/src/index.ts";\nexport const t = FIXED;\n',
      "packages/ui/src/ok.test.tsx":
        'import { FIXED } from "../../testing/src/index.ts";\nexport const t = FIXED;\n',
    });
    const config = join(repo, ".dependency-cruiser.cjs");
    const { status, output } = run(
      bin("depcruise"),
      ["apps", "packages", "--config", config, "--output-type", "err"],
      dir,
    );
    expect(status).not.toBe(0);
    expect(output).toContain("packages-never-import-apps");
    expect(output).toContain("contracts-imports-nothing-of-ours");
    expect(output).toMatch(/testing-only-in-tests: packages\/store\/src\/index\.ts/);
    expect(output).not.toMatch(/testing-only-in-tests: packages\/store\/src\/ok\.test\.ts/);
    expect(output).not.toMatch(/testing-only-in-tests: packages\/ui\/src\/ok\.test\.tsx/);
  });

  it("dependency-cruiser: lesson-kit's layers, the drag library and katex", () => {
    const lib = (name: string) => ({
      [`node_modules/${name}/package.json`]: JSON.stringify({ name, main: "index.js" }),
      [`node_modules/${name}/index.js`]: "module.exports = {};\n",
    });
    const dir = plant({
      ...lib("@dnd-kit/core"),
      ...lib("katex"),
      "packages/lesson-kit/src/families/view.ts": "export const view = 1;\n",
      "packages/lesson-kit/src/parts/Part.tsx":
        'import { view } from "../families/view.ts";\nexport const part = view;\n',
      "packages/lesson-kit/src/stage/clock.ts":
        'import { part } from "../parts/Part.tsx";\nexport const clock = part;\n',
      "packages/lesson-kit/src/parts/Drag.tsx":
        'import * as dnd from "@dnd-kit/core";\nexport const drag = dnd;\n',
      "packages/lesson-kit/src/parts/SortableList.tsx":
        'import * as dnd from "@dnd-kit/core";\nexport const sortable = dnd;\n',
      "packages/lesson-kit/src/parts/Formula.tsx":
        'import katex from "katex";\nexport const formula = katex;\n',
      "packages/lesson-kit/src/parts/RichText.tsx":
        'import katex from "katex";\nexport const rich = katex;\n',
    });
    const config = join(repo, ".dependency-cruiser.cjs");
    const { status, output } = run(
      bin("depcruise"),
      ["packages", "--config", config, "--output-type", "err"],
      dir,
    );
    expect(status).not.toBe(0);
    expect(output).toMatch(
      /lesson-kit-stage-is-the-bottom: packages\/lesson-kit\/src\/stage\/clock\.ts/,
    );
    expect(output).toMatch(
      /lesson-kit-parts-know-no-family: packages\/lesson-kit\/src\/parts\/Part\.tsx/,
    );
    expect(output).toMatch(
      /drag-only-in-the-drag-parts: packages\/lesson-kit\/src\/parts\/Drag\.tsx/,
    );
    expect(output).not.toMatch(
      /drag-only-in-the-drag-parts: packages\/lesson-kit\/src\/parts\/SortableList/,
    );
    expect(output).toMatch(
      /katex-only-in-rich-text: packages\/lesson-kit\/src\/parts\/Formula\.tsx/,
    );
    expect(output).not.toMatch(
      /katex-only-in-rich-text: packages\/lesson-kit\/src\/parts\/RichText/,
    );
  });

  it("knip: an unused file and an unused dependency", () => {
    const dir = plant({
      "package.json": JSON.stringify({
        name: "planted",
        type: "module",
        exports: "./src/index.ts",
        dependencies: { "left-pad": "1.3.0" },
      }),
      "src/index.ts": "export const used = 1;\n",
      "src/orphan.ts": "export const unused = 2;\n",
    });
    const { status, output } = run(bin("knip"), ["--no-config-hints"], dir);
    expect(status).not.toBe(0);
    expect(output).toContain("src/orphan.ts");
    expect(output).toContain("left-pad");
  });

  it("gitleaks: an AWS access key", () => {
    // Built at runtime so this file never holds a key gitleaks would flag.
    const key = ["AKIA", "QYLPMN5HFIQR7XKZ"].join("");
    const dir = plant({ "config.ts": `export const awsKey = "${key}";\n` });
    const { status, output } = run(
      "gitleaks",
      ["dir", dir, "--config", join(repo, ".gitleaks.toml"), "--no-banner"],
      dir,
    );
    expect(status, output).toBe(1);
  });

  it("gitleaks: a family name from the private-terms file, allowed under apps/site", () => {
    // An invented word stands in for a name, so no real one is ever in the repo.
    const terms = join(plant({ "terms.txt": "Zqvorlintap\n" }), "terms.txt");
    const scan = (files: Record<string, string>) => {
      const dir = plant(files);
      const out = spawnSync(
        "bun",
        [join(repo, "tools/src/gitleaks.ts"), "dir", dir, "--no-banner", "--redact"],
        { cwd: dir, encoding: "utf8", env: { ...process.env, JADWIGO_PRIVATE_TERMS: terms } },
      );
      return { status: out.status, output: `${out.stdout}${out.stderr}` };
    };
    const leaked = scan({ "src/greeting.ts": 'export const hi = "Cześć zqvorlintap!";\n' });
    expect(leaked.status, leaked.output).toBe(1);
    expect(leaked.output).not.toMatch(/zqvorlintap/i);
    const site = scan({ "apps/site/src/about.md": "Zqvorlintap's story.\n" });
    expect(site.status, site.output).toBe(0);
    const tracker = scan({ "AGENTS.md": "bd -C ~/projects/zqvorlintap-learns/.beads ready\n" });
    expect(tracker.status, tracker.output).toBe(0);
  });
});
