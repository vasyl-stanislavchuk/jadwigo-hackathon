import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mapTranscript, readTail, workSummary } from "./activity.ts";

// A made-up session: no real names, no learner data. Each call is an assistant row, each result a
// user row, as Claude Code writes them.
const at = (s: number) => `2026-10-30T10:00:${String(s).padStart(2, "0")}.000Z`;
const call = (s: number, id: string, name: string, input: object) =>
  JSON.stringify({
    type: "assistant",
    timestamp: at(s),
    message: { content: [{ type: "tool_use", id, name, input }] },
  });
const result = (id: string, content: unknown, isError = false) =>
  JSON.stringify({
    type: "user",
    timestamp: at(0),
    message: { content: [{ type: "tool_result", tool_use_id: id, content, is_error: isError }] },
  });

const DRAWN = JSON.stringify({
  draft_id: "draft_0a1b2c",
  questions: [{ set_id: "set-a" }, { set_id: "set-a" }, { set_id: "set-b" }],
});
const CHECKED = JSON.stringify({
  ok: false,
  findings: [{ level: "error" }, { level: "error" }, { level: "warn" }],
});

const FIXTURE = [
  JSON.stringify({ type: "user", message: { content: "make me a lesson" } }),
  call(1, "t1", "Read", { file_path: "/home/someone/repo/apps/web/src/adapter.ts" }),
  result("t1", "file text"),
  call(2, "t2", "Read", { file_path: "/home/someone/repo/apps/web/src/adapter.ts" }),
  result("t2", "file text"),
  call(3, "t3", "Bash", { command: "cat /home/someone/secret-notes.txt" }),
  result("t3", "No such file", true),
  call(4, "t4", "Bash", { command: "bun test" }),
  result("t4", "ok"),
  call(5, "t5", "mcp__jadwigo__lesson_draft", { request: "6 questions", names: [] }),
  result("t5", [{ type: "text", text: DRAWN }]),
  call(6, "t6", "TodoWrite", { todos: [] }),
  result("t6", "ok"),
  call(7, "t7", "Edit", { file_path: "/home/someone/repo/tools/builder/notes.md" }),
  result("t7", "ok"),
  call(8, "t8", "mcp__jadwigo__lesson_check", { draft_id: "draft_0a1b2c", help: {} }),
  result("t8", CHECKED),
  call(9, "t9", "mcp__jadwigo-builder__reply", { text: "q3 is fixed" }),
  result("t9", "replied (done)"),
  call(10, "t10", "Read", { file_path: "/home/someone/repo/README.md" }),
  '{"type":"assistant","timestamp":"2026-10-30T10:00:11.000Z","message":{"content":[{"type":"tool_u',
];

describe("mapTranscript", () => {
  const activity = mapTranscript(FIXTURE);

  it("words each call as one plain line, folding a repeat and keeping a failure apart", () => {
    expect(
      activity.steps.map((s) => [s.text, s.failed ? "failed" : s.open ? "open" : "done"]),
    ).toEqual([
      ["Reading adapter.ts", "done"],
      ["A command failed", "failed"],
      ["Running a command", "done"],
      ["Drew 3 questions from 2 sets", "done"],
      ["Editing notes.md", "done"],
      ["Check: 2 errors, 1 warning", "done"],
      ["Replied", "done"],
      ["Reading README.md", "open"],
    ]);
    expect(activity.calls).toHaveLength(9);
  });

  it("never lets a command's text or a full path reach a line", () => {
    const text = JSON.stringify(activity);
    expect(text).not.toContain("secret-notes");
    expect(text).not.toContain("bun test");
    expect(text).not.toContain("/home/someone");
  });

  it("says a check is running until its result is in", () => {
    const running = mapTranscript([call(1, "c1", "mcp__jadwigo__lesson_check", {})]);
    expect(running.steps).toEqual([
      { at: at(1), text: "Check: running", failed: false, open: true },
    ]);
  });

  it("reads a check with only the older errors list", () => {
    const old = mapTranscript([
      call(1, "c1", "mcp__jadwigo__lesson_check", {}),
      result("c1", JSON.stringify({ ok: false, errors: [{ step_id: "q3", message: "x" }] })),
    ]);
    expect(old.steps[0]?.text).toBe("Check: 1 error, 0 warnings");
  });
});

describe("a result saved beside the transcript", () => {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "jw-activity-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("is read from the session's own folder, and only from there", () => {
    const transcript = join(dir, "s1.jsonl");
    mkdirSync(join(dir, "s1", "tool-results"), { recursive: true });
    const saved = join(dir, "s1", "tool-results", "mcp-jadwigo-lesson_draft-1.txt");
    writeFileSync(saved, DRAWN);
    const outside = join(dir, "elsewhere.txt");
    writeFileSync(outside, DRAWN);
    const notice = (path: string) =>
      `Error: result (51,427 characters) exceeds maximum allowed tokens. Output has been saved to ${path}.\nFormat: JSON`;
    const lines = [
      call(1, "d1", "mcp__jadwigo__lesson_draft", {}),
      result("d1", notice(saved)),
      call(2, "d2", "mcp__jadwigo__lesson_draft", {}),
      result("d2", notice(outside)),
    ];
    writeFileSync(transcript, `${lines.join("\n")}\n`);

    const steps = mapTranscript(readTail(transcript), transcript).steps;
    expect(steps.map((s) => s.text)).toEqual([
      "Drew 3 questions from 2 sets",
      "Drawing questions from the bank",
    ]);
  });

  it("drops the torn first row of a tail", () => {
    const transcript = join(dir, "s2.jsonl");
    writeFileSync(transcript, `${FIXTURE.join("\n")}\n`);
    expect(readTail(transcript, 300)[0]?.startsWith("{")).toBe(true);
  });
});

describe("workSummary", () => {
  const activity = mapTranscript(FIXTURE);

  it("counts the calls inside the window, with the failures, files read and files changed", () => {
    expect(workSummary(activity, at(2), at(8))).toEqual({
      steps: [
        { text: "A command failed", ok: false },
        { text: "Running a command", ok: true },
        { text: "Drew 3 questions from 2 sets", ok: true },
        { text: "Editing notes.md", ok: true },
        { text: "Check: 2 errors, 1 warning", ok: true },
      ],
      calls: 6,
      failed: 1,
      read: ["adapter.ts"],
      changed: ["notes.md"],
    });
  });

  it("claims nothing when the window shows nothing", () => {
    expect(workSummary(activity, at(30), at(40))).toBeNull();
  });
});
