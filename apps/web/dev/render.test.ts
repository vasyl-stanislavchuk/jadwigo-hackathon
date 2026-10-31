import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Finding } from "@jadwigo/lesson-import/file";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { draftMessage, listDrafts } from "./draft-watch.ts";
import { parseRender, readRender, writeRender } from "./render.ts";

const finding: Finding = {
  step_id: "q1",
  path: "script.parts[0].steps[1]",
  level: "error",
  rule: "render-split-inline",
  text: "A sentence breaks into one line per fragment.",
  fix: "Wrap the runs in one element.",
};

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "jw-render-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("parseRender", () => {
  it("takes a draft id and findings, and leaves out what is not a finding", () => {
    expect(
      parseRender(JSON.stringify({ draft_id: "d1", findings: [finding, { rule: 1 }] })),
    ).toEqual({ draft_id: "d1", findings: [finding] });
  });

  it("refuses a body that is not JSON, a draft id that names a path, or no list", () => {
    expect(parseRender("{")).toEqual({ error: "the body is not JSON" });
    expect(parseRender(JSON.stringify({ draft_id: "../x", findings: [] }))).toEqual({
      error: "draft_id is not a draft id",
    });
    expect(parseRender(JSON.stringify({ draft_id: "d1", findings: {} }))).toEqual({
      error: "findings is not a list",
    });
  });
});

describe("the render file", () => {
  it("is written whole beside the draft, read back, and sent with the draft", () => {
    writeFileSync(join(dir, "d1.json"), JSON.stringify({ title: "T", language: "pl" }));
    writeRender(dir, "d1", [finding], new Date("2026-10-30T12:00:00Z"));
    expect(readdirSync(dir).sort()).toEqual(["d1.json", "d1.render.json"]);
    expect(readRender(dir, "d1")).toEqual({
      draft_id: "d1",
      findings: [finding],
      rendered_at: "2026-10-30T12:00:00.000Z",
    });
    expect(listDrafts(dir).map((d) => d.draft_id)).toEqual(["d1"]);
    expect(draftMessage(dir, null).render).toEqual(readRender(dir, "d1"));
    expect(readRender(dir, "nope")).toBeNull();
  });

  it("sends jw's publish file with its draft, and lists neither as a draft (dl-a38n.48)", () => {
    writeFileSync(join(dir, "d1.json"), JSON.stringify({ title: "T", language: "pl" }));
    const publish = {
      draft_id: "d1",
      play_url: "http://127.0.0.1:5173/play/a1",
      verified: {},
      ok: false,
    };
    writeFileSync(join(dir, "d1.publish.json"), JSON.stringify(publish));
    expect(listDrafts(dir).map((d) => d.draft_id)).toEqual(["d1"]);
    expect(draftMessage(dir, null).publish).toEqual(publish);
    writeFileSync(join(dir, "d1.publish.json"), '{"draft_id": "d1", "pla');
    expect(draftMessage(dir, null).publish).toBeNull();
  });
});
