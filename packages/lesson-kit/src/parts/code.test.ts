/**
 * Inline code and the terminal card as data (dl-i952.19): the backtick split, speakable, the copy
 * rule and our own bd-aware tokenizer.
 */

import { describe, expect, it } from "vitest";
import type { TerminalCard } from "../stage/types.ts";
import { copyable, copyLabel, hasPlaceholder, speakable, splitInline, tokens } from "./code.ts";

const kinds = (cmd: string) => tokens(cmd).filter(([, k]) => k !== null);

describe("splitInline", () => {
  it("cuts a string at its backtick pairs and keeps the rest as text", () => {
    expect(splitInline("What does `bd ready` list?")).toEqual([
      { code: false, text: "What does " },
      { code: true, text: "bd ready" },
      { code: false, text: " list?" },
    ]);
  });

  it("makes a string that is one span one chip", () => {
    expect(splitInline("`bd dep add demo-2ma demo-xbx`")).toEqual([
      { code: true, text: "bd dep add demo-2ma demo-xbx" },
    ]);
  });

  it("leaves a string with no marks as it is, and shows a stray backtick as text", () => {
    expect(splitInline("7 × 8 = 56")).toEqual([{ code: false, text: "7 × 8 = 56" }]);
    expect(splitInline("a `b")).toEqual([{ code: false, text: "a `b" }]);
  });
});

describe("speakable", () => {
  it("removes the marks and nothing else", () => {
    expect(speakable("Type `bd ready`, then `bd list`.")).toBe("Type bd ready, then bd list.");
  });
});

describe("copyable", () => {
  const card = (copy: boolean, cmd: string): [TerminalCard, TerminalCard["lines"][number]] => {
    const line = { cmd, out: null };
    return [{ lang: "bash", copy, lines: [line] }, line];
  };

  it("offers copy only when the card does and the line has no placeholder", () => {
    expect(copyable(...card(true, "bd -C $DL_LAB ready"))).toBe(true);
    expect(copyable(...card(false, "bd -C $DL_LAB ready"))).toBe(false);
    expect(copyable(...card(true, "bd -C $DL_LAB update <Buy paint id> --claim"))).toBe(false);
    expect(hasPlaceholder("rm -rf $DL_LAB")).toBe(false);
  });
});

describe("tokens", () => {
  it("joins back to the command exactly", () => {
    for (const cmd of [
      "export DL_LAB=~/.local/share/dl/labs/demo-learner/beads-starter",
      "mkdir -p $DL_LAB && (cd $DL_LAB && bd init --prefix demo --skip-agents)",
      'bd -C $DL_LAB close <Buy paint id> --reason "Two cans of white"',
    ]) {
      expect(
        tokens(cmd)
          .map(([t]) => t)
          .join(""),
      ).toBe(cmd);
    }
  });

  it("tells the command, bd verbs and ids apart", () => {
    expect(kinds("bd dep add demo-2ma demo-xbx")).toEqual([
      ["bd", "cmd"],
      ["dep", "verb"],
      ["add", "verb"],
      ["demo-2ma", "id"],
      ["demo-xbx", "id"],
    ]);
  });

  it("still finds the verb after -C and its folder", () => {
    expect(kinds("bd -C $DL_LAB dep add <Paint the fence id> <Buy paint id>")).toEqual([
      ["bd", "cmd"],
      ["-C", "flag"],
      ["$DL_LAB", "path"],
      ["dep", "verb"],
      ["add", "verb"],
      ["<Paint the fence id>", "ph"],
      ["<Buy paint id>", "ph"],
    ]);
  });

  it("marks flags, strings, operators and a new command after an operator", () => {
    expect(
      kinds("mkdir -p $DL_LAB && (cd $DL_LAB && bd init --prefix demo --skip-agents)"),
    ).toEqual([
      ["mkdir", "cmd"],
      ["-p", "flag"],
      ["$DL_LAB", "path"],
      ["&&", "op"],
      ["(", "op"],
      ["cd", "cmd"],
      ["$DL_LAB", "path"],
      ["&&", "op"],
      ["bd", "cmd"],
      ["init", "verb"],
      ["--prefix", "flag"],
      ["demo", "arg"],
      ["--skip-agents", "flag"],
      [")", "op"],
    ]);
    expect(kinds('bd create "Buy paint" -p 1')).toEqual([
      ["bd", "cmd"],
      ["create", "verb"],
      ['"Buy paint"', "str"],
      ["-p", "flag"],
      ["1", "arg"],
    ]);
  });

  it("marks no verb after an id or a flag", () => {
    expect(kinds("bd dep demo-xbx --blocks demo-2ma").map(([, k]) => k)).toEqual([
      "cmd",
      "verb",
      "id",
      "flag",
      "id",
    ]);
  });
});

describe("tokens: every command comes back exactly (review of dl-i952.19)", () => {
  const TRICKY = [
    "",
    " ",
    "#",
    'bd -C $DL_LAB close demo-xbx --reason "Two cans # of <white> & more | less; 😀"',
    "bd create 'it''s' \"unclosed",
    "<<>><Buy paint id>&&||;;(())",
    "echo `id` $(whoami) ${HOME} \\ \t tab",
    "x".repeat(2000),
    "😀 🎨 ✓ ○ ● — …",
  ];

  it.each(TRICKY)("joins back to %j", (cmd) => {
    expect(
      tokens(cmd)
        .map(([t]) => t)
        .join(""),
    ).toBe(cmd);
  });

  it("joins back for a thousand random strings of the characters a shell cares about", () => {
    const alphabet = [
      '"',
      "'",
      "#",
      "<",
      ">",
      "&",
      "|",
      ";",
      "(",
      ")",
      " ",
      "\t",
      "a",
      "Z",
      "0",
      "-",
      "--",
      "$",
      "~",
      "/",
      "\\",
      "`",
      "=",
      "*",
      "😀",
      "bd",
      "demo-2ma",
    ];
    let seed = 19;
    const next = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31);
    for (let i = 0; i < 1000; i++) {
      const cmd = Array.from(
        { length: next() % 60 },
        () => alphabet[next() % alphabet.length],
      ).join("");
      expect(
        tokens(cmd)
          .map(([t]) => t)
          .join(""),
        JSON.stringify(cmd),
      ).toBe(cmd);
    }
  });
});

describe("copyLabel", () => {
  it("keeps a short command whole and cuts a long one at the end, with an ellipsis", () => {
    expect(copyLabel("bd -C $DL_LAB ready")).toBe("bd -C $DL_LAB ready");
    const long = "export DL_LAB=~/.local/share/dl/labs/demo-learner/2026-10-08-beads-starter";
    expect(copyLabel(long)).toHaveLength(60);
    expect(copyLabel(long).endsWith("…")).toBe(true);
    expect(long.startsWith(copyLabel(long).slice(0, -1))).toBe(true);
  });
});
