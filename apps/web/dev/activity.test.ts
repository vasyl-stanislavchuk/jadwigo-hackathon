import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { sessionFile } from "../../../tools/builder/drafts.ts";
import { activityOf, followedSession } from "./activity.ts";

let dir = "";
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "jw-activity-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

// A made-up session, no real names.
const row = (s: number, id: string, name: string, input: object) =>
  JSON.stringify({
    type: "assistant",
    timestamp: `2026-10-30T10:00:0${s}.000Z`,
    message: { content: [{ type: "tool_use", id, name, input }] },
  });
const result = (id: string, content: string, isError = false) =>
  JSON.stringify({
    type: "user",
    message: { content: [{ type: "tool_result", tool_use_id: id, content, is_error: isError }] },
  });

function session(id: string) {
  const transcript = join(dir, `${id}.jsonl`);
  mkdirSync(dirname(sessionFile(dir)), { recursive: true });
  writeFileSync(
    sessionFile(dir),
    JSON.stringify({ session_id: id, started_at: "", cwd: "/x", transcript }),
  );
  return transcript;
}

describe("followedSession", () => {
  it("follows the session session.json names, unless this server runs inside another one", () => {
    session("s1");
    expect(followedSession(dir, "")?.session_id).toBe("s1");
    expect(followedSession(dir, "s1")?.session_id).toBe("s1");
    expect(followedSession(dir, "s2")).toBeNull();
    expect(followedSession(join(dir, "none"), "")).toBeNull();
  });
});

describe("activityOf", () => {
  it("marks each line done, current or failed, from the transcript alone", () => {
    const transcript = session("s1");
    writeFileSync(
      transcript,
      [
        row(1, "a", "Edit", { file_path: "/x/apps/web/src/a.ts" }),
        result("a", "ok"),
        row(2, "b", "Bash", { command: "bun x" }),
        result("b", "exit 1", true),
        row(3, "c", "mcp__jadwigo__lesson_check", {}),
      ].join("\n"),
    );
    expect(activityOf(followedSession(dir, ""))).toEqual({
      session_id: "s1",
      steps: [
        { at: "2026-10-30T10:00:01.000Z", text: "Editing a.ts", mark: "done" },
        { at: "2026-10-30T10:00:02.000Z", text: "A command failed", mark: "failed" },
        { at: "2026-10-30T10:00:03.000Z", text: "Check: running", mark: "current" },
      ],
    });
  });

  it("says there is no session rather than showing someone else's", () => {
    expect(activityOf(null)).toEqual({ session_id: null, steps: [] });
  });
});
