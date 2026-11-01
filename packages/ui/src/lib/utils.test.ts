// cn() keeps a line's width beside its colour (dl-uukj.47.1): border-jw and its sides are widths,
// so a later border colour must not drop them, and two widths still resolve to the later one.
import { describe, expect, it } from "vitest";
import { cn } from "./utils.ts";

describe("cn", () => {
  it("keeps border-jw and each side beside a border colour", () => {
    expect(cn("border-jw border-transparent")).toBe("border-jw border-transparent");
    expect(cn("border-r-jw border-jw-line")).toBe("border-r-jw border-jw-line");
    expect(cn("border-t-jw border-b-jw border-jw-line")).toBe(
      "border-t-jw border-b-jw border-jw-line",
    );
  });

  it("lets a later width win over border-jw, as with any two widths", () => {
    expect(cn("border-jw border-2")).toBe("border-2");
  });

  it("reads the app frame's sizes as sizes, so the later one wins", () => {
    expect(cn("w-jw-shell-side w-jw-shell-rail")).toBe("w-jw-shell-rail");
    expect(cn("text-jw-page-body text-jw-page-small")).toBe("text-jw-page-small");
  });
});
