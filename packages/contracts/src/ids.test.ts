import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { decodeUuid, encodeUuid, ID_PREFIXES, idOf, LearnerId, LessonId, uuidOf } from "./ids.ts";

const lowerUuid = fc.uuid().map((u) => u.toLowerCase());

describe("the id codec", () => {
  it("round-trips every uuid through 26 base32 characters", () => {
    fc.assert(
      fc.property(lowerUuid, (uuid) => {
        const body = encodeUuid(uuid);
        expect(body).toMatch(/^[0-7][0-9a-hjkmnp-tv-z]{25}$/);
        expect(decodeUuid(body)).toBe(uuid);
      }),
    );
  });

  it("keeps uuid order in the encoded form", () => {
    fc.assert(
      fc.property(lowerUuid, lowerUuid, (a, b) => {
        expect(Math.sign(encodeUuid(a).localeCompare(encodeUuid(b)))).toBe(
          Math.sign(a.replaceAll("-", "").localeCompare(b.replaceAll("-", ""))),
        );
      }),
    );
  });

  it("writes the edges as expected", () => {
    expect(encodeUuid("00000000-0000-0000-0000-000000000000")).toBe("0".repeat(26));
    expect(encodeUuid("ffffffff-ffff-ffff-ffff-ffffffffffff")).toBe(`7${"z".repeat(25)}`);
  });

  it("parses a wire id only with its own prefix", () => {
    fc.assert(
      fc.property(lowerUuid, (uuid) => {
        const id = idOf(ID_PREFIXES.lesson, uuid);
        expect(LessonId.parse(id)).toBe(id);
        expect(uuidOf(ID_PREFIXES.lesson, id)).toBe(uuid);
        expect(LearnerId.safeParse(id).success).toBe(false);
        expect(() => uuidOf(ID_PREFIXES.attempt, id)).toThrow();
      }),
    );
  });

  it("refuses upper case, a wrong length, letters outside the alphabet and an overflow", () => {
    const good = idOf(ID_PREFIXES.lesson, "0190f3c4-5b6a-4c8d-9e0f-112233445566");
    expect(LessonId.safeParse(good.toUpperCase()).success).toBe(false);
    expect(LessonId.safeParse(good.slice(0, -1)).success).toBe(false);
    expect(LessonId.safeParse(`${good.slice(0, -1)}u`).success).toBe(false);
    expect(LessonId.safeParse(`les_8${good.slice(5)}`).success).toBe(false);
    expect(() => decodeUuid("8".padEnd(26, "0"))).toThrow();
  });
});
