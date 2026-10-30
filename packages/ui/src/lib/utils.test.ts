/**
 * cn() merges Tailwind classes for the shadcn/ui primitives (dl-0ax3 foundation). The kid
 * type sizes (text-kid-say, text-kid-answer) are font sizes, not colours: without the
 * tailwind-merge extension they would be read as text colours and silently dropped beside
 * colour classes (text-primary, text-kid-*). The named size, radius, shadow, duration and easing
 * utilities of styles/tailwind.css are told apart the same way (dl-uukj.32), so the later class of
 * a pair wins instead of both surviving.
 */

import { describe, expect, it } from "vitest";
import { cn } from "./utils.ts";

describe("cn", () => {
  it("joins conditional classes", () => {
    expect(cn("a", false && "b", undefined, "c")).toBe("a c");
  });

  it("keeps a kid type size beside a text colour", () => {
    expect(cn("text-kid-answer", "text-primary-foreground")).toBe(
      "text-kid-answer text-primary-foreground",
    );
    expect(cn("text-kid-say", "text-kid-correct-ink")).toBe("text-kid-say text-kid-correct-ink");
  });

  it("lets a later font size replace an earlier one", () => {
    expect(cn("text-xl", "text-kid-answer")).toBe("text-kid-answer");
    expect(cn("text-kid-answer", "text-kid-say")).toBe("text-kid-say");
  });

  it("lets a later colour replace an earlier one", () => {
    expect(cn("bg-primary", "bg-kid-correct")).toBe("bg-kid-correct");
  });

  it("keeps a Zeszyt size beside a Zeszyt colour", () => {
    expect(cn("text-jw-body", "text-jw-ink")).toBe("text-jw-body text-jw-ink");
    expect(cn("text-jw-key", "text-jw-ink-soft")).toBe("text-jw-key text-jw-ink-soft");
  });

  it.each([
    ["min-h-kid-tap min-h-kid-key", "min-h-kid-key"],
    ["min-h-[var(--kid-tap-min)] min-h-jw-control", "min-h-jw-control"],
    ["min-w-kid-tap min-w-kid-key", "min-w-kid-key"],
    ["gap-3 gap-kid-choice", "gap-kid-choice"],
    ["min-h-kid-status min-h-0", "min-h-0"],
    ["min-h-kid-tap min-h-0", "min-h-0"],
    ["rounded-lg rounded-jw-small", "rounded-jw-small"],
    ["shadow-xs shadow-jw-act", "shadow-jw-act"],
    ["duration-jw-fast duration-200", "duration-200"],
    ["ease-out ease-jw-out", "ease-jw-out"],
    ["text-xl text-jw-body", "text-jw-body"],
    ["text-[1.875rem] text-jw-key", "text-jw-key"],
    ["text-jw-key text-jw-key-sign", "text-jw-key-sign"],
    ["text-jw-option text-jw-key-strip", "text-jw-key-strip"],
    ["text-jw-small text-jw-unit", "text-jw-unit"],
    ["text-jw-prompt text-jw-target", "text-jw-target"],
    ["text-jw-prompt text-jw-page-h1", "text-jw-page-h1"],
    ["text-jw-body text-jw-page-body", "text-jw-page-body"],
    ["leading-tight leading-jw-page", "leading-jw-page"],
  ])("lets the later named utility win: %s", (pair, winner) => {
    expect(cn(pair)).toBe(winner);
  });
});
