import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkWorklog } from "./check-worklog.ts";

describe("checkWorklog", () => {
  it("passes a good note and names each bad one", () => {
    const dir = mkdtempSync(join(tmpdir(), "worklog-"));
    mkdirSync(join(dir, "dl-5ssh.34"));
    writeFileSync(join(dir, "dl-5ssh.34", "2026-10-26-skeleton.md"), "# dl-5ssh.34: skeleton\n");
    expect(checkWorklog(dir)).toEqual([]);
    writeFileSync(join(dir, "dl-5ssh.34", "notes.md"), "x\n");
    writeFileSync(join(dir, "dl-5ssh.34", "2026-10-27-other.md"), "# no epic here\n");
    writeFileSync(join(dir, "loose.md"), "x\n");
    expect(checkWorklog(dir)).toHaveLength(3);
  });
});
