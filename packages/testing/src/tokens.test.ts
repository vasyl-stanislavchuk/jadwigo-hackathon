// The design-system check catches what it is for, and nothing it is not (dl-uukj.32).
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkTokens, code, TOKEN_RULES, violationsIn } from "./tokens.ts";

const rulesHit = (source: string): string[] => violationsIn("x.tsx", source).map((v) => v.rule);

describe("the token rules", () => {
  it.each([
    ["className='bg-[#ff0000]'", "literal colour"],
    ["fill='rgb(1 2 3)'", "literal colour"],
    ["className='text-red-500'", "palette class"],
    ["className='border-black'", "palette class"],
    ["className='bg-black/50 text-white'", "palette class"],
    ["className='min-w-[6px]'", "pixel size"],
    ["className={`w-[${w}px]`}", "pixel template"],
    ["className='text-[1.5rem]'", "arbitrary size"],
    ["className='min-h-[var(--kid-tap-min)]'", "token read in a class"],
    ["className='text-[length:var(--jw-size-body)]'", "token read in a class"],
    ["stroke='var(--color-accent)'", "colour utility read as var()"],
    ["className='text-destructive'", "nothing backs it"],
    ["className='animate-in fade-in-0'", "nothing backs it"],
  ])("catches %s as %s", (source, rule) => {
    expect(rulesHit(source)).toContain(rule);
  });

  it.each([
    "className='bg-jw-act text-jw-on-act shadow-jw-act'",
    "className='min-h-kid-tap text-kid-answer rounded-jw-card'",
    "className='text-jw-body text-jw-ink-soft border-jw-line'",
    "const h = getComputedStyle(el).getPropertyValue('--jw-dur-scroll');",
    "className='bg-kid-correct-soft text-kid-correct-ink'",
    "// at least 56px, see --kid-tap-min",
    "/* #ff0000 is the old red */",
    "const dash = '2 5';",
    "style={{ height: `${h}px`, left: `${rect.left}px` }}",
    "el.style.setProperty('--kid-tray-height', `${h}px`);",
  ])("lets %s through", (source) => {
    expect(rulesHit(source)).toEqual([]);
  });

  it("strips comments but keeps code", () => {
    expect(code("a // 56px\nb /* #fff */ c")).toBe("a \nb  c");
    expect(code("const url = 'http://x';")).toContain("http://x");
  });

  it("names a fix for every rule", () => {
    for (const rule of TOKEN_RULES) expect(rule.fix.length).toBeGreaterThan(20);
  });
});

describe("checkTokens", () => {
  const dir = mkdtempSync(join(tmpdir(), "tokens-"));
  writeFileSync(join(dir, "a.tsx"), "export const a = 'text-red-500 text-[1.5rem]';\n");
  writeFileSync(join(dir, "a.test.tsx"), "export const t = 'bg-[#ff0000]';\n");
  const allow = join(dir, "tokens.allow.json");

  it("reports every violation when nothing is allowed", () => {
    const r = checkTokens(dir, allow);
    expect(r.checked).toBe(1);
    expect(r.unlisted.map((v) => v.snippet)).toEqual(["text-red-500", "-[1.5rem]"]);
    expect(r.stale).toEqual([]);
  });

  it("passes what the allowlist names, and fails a stale entry", () => {
    writeFileSync(
      allow,
      JSON.stringify([
        { path: "a.tsx", snippet: "text-red-500", why: "" },
        { path: "a.tsx", snippet: "-[1.5rem]", why: "" },
        { path: "a.tsx", snippet: "text-[99px]", why: "" },
      ]),
    );
    const r = checkTokens(dir, allow);
    expect(r.unlisted).toEqual([]);
    expect(r.stale.map((s) => s.snippet)).toEqual(["text-[99px]"]);
  });
});
