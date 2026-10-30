import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { claudeProfile, sessionEnv } from "./config.ts";
import { claudeBelow, type Proc } from "./flag.ts";
import {
  argsOf,
  CHANNEL_ARG,
  claudeArgs,
  jadwigoLine,
  projectSlug,
  refusal,
  registerLine,
  registrationHints,
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
  const PROFILE = {
    file: "/home/someone/.claude.json",
    from: "the default, as CLAUDE_CONFIG_DIR is unset",
  };
  const README = readFileSync(
    join(import.meta.dirname, "..", "..", "apps", "cli", "README.md"),
    "utf8",
  );
  const here = { found: true as const, args: "/repo/tools/builder/channel.ts" };
  const jw = { found: true as const, args: "--directory /repo/apps/cli run jw mcp serve" };

  it("names the profile it checked and prints both lines when neither server is registered", () => {
    const { refuse, note } = registrationHints(
      { builder: { found: false }, jadwigo: { found: false } },
      "/repo",
      README,
      PROFILE,
    );
    expect(refuse).toContain(
      "make builder checked the Claude Code profile at /home/someone/.claude.json (the default, as CLAUDE_CONFIG_DIR is unset).",
    );
    expect(refuse).toContain("only in the profile the session runs in");
    expect(refuse).toContain(
      `claude mcp add-json --scope user jadwigo-builder '{"type":"stdio","command":"bun","args":["/repo/tools/builder/channel.ts"]}'`,
    );
    expect(refuse).toContain("claude mcp add --scope user --transport stdio jadwigo \\");
    expect(note).toBe("");
  });

  it("quotes jw's line exactly as apps/cli/README.md writes it, the name before its -e flags", () => {
    const line = jadwigoLine(README);
    expect(README).toContain(`\`\`\`sh\n${line}\n\`\`\``);
    expect(line.indexOf(" jadwigo ")).toBeLessThan(line.indexOf(" -e "));
    const { refuse } = registrationHints(
      { builder: here, jadwigo: { found: false } },
      "/repo",
      README,
      PROFILE,
    );
    for (const part of line.split("\n")) expect(refuse).toContain(`  ${part}`);
  });

  it("says nothing when both point here", () => {
    expect(registrationHints({ builder: here, jadwigo: jw }, "/repo", README, PROFILE)).toEqual({
      refuse: "",
      note: "",
    });
  });

  it("removes before adding when the channel is registered for another checkout", () => {
    const elsewhere = { found: true as const, args: "/other/checkout/tools/builder/channel.ts" };
    const { refuse, note } = registrationHints(
      { builder: elsewhere, jadwigo: jw },
      "/repo",
      README,
      PROFILE,
    );
    expect(refuse).toBe("");
    const lines = note.split("\n").map((l) => l.trim());
    const remove = lines.indexOf("claude mcp remove --scope user jadwigo-builder");
    expect(remove).toBeGreaterThan(-1);
    expect(lines[remove + 1]).toBe(registerLine("/repo"));
  });

  it("reads the Args line of claude mcp get", () => {
    expect(
      argsOf(
        "jadwigo-builder:\n  Type: stdio\n  Command: bun\n  Args: /r/tools/builder/channel.ts\n",
      ),
    ).toBe("/r/tools/builder/channel.ts");
  });

  it("writes a line a shell reads as one JSON argument", () => {
    expect(registerLine("/repo").split("'")[1]).toBe(
      '{"type":"stdio","command":"bun","args":["/repo/tools/builder/channel.ts"]}',
    );
  });
});

describe("the session's profile and environment (config.ts)", () => {
  it("names CLAUDE_CONFIG_DIR's profile, else the default", () => {
    expect(claudeProfile({ CLAUDE_CONFIG_DIR: "/home/someone/.claude-profiles/work" })).toEqual({
      file: "/home/someone/.claude-profiles/work/.claude.json",
      from: "CLAUDE_CONFIG_DIR=/home/someone/.claude-profiles/work",
    });
    expect(claudeProfile({}).from).toBe("the default, as CLAUDE_CONFIG_DIR is unset");
  });

  it("copies the environment without the API key, naming the session and the drafts directory", () => {
    const env = { PATH: "/bin", ANTHROPIC_API_KEY: "sk-test", JADWIGO_DRAFTS_DIR: "~/x" };
    expect(sessionEnv("s1", "/home/someone/x", env)).toEqual({
      PATH: "/bin",
      JADWIGO_BUILDER_SESSION: "s1",
      JADWIGO_DRAFTS_DIR: "/home/someone/x",
    });
    expect(env.ANTHROPIC_API_KEY).toBe("sk-test");
  });
});
