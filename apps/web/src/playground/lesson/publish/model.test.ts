import { describe, expect, it } from "vitest";
import { publishOf } from "./model.ts";

const AT = "2026-10-31T10:00:00.000Z";
const ok = (status: number) => ({ ok: true, status, detail: "" });
const file = (verified: unknown, allOk = true) => ({
  draft_id: "d1",
  request: "6 zadań z mnożenia",
  lesson_id: "lesson_1",
  version: 2,
  assignment_id: "asg_1",
  play_url: "http://127.0.0.1:5173/play/asg_1",
  verified,
  verified_at: AT,
  ok: allOk,
  target: "local",
  published_at: AT,
  timings: { import_ms: 1800 },
});
const passed = { api_health: ok(200), attempt_started: ok(201), play_page: ok(200) };

describe("publishOf", () => {
  it("reads the link and every check jw keyed by name", () => {
    const state = publishOf(file(passed), Date.parse(AT) - 1);
    expect(state).toMatchObject({
      play_url: "http://127.0.0.1:5173/play/asg_1",
      lesson_id: "lesson_1",
      version: "2",
      verified_at: AT,
      verified: true,
      stale: false,
    });
    expect(state?.checks).toEqual([
      { name: "api_health", ok: true, detail: "200" },
      { name: "attempt_started", ok: true, detail: "201" },
      { name: "play_page", ok: true, detail: "200" },
    ]);
  });

  it("is not verified when a check failed, the top-level ok says no, or a check is not jw's form", () => {
    const failed = publishOf(
      file(
        {
          ...passed,
          attempt_started: { ok: false, status: 201, detail: "plan has 5 questions, not 6" },
        },
        false,
      ),
      null,
    );
    expect(failed?.verified).toBe(false);
    expect(failed?.checks[1]).toEqual({
      name: "attempt_started",
      ok: false,
      detail: "201 · plan has 5 questions, not 6",
    });
    expect(publishOf(file(passed, false), null)?.verified).toBe(false);
    expect(publishOf(file({ ...passed, play_page: true }), null)?.checks[2]).toEqual({
      name: "play_page",
      ok: false,
      detail: "not recorded in jw's form",
    });
    expect(publishOf(file([{ name: "api_health", ok: true }]), null)?.checks).toEqual([]);
  });

  it("is stale when the draft changed after the publish, or the publish has no time", () => {
    expect(publishOf(file(passed), Date.parse(AT) + 1_001)?.stale).toBe(true);
    // A publish time written to the second may fall just before the draft jw wrote first.
    expect(publishOf(file(passed), Date.parse(AT) + 900)?.stale).toBe(false);
    expect(publishOf({ ...file(passed), published_at: null }, 0)?.stale).toBe(true);
  });

  it("never calls a publish with no checks verified, and reads no file as none", () => {
    expect(publishOf(file(undefined), null)?.verified).toBe(false);
    expect(publishOf(null, null)).toBeNull();
    expect(publishOf([], null)).toBeNull();
  });
});
