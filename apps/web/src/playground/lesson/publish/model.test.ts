import { describe, expect, it } from "vitest";
import { publishOf } from "./model.ts";

const AT = "2026-10-31T10:00:00.000Z";
const file = (verified: unknown) => ({
  draft_id: "d1",
  request: "6 zadań z mnożenia",
  lesson_id: "lesson_1",
  version: 2,
  assignment_id: "asg_1",
  play_url: "http://127.0.0.1:5173/play/asg_1",
  verified,
  target: "local",
  published_at: AT,
  timings: { import_ms: 1800 },
});

describe("publishOf", () => {
  it("reads the link and every check, as a list or as an object", () => {
    const listed = publishOf(
      file([
        { name: "health", ok: true, status: 200 },
        { check: "attempt", ok: true, status: 201, detail: "plan 6 of 6" },
        { name: "play page", ok: true, status: 200 },
      ]),
      Date.parse(AT) - 1,
    );
    expect(listed).toMatchObject({
      play_url: "http://127.0.0.1:5173/play/asg_1",
      lesson_id: "lesson_1",
      version: "2",
      verified: true,
      stale: false,
    });
    expect(listed?.checks).toEqual([
      { name: "health", ok: true, detail: "200" },
      { name: "attempt", ok: true, detail: "201 · plan 6 of 6" },
      { name: "play page", ok: true, detail: "200" },
    ]);
    const keyed = publishOf(file({ health: true, attempt: { ok: false, status: 500 } }), null);
    expect(keyed?.checks).toEqual([
      { name: "health", ok: true, detail: "" },
      { name: "attempt", ok: false, detail: "500" },
    ]);
    expect(keyed?.verified).toBe(false);
  });

  it("is stale when the draft changed after the publish, or the publish has no time", () => {
    expect(publishOf(file([{ name: "health", ok: true }]), Date.parse(AT) + 1_001)?.stale).toBe(
      true,
    );
    // A publish time written to the second may fall just before the draft jw wrote first.
    expect(publishOf(file([{ name: "health", ok: true }]), Date.parse(AT) + 900)?.stale).toBe(
      false,
    );
    expect(publishOf({ ...file([]), published_at: null }, 0)?.stale).toBe(true);
  });

  it("never calls a publish with no checks verified, and reads no file as none", () => {
    expect(publishOf(file(undefined), null)?.verified).toBe(false);
    expect(publishOf(null, null)).toBeNull();
    expect(publishOf([], null)).toBeNull();
  });
});
