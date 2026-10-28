/**
 * cn() merges Tailwind classes for the shadcn/ui primitives (dl-0ax3 foundation). The kid
 * type sizes (text-kid-say, text-kid-answer) are font sizes, not colours: without the
 * tailwind-merge extension they would be read as text colours and silently dropped beside
 * colour classes (text-primary, text-kid-*).
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
});
