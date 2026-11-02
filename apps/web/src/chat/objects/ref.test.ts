import { describe, expect, it } from "vitest";
import { formatOpen, objectRef, parseOpen, sameObject } from "./ref.ts";

const CONVERSATION = "cnv_00000000000000000000000001";
const LEARNER = "lrn_00000000000000000000000001";

describe("an object ref in ?open (dl-uukj.47.58)", () => {
  it("round-trips a lesson and a learner", () => {
    for (const ref of [
      { kind: "lesson", id: CONVERSATION },
      { kind: "learner", id: LEARNER },
    ] as const) {
      expect(parseOpen(formatOpen(ref))).toEqual(ref);
    }
  });

  it("refuses an unknown kind, a missing id and an id of another kind", () => {
    expect(parseOpen(null)).toBeNull();
    expect(parseOpen("")).toBeNull();
    expect(parseOpen(`report:${CONVERSATION}`)).toBeNull();
    expect(parseOpen("lesson:")).toBeNull();
    expect(parseOpen(`:${CONVERSATION}`)).toBeNull();
    expect(parseOpen(`lesson:${LEARNER}`)).toBeNull();
    expect(objectRef("learner", CONVERSATION)).toBeNull();
  });

  it("tells 2 refs to the same thing from 2 different ones", () => {
    const a = { kind: "lesson", id: CONVERSATION } as const;
    expect(sameObject(a, { ...a })).toBe(true);
    expect(sameObject(a, { kind: "learner", id: LEARNER })).toBe(false);
    expect(sameObject(a, null)).toBe(false);
  });
});
