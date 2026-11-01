/**
 * The foundation (styles/foundation.css, dl-uukj.29.25) is Zeszyt: its tokens at :root for every
 * page (dl-uukj.32), and the rules a lesson keeps. The file is read as written and its roles resolved
 * through the primitives, so a value changed there is checked here:
 *
 * - the tokens at :root, the night roles under [theme='dark'], and the aliases declared again on
 *   every [theme] and [data-lesson-theme], so a nested theme and a lesson inside the neutral chrome
 *   resolve their own roles;
 * - every text pair a child reads at 4.5:1 in light and dark, a field's placeholder too, a typed
 *   field's active edge at 3:1;
 * - no focus drawn on a button or an option (owner, 2026-10-26, dl-uukj.29.93, replacing the inner
 *   frame of paper-behaviour/README.md §2), while help's "look here" ring stays;
 * - an option's pressed edge and its key badge follow its tone (the ChooseStep tone table);
 * - every mark a child must see, in a picture or on a part, at 3:1 on what it is drawn on;
 * - green for right, red for a miss and for nothing else, the main action neither;
 * - a picked option in its own hue, never the main action's and never a verdict's;
 * - help in a colour of its own, not a verdict's;
 * - the three tiers: literal colours only among the primitives, and the aliases read only roles.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * A file as these checks read it: comments out, and Biome's formatting undone, so a selector or a
 * line reads as it was written: quotes single, and a rule or a call that Biome wrapped onto several
 * lines back on one.
 */
const flat = (text: string): string =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/"/g, "'")
    .replace(/\s*\n\s*/g, " ")
    .replace(/\(\s+/g, "(")
    .replace(/,?\s+\)/g, ")");
// Comments go first, so a block's selector is only its selector.
const CSS = flat(readFileSync(join(import.meta.dirname, "foundation.css"), "utf-8"));
/** The heads of Zeszyt's blocks: primitives and type, the day roles, the aliases, the night roles. */
const TOKENS = ":root, :host";
const DAY = ":root, :host, [theme='light']";
const ALIASES = ":root, :host, [theme], [data-lesson-theme]";
const DARK = "[theme='dark']";

/** Every custom property in the blocks whose selector is exactly `selector`, as written. */
function declared(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [, head = "", body = ""] of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (head.trim() !== selector) continue;
    for (const [, name = "", value = ""] of body.matchAll(/--([\w-]+):\s*([^;]+);/g))
      out[name] = value.trim();
  }
  return out;
}

function resolve(vars: Record<string, string>, name: string, seen: string[] = []): string {
  const v = vars[name];
  expect(v, `--${name} is set`).toBeDefined();
  const ref = /^var\(--([\w-]+)\)$/.exec(v ?? "")?.[1];
  if (ref === undefined) return (v ?? "").toLowerCase();
  expect(seen, `--${name} does not loop`).not.toContain(name);
  return resolve(vars, ref, [...seen, name]);
}

const light = { ...declared(TOKENS), ...declared(DAY), ...declared(ALIASES) };
const dark = { ...light, ...declared(DARK) };
const MODES = { light, dark };
const c = (vars: Record<string, string>, name: string) => resolve(vars, name);

function rgb(hex: string): [number, number, number] {
  const channel = (i: number) => parseInt(hex.slice(i, i + 2), 16);
  return [channel(1), channel(3), channel(5)];
}

const unit = (hex: string): [number, number, number] => {
  const [r, g, b] = rgb(hex);
  return [r / 255, g / 255, b / 255];
};

function hue(hex: string): number {
  const [r, g, b] = unit(hex);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

function chroma(hex: string): number {
  const [r, g, b] = unit(hex);
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const linear = (s: number) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4);
    const [r, g, b2] = unit(hex);
    return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b2);
  };
  const [hi = 0, lo = 0] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const isRed = (h: number) => h < 20 || h > 330;
const isGreen = (h: number) => h >= 90 && h <= 170;

const ROLES = [
  "ground",
  "card",
  "prompt-card",
  "ink",
  "ink-soft",
  "placeholder",
  "line",
  "line-strong",
  "act",
  "on-act",
  "act-edge",
  "act-quiet",
  "on-act-quiet",
  "focus",
  "on-focus",
  "pick",
  "pick-edge",
  "pick-ink",
  "help",
  "help-edge",
  "help-ink",
  "right",
  "right-edge",
  "right-ink",
  "right-act",
  "on-right-act",
  "right-act-edge",
  "miss",
  "miss-edge",
  "miss-ink",
  "on-miss-edge",
  "miss-act",
  "on-miss-act",
  "miss-act-edge",
  "rest",
  "rest-ink",
  "brand-go",
  "crown",
  "crown-line",
];

// Every pair a child reads: text on each surface, the main action, a picked option, help, each
// verdict band and the action inside it, and Sprawdź at rest.
const TEXT_PAIRS: [string, string][] = [
  ["jw-ink", "jw-ground"],
  ["jw-ink", "jw-card"],
  ["jw-ink", "jw-prompt-card"],
  ["jw-ink", "jw-pick"],
  ["jw-ink", "jw-help"],
  ["jw-ink-soft", "jw-ground"],
  ["jw-ink-soft", "jw-prompt-card"],
  ["jw-ink-soft", "jw-help"],
  ["jw-placeholder", "jw-card"],
  ["jw-placeholder", "jw-ground"],
  ["jw-placeholder", "jw-prompt-card"],
  ["jw-on-act", "jw-act"],
  ["jw-on-act-quiet", "jw-act-quiet"],
  ["jw-on-focus", "jw-focus"],
  ["jw-focus", "jw-card"],
  ["jw-focus", "jw-ground"],
  ["jw-pick-ink", "jw-pick"],
  ["jw-help-ink", "jw-help"],
  ["jw-right-ink", "jw-right"],
  ["jw-right-ink", "jw-ground"],
  ["jw-on-right-act", "jw-right-act"],
  ["jw-miss-ink", "jw-miss"],
  ["jw-miss-ink", "jw-ground"],
  ["jw-on-miss-act", "jw-miss-act"],
  ["jw-rest-ink", "jw-rest"],
  ["jw-brand-go", "jw-ground"],
];

// The marks a child must see (lesson-frame/README.md §6): dots, ticks and lines drawn in a picture
// on the paper, a card or the question card, and the edge of a pick, a right part and a missed part
// on its own fill. Not text, so 3:1 (WCAG 1.4.11).
const MARKS = [
  "jw-ink",
  "jw-ink-soft",
  "jw-focus",
  "jw-pick-edge",
  "jw-right-edge",
  "jw-miss-edge",
  "jw-help-edge",
];
const MARK_GROUNDS = ["jw-ground", "jw-card", "jw-prompt-card"];
const MARK_PAIRS: [string, string][] = [
  ...MARKS.flatMap((m) => MARK_GROUNDS.map((g): [string, string] => [m, g])),
  ["jw-pick-edge", "jw-pick"],
  ["jw-right-edge", "jw-right"],
  ["jw-miss-edge", "jw-miss"],
  ["jw-help-edge", "jw-help"],
];

/** A selector list split at its top-level commas, not those inside :is() or :not(). */
function selectorList(list: string): string[] {
  const out = [""];
  let depth = 0;
  for (const ch of list) {
    depth += ch === "(" ? 1 : ch === ")" ? -1 : 0;
    if (ch === "," && depth === 0) out.push("");
    else out[out.length - 1] += ch;
  }
  return out.map((x) => x.trim());
}

/** Every rule in the file, as written: its selectors and its declarations. */
function rules(): { selectors: string[]; body: string }[] {
  return [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selectors: selectorList(m[1] ?? ""),
    body: m[2] ?? "",
  }));
}

const STAGE = flat(readFileSync(join(import.meta.dirname, "stage.css"), "utf-8"));

describe("keyboard focus", () => {
  // The owner removed the focus frame (2026-10-26): the keyboard still moves the focus, but a
  // button, an option, a tile, a key, a toggle or the sound button draws nothing for it.
  it("draws no focus on a button or an option, by keyboard or by tap", () => {
    const none = rules().find((r) =>
      r.selectors.some(
        (x) =>
          x.includes(":focus-visible:not(.kid-look)") &&
          x.includes("button") &&
          x.includes("[role='radio']"),
      ),
    );
    expect(none?.body).toMatch(/outline:\s*none;/);
    expect(none?.body).toMatch(/--tw-ring-color:\s*transparent;/);
    for (const role of [
      "[role='checkbox']",
      "[data-tile]",
      "[data-slot='toggle']",
      "[data-key-click]",
    ])
      expect(none?.selectors[0], role).toContain(role);
  });

  it("keeps no inner frame, no frame colour and no held-on sample", () => {
    expect(CSS).not.toMatch(/--jw-frame/);
    expect(CSS).not.toMatch(/data-focus-shown/);
    for (const r of rules()) {
      if (!/outline:\s*var\(/.test(r.body)) continue;
      // A dropdown's options show ↑ ↓ with an outline on :focus-visible (Slots addendum 2.2, dl-4e0f).
      for (const sel of r.selectors)
        expect(sel, sel).toMatch(/kid-look|\ba:focus-visible$|\[data-menu-option\]:focus-visible$/);
    }
  });
});

describe("option tones", () => {
  const edgeOf = (needle: string) =>
    rules()
      .find((r) => r.selectors.some((x) => x.includes(needle)) && /--jw-edge:/.test(r.body))
      ?.body.match(/--jw-edge:\s*([^;]+);/)?.[1]
      ?.trim();

  // ChooseStep's tone table: idle on the line, picked on the pick's edge, right on the right edge,
  // a miss on none. The rule that draws every option's edge reads --jw-edge, so its weight never
  // hides a tone (it once kept every option on the beige line).
  it("stands each option on its tone's edge", () => {
    const drawn = rules().filter((r) =>
      /box-shadow:\s*0 var\(--jw-press\) 0 var\(--jw-edge, var\(--jw-line\)\)/.test(r.body),
    );
    expect(
      drawn.some((r) =>
        r.selectors.some((x) => x.includes("label[data-option]:has(> input[type='radio'])")),
      ),
    ).toBe(true);
    expect(edgeOf("label[data-checked]")).toBe("var(--jw-pick-edge)");
    expect(edgeOf("[role='checkbox'][aria-checked='true']")).toBe("var(--jw-pick-edge)");
    expect(edgeOf("[data-tone='green']")).toBe("var(--jw-right-edge)");
    expect(edgeOf("[data-tone='try_again']")).toBe("transparent");
    // The miss and the right come after the pick at the same weight, so they win on a picked option.
    const pick = rules().findIndex(
      (r) =>
        r.selectors.some((x) => x.includes("label[data-checked]")) && /--jw-edge:/.test(r.body),
    );
    const red = rules().findIndex(
      (r) =>
        r.selectors.some((x) => x.includes("[data-tone='try_again']")) && /--jw-edge:/.test(r.body),
    );
    expect(red).toBeGreaterThan(pick);
  });

  // The badge takes its option's edge colour and ink in every tone but rest: "1" is blue on a
  // pick, green on a right answer, red on a miss, ink on the solution. Colour only.
  it("gives the key badge its option's colours once the option leaves rest", () => {
    const block = STAGE.match(/[^{}]+\{[^{}]*\}/g)?.find(
      (b) => b.includes("> [data-key-badge]") && b.includes("inherit"),
    );
    expect(block).toBeDefined();
    for (const state of [
      "[data-checked]",
      "[aria-checked='true']",
      ":not([data-tone='idle'])",
      "[data-help-removed]",
      "[data-solution]",
    ])
      expect(block, state).toContain(state);
    const body = block?.slice(block.indexOf("{")) ?? "";
    expect(body).toMatch(/border-color:\s*inherit;/);
    expect(body).toMatch(/\bcolor:\s*inherit;/);
    expect(body).not.toMatch(/width|height|padding|margin|border-style/);
  });
});

describe("where the tokens apply", () => {
  /** Every block head in the file, as written. */
  const heads = [...CSS.matchAll(/([^{}]+)\{/g)].map((m) => (m[1] ?? "").trim());

  it("puts the primitives, the type and the day roles at :root, and the night roles on [theme='dark']", () => {
    expect(declared(TOKENS)["jw-p-white"]).toBe("#ffffff");
    expect(declared(TOKENS)["jw-size-prompt"]).toBe("2rem");
    expect(declared(DAY)["jw-ground"]).toBe("var(--jw-p-white)");
    expect(declared(DARK)["jw-ground"]).toBe("var(--jw-p-night-25)");
  });

  // A custom property resolves its var() where it is declared: the aliases are declared again on a
  // nested theme (the System page's By day and By night columns) and on a lesson (the playground's
  // chrome sets its own colours on <html>), or both would read the root's roles.
  it("declares the aliases again on every [theme] and every [data-lesson-theme]", () => {
    expect(heads).toContain(ALIASES);
    expect(declared(ALIASES)["primary"]).toBe("var(--jw-focus)");
    expect(declared(ALIASES)["kid-correct"]).toBe("var(--jw-right-edge)");
  });

  it("comes after the day roles with the night roles, so a dark <html> reads them", () => {
    expect(heads.indexOf(DARK)).toBeGreaterThan(heads.indexOf(DAY));
  });

  // The lesson's weight, leading and digits are its own: the parent's pages keep the browser's.
  it("keeps the lesson's text rules and no token under [data-lesson-theme]", () => {
    const bodies = (head: string) =>
      [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
        .filter((m) => (m[1] ?? "").trim() === head)
        .map((m) => m[2] ?? "")
        .join(" ");
    const lesson = bodies("[data-lesson-theme]");
    expect(lesson).toMatch(/font-weight:\s*var\(--jw-weight-text\);/);
    expect(lesson).toMatch(/line-height:\s*var\(--jw-leading\);/);
    expect(lesson).toMatch(/font-variant-numeric:\s*tabular-nums lining-nums;/);
    expect(bodies(ALIASES)).not.toMatch(/(^|;)\s*(font-weight|line-height|font-variant-numeric):/);
    for (const [, head = "", body = ""] of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!head.includes("data-lesson-theme") || head.trim() === ALIASES) continue;
      expect(body, head.trim()).not.toMatch(/--jw-(p-|ground|act|ink|font|dur-)[\w-]*:/);
    }
  });
});

describe("the three tiers", () => {
  it("keeps literal colours among the primitives", () => {
    for (const [name, value] of Object.entries(light)) {
      if (/#[0-9a-f]{3,8}\b/i.test(value)) expect(name, `--${name}: ${value}`).toMatch(/^jw-p-/);
    }
    for (const [name, value] of Object.entries(declared(DARK)))
      expect(value, `dark --${name}`).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });

  it("sets every role by day and again by night", () => {
    const night = declared(DARK);
    for (const role of ROLES) {
      expect(light[`jw-${role}`], `--jw-${role}`).toMatch(/^var\(--jw-p-/);
      expect(night[`jw-${role}`], `dark --jw-${role}`).toMatch(/^var\(--jw-p-/);
    }
  });

  it("builds every alias from a role, never from a primitive", () => {
    for (const [name, value] of Object.entries(light)) {
      if (name.startsWith("jw-") || !value.startsWith("var(--")) continue;
      expect(value, `--${name}`).toMatch(/^var\(--jw-(?!p-)/);
    }
  });
});

describe.each(Object.keys(MODES) as (keyof typeof MODES)[])("the foundation in %s", (mode) => {
  const vars = MODES[mode];

  it.each(TEXT_PAIRS)("holds %s on %s to 4.5:1", (fg, bg) => {
    expect(
      contrast(c(vars, fg), c(vars, bg)),
      `${c(vars, fg)} on ${c(vars, bg)}`,
    ).toBeGreaterThanOrEqual(4.5);
  });

  it.each(MARK_PAIRS)("holds the mark %s on %s to 3:1", (mark, bg) => {
    expect(
      contrast(c(vars, mark), c(vars, bg)),
      `${c(vars, mark)} on ${c(vars, bg)}`,
    ).toBeGreaterThanOrEqual(3);
  });

  it("holds a typed field's active edge to 3:1 on the ground and the card", () => {
    expect(contrast(c(vars, "jw-focus"), c(vars, "jw-ground"))).toBeGreaterThanOrEqual(3);
    expect(contrast(c(vars, "jw-focus"), c(vars, "jw-card"))).toBeGreaterThanOrEqual(3);
  });

  it("makes right green and a miss red", () => {
    for (const n of ["jw-right", "jw-right-edge", "jw-right-ink"])
      expect(isGreen(hue(c(vars, n))), n).toBe(true);
    for (const n of ["jw-miss", "jw-miss-edge", "jw-miss-ink"])
      expect(isRed(hue(c(vars, n))), n).toBe(true);
  });

  it("uses red only for a miss and green only for right", () => {
    for (const role of ROLES) {
      const hex = c(vars, `jw-${role}`);
      if (chroma(hex) < 0.12) continue;
      if (!role.includes("miss")) expect(isRed(hue(hex)), `--jw-${role} ${hex}`).toBe(false);
      if (!role.includes("right")) expect(isGreen(hue(hex)), `--jw-${role} ${hex}`).toBe(false);
    }
  });

  // The design makes the pick and the action both blue on purpose (owner, 2026-10-24): a pick is
  // a pale fill on a strong edge, the action a mid fill on a darker edge, so they never look alike.
  it("never draws a picked option like the main action", () => {
    expect(c(vars, "jw-pick")).not.toBe(c(vars, "jw-act"));
    expect(c(vars, "jw-pick-edge")).not.toBe(c(vars, "jw-act-edge"));
    expect(isRed(hue(c(vars, "jw-pick-edge"))) || isGreen(hue(c(vars, "jw-pick-edge")))).toBe(
      false,
    );
  });

  // The active field is paper (Enter addendum 2.1); the pick is the selection behind its digits
  // after a miss, so the ink caret beside it still reads.
  it("keeps a typed field's ink caret at 3:1 on the pick of a selection", () => {
    expect(contrast(c(vars, "jw-focus"), c(vars, "jw-pick"))).toBeGreaterThanOrEqual(3);
  });

  it("reads selected digits at 4.5:1 in the pick", () => {
    expect(contrast(c(vars, "jw-pick-ink"), c(vars, "jw-pick"))).toBeGreaterThanOrEqual(4.5);
  });

  it("gives help a hue apart from the verdicts", () => {
    const h = hue(c(vars, "jw-help"));
    expect(isRed(h) || isGreen(h)).toBe(false);
  });
});

describe("the child sizes", () => {
  const rem = (name: string) =>
    [...CSS.matchAll(new RegExp(`--${name}:\\s*([\\d.]+)rem`, "g"))].map((m) => Number(m[1]) * 16);

  it("keeps the prompt at 28 px or more and an option at 24 px or more, on a phone too", () => {
    for (const px of rem("jw-size-prompt")) expect(px).toBeGreaterThanOrEqual(28);
    for (const px of rem("jw-size-option")) expect(px).toBeGreaterThanOrEqual(24);
  });

  it("never narrows a tap target", () => {
    expect(CSS).not.toMatch(/--kid-(tap-min|key-size|commit-height):/);
  });

  // Decision 2026-10-30-a-task-s-readout-is-44-px-on-a-laptop-and-36-px-on-a-phone: the readout
  // keeps one step above the prompt in both frames, set wherever the phone sizes are.
  it("draws a task's readout at 44 px on a laptop and 36 px on a phone, above the prompt", () => {
    expect(declared(TOKENS)["jw-size-target"]).toBe("2.75rem");
    expect(rem("jw-size-target")).toEqual([44, 36, 36]);
    expect(Math.min(...rem("jw-size-target"))).toBeGreaterThan(Math.max(...rem("jw-size-prompt")));
  });
});

describe("the adult sizes on an app page", () => {
  const rem = (name: string) =>
    [...CSS.matchAll(new RegExp(`--${name}:\\s*([\\d.]+)rem`, "g"))].map((m) => Number(m[1]) * 16);

  // Decision 2026-10-30-app-pages-take-an-adult-type-scale-h1-28-h2-22-body-17-and-the-a.
  it("sets 28, 22 and 17 at :root, and 26 and 20 on a phone", () => {
    expect(declared(TOKENS)["jw-page-h1"]).toBe("1.75rem");
    expect(declared(TOKENS)["jw-page-h2"]).toBe("1.375rem");
    expect(declared(TOKENS)["jw-page-body"]).toBe("1.0625rem");
    expect(declared(TOKENS)["jw-page-leading"]).toBe("1.5");
    // The phone's step, then the parent's density (below) sets its own.
    expect(rem("jw-page-h1")).toEqual([28, 26, 20]);
    expect(rem("jw-page-h2")).toEqual([22, 20, 15]);
  });

  it("keeps the adult scale off a lesson's own rules", () => {
    const lesson = [...CSS.matchAll(/\[data-lesson-theme[^{]*\{([^}]*)\}/g)].map((m) => m[1] ?? "");
    for (const body of lesson) expect(body).not.toMatch(/--jw-page-/);
  });
});

// Decision 2026-11-01-the-parent-app-is-a-sidebar-shell-and-a-3-column-lesson-workspac (dl-xo0q).
describe("the parent's density", () => {
  const PARENT = "[data-density='parent']";
  const KID = "[data-density='parent'] :is([data-lesson-theme], [data-density='kid'])";
  const px = (v: string | undefined) => Number(/^([\d.]+)rem$/.exec(v ?? "")?.[1]) * 16;

  it("sets body 14, small 12.5, a control 34, corners 10 and 8, 1 px lines and a 3 px edge", () => {
    const d = declared(PARENT);
    expect(px(d["jw-page-body"])).toBe(14);
    expect(px(d["jw-page-small"])).toBe(12.5);
    expect(px(d["jw-size-body"])).toBe(14);
    expect(px(d["jw-control-height"])).toBe(34);
    expect(px(d["jw-radius-control"])).toBe(10);
    expect(px(d["jw-radius-small"])).toBe(8);
    expect(d["jw-border"]).toBe("1px");
    expect(d["jw-press"]).toBe("3px");
  });

  // An alias resolves where it is declared, so the density declares the ones it changes again.
  it("declares the radius and press aliases again", () => {
    for (const block of [PARENT, KID]) {
      expect(declared(block)["radius"], block).toBe("var(--jw-radius-control)");
      expect(declared(block)["kid-press"], block).toBe("var(--jw-press)");
    }
  });

  it("gives a lesson inside it back every size the density changed, at the :root value", () => {
    const parent = declared(PARENT);
    const kid = declared(KID);
    const root = declared(TOKENS);
    for (const name of Object.keys(parent)) {
      if (name.startsWith("jw-page-") || !name.startsWith("jw-")) continue;
      expect(kid[name], `--${name}`).toBe(root[name]);
    }
  });

  it("sets nothing but sizes: no colour, no role", () => {
    for (const block of [PARENT, KID])
      for (const [name, value] of Object.entries(declared(block))) {
        expect(value, `--${name}`).not.toMatch(/#[0-9a-f]{3,8}\b/i);
        expect(name, `--${name}`).not.toMatch(
          /^jw-(p-|ground|card|ink|act|pick|focus|right|miss|help)/,
        );
      }
  });
});

describe("the footer line", () => {
  // The plain footer and the solution band draw a 2px line on top, straight across the full width
  // (ChooseStep.dc.html). A rounded bar bent that top border down at both ends on a step on its own
  // (dl-uukj.29.96). Only a band with no line, right or a miss, keeps its corners.
  const onTheBar = /\[data-bar\](?:\[[^\]]*\]|:is\([^)]*\))*$/;
  const rounded = [STAGE, CSS]
    .flatMap((css) => [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)])
    .filter((m) => /border-radius:/.test(m[2] ?? ""))
    .map((m) => (m[1] ?? "").trim())
    .filter((sel) => onTheBar.test(sel));

  it("draws the line on top of the bar", () => {
    expect(STAGE).toMatch(/\[data-bar\]\s*\{[^}]*border-top:\s*0\.125rem solid var\(--band-line\)/);
  });

  it("gives corners only to a band that draws no line", () => {
    expect(rounded.length).toBeGreaterThan(0);
    for (const sel of rounded)
      expect(sel, sel).toMatch(/\[data-bar\]:is\(\[data-band='right'\], \[data-band='miss'\]\)$/);
  });
});

/** The declarations of the first block whose selector contains every one of `parts`. */
function block(...parts: string[]): Record<string, string> {
  for (const [, head = "", body = ""] of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!parts.every((p) => head.includes(p))) continue;
    return Object.fromEntries(
      [...body.matchAll(/([\w-]+):\s*([^;]+);/g)].map(([, name = "", value = ""]) => [
        name,
        value.trim(),
      ]),
    );
  }
  throw new Error(`no block for ${parts.join(" ")}`);
}

// The states of a typed field (Enter addendum 2.1, 2.3, section 5; decision dl-y3th 14b and 4b,
// replacing dl-uukj.29.99's mark fill): active is paper with the ink edge and caret; a marked field
// the child is in (just after the miss, or back after a click away) is the same paper with the answer
// selected in the pick; away it is only marked, dashed red (tone.ts); right is green and flat.
describe("a typed field's states", () => {
  const active = block("[data-lesson-theme='zeszyt'] [data-active='true']");
  const marked = block("[data-tone='try_again']:is(:focus, [data-active='true'])");
  const right = block("[data-box])[data-tone='green']");

  it("draws the active field on paper inside the ink edge, never the pick's fill", () => {
    expect(active["background-color"]).toBe("var(--jw-card)");
    expect(active["border-color"]).toBe("var(--jw-focus)");
  });

  it("draws a marked field the child is in exactly as the active one: paper, one solid ink edge, no ring", () => {
    expect(marked["border-style"]).toBe("solid");
    expect(marked["border-color"]).toBe("var(--jw-focus)");
    expect(marked["background-color"]).toBe("var(--jw-card)");
    expect(marked["color"]).toBe("var(--jw-ink)");
    expect(marked["outline"]).toBe("none");
  });

  it("covers a typed field, the keypad's field, a keypad box and a fraction box", () => {
    const sel = [...CSS.matchAll(/([^{}]+)\{/g)]
      .map((m) => m[1] ?? "")
      .find((x) => x.includes("[data-tone='try_again']:is(:focus"));
    for (const kind of [
      "input:not(",
      "[role='textbox'][data-field]",
      "button[data-field]",
      "button[data-box]",
    ])
      expect(sel).toContain(kind);
  });

  it("draws a right field flat, with no pressed edge", () => {
    expect(right["box-shadow"]).toBe("none");
  });

  it("never changes a field's box between states: no width, padding or border width in these rules", () => {
    for (const rule of [active, marked, right])
      for (const prop of Object.keys(rule))
        expect(prop).not.toMatch(/^(width|height|padding|margin|border-width|min-)/);
  });

  it("draws the keypad's 3px ink caret on the active field, taking no width", () => {
    const caret = block("[data-field][data-active='true']::after");
    expect(caret["width"]).toBe("3px");
    expect(caret["background-color"]).toBe("var(--jw-focus)");
    expect(caret["margin-inline"]).toBe("1px -4px");
  });

  it("selects keypad digits in the pick, as an input's selection", () => {
    const sel = block("[data-lesson-theme='zeszyt'] [data-selection]");
    expect(sel["background-color"]).toBe("var(--jw-pick)");
    expect(sel["color"]).toBe("var(--jw-pick-ink)");
    const native = block("[data-lesson-theme='zeszyt'] ::selection");
    expect(native["background-color"]).toBe("var(--jw-pick)");
  });
});
