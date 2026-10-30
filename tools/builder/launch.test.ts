import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claudeBelow, type Proc } from "./flag.ts";
import {
  CHANNEL_ARG,
  claudeArgs,
  missing,
  projectSlug,
  refusal,
  registerLine,
  sessionRecord,
  writeSession,
} from "./launch.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

let dir = "";

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "jw-launch-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("the session", () => {
  it("is a fresh v4 uuid, passed to claude with the channel flag in its equals form", () => {
    const id = randomUUID();
    expect(id).toMatch(UUID);
    expect(claudeArgs(id, ["--model", "opus"])).toEqual([
      "--session-id",
      id,
      "--dangerously-load-development-channels=server:jadwigo-builder",
      "--model",
      "opus",
    ]);
  });

  it("is written to session.json with its start, its cwd and its transcript's path", () => {
    const id = "6f1c2a9e-3b4d-4e5f-8a7b-1c2d3e4f5a6b";
    const record = sessionRecord(
      id,
      "/Users/someone/.md/repo",
      "/Users/someone/.claude",
      new Date(),
    );
    const path = writeSession(join(dir, "drafts"), record);

    expect(path).toBe(join(dir, "drafts", ".builder", "session.json"));
    expect(JSON.parse(readFileSync(path, "utf8"))).toEqual({
      session_id: id,
      started_at: new Date().toISOString(),
      cwd: "/Users/someone/.md/repo",
      transcript: `/Users/someone/.claude/projects/-Users-someone--md-repo/${id}.jsonl`,
    });
  });

  it("names the project folder the way Claude Code does", () => {
    expect(projectSlug("/Users/someone/.md/worktrees/jadwigo-hackathon/lane_1")).toBe(
      "-Users-someone--md-worktrees-jadwigo-hackathon-lane-1",
    );
  });
});

describe("the flag check", () => {
  const table = (entries: [number, Proc][]) => new Map(entries);

  it("passes a claude started with the channel", () => {
    const ps = table([
      [50, { ppid: 1, command: `/usr/local/bin/claude --session-id u ${CHANNEL_ARG}` }],
    ]);
    expect(refusal(claudeBelow(ps, 50))).toBe("");
  });

  it("refuses a claude without it, found under a wrapper that did not exec", () => {
    const ps = table([
      [50, { ppid: 1, command: `/bin/sh ./claude-wrapper --session-id u ${CHANNEL_ARG}` }],
      [51, { ppid: 50, command: "/usr/local/bin/claude --session-id u" }],
    ]);
    const text = refusal(claudeBelow(ps, 50));
    expect(text).toContain("has no --dangerously-load-development-channels=server:jadwigo-builder");
    expect(text).toContain("It was stopped.");
  });

  it("says nothing when no claude is found to check", () => {
    expect(refusal(claudeBelow(table([]), 50))).toBe("");
  });
});

describe("registration", () => {
  it("prints the add-json line for the channel and points at jw's README for jadwigo", () => {
    const text = missing({ builder: false, jadwigo: false }, "/repo");
    expect(text).toContain(
      `claude mcp add-json --scope user jadwigo-builder '{"type":"stdio","command":"bun","args":["/repo/tools/builder/channel.ts"]}'`,
    );
    expect(text).toContain("/repo/apps/cli/README.md");
    expect(missing({ builder: true, jadwigo: true }, "/repo")).toBe("");
  });

  it("writes a line a shell reads as one JSON argument", () => {
    expect(registerLine("/repo").split("'")[1]).toBe(
      '{"type":"stdio","command":"bun","args":["/repo/tools/builder/channel.ts"]}',
    );
  });
});
