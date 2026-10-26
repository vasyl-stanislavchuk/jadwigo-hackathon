import { describe, expect, it } from "vitest";
import { checkPrBody } from "./check-pr-body.ts";

const body = (door: string) =>
  `Issue: \`dl-x.1\`\n\n## Summary\n\nx\n\n## Evidence\n\ny\n\n## Merge Danger\n\n**Door:** ${door}\n\n**Blast Radius:** docs\n`;

describe("checkPrBody", () => {
  it("passes the /dev-pr shape", () => {
    expect(checkPrBody(body("two-way"))).toEqual([]);
    expect(checkPrBody(body("one-way: a migration"))).toEqual([]);
  });

  it("fails a door left as the placeholder", () => {
    expect(checkPrBody(body("<one-way or two-way>"))).toHaveLength(1);
  });

  it("fails the old template and an empty body", () => {
    expect(checkPrBody("## Issue\n\n## Evidence it works\n")).toHaveLength(4);
    expect(checkPrBody("")).toHaveLength(4);
  });
});
