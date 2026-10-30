import { MISTAKE_CLASSES } from "@jadwigo/core";
import { describe, expect, it } from "vitest";
import { mistakeClassesOf, unknownBoosts } from "./mistakes.ts";

const plus = (family: keyof typeof MISTAKE_CLASSES, own: string[]) =>
  [...new Set([...MISTAKE_CLASSES[family], ...own])].sort();

describe("mistakeClassesOf (dl-e8ov.5.38.11)", () => {
  it("adds the classes each family's near table names, in that family's shape", () => {
    expect(
      mistakeClassesOf({ family: "choose", key: { correct: ["a"], near: { b: "took_half" } } }),
    ).toEqual(plus("choose", ["took_half"]));
    expect(
      mistakeClassesOf({
        family: "group",
        key: { groups: {}, near: { i1: { g2: "even_for_odd" } } },
      }),
    ).toEqual(plus("group", ["even_for_odd"]));
    expect(
      mistakeClassesOf({
        family: "place",
        key: { regions: [], near: [{ id: "r", mistake_class: "left_for_right" }] },
      }),
    ).toEqual(plus("place", ["left_for_right"]));
    expect(
      mistakeClassesOf({
        family: "slots",
        key: { gaps: { g1: { kind: "enter", accept: ["4"], near: { "5": "forgot_carry" } } } },
      }),
    ).toEqual(plus("slots", ["forgot_carry"]));
    expect(mistakeClassesOf({ family: "sequence", key: { orders: [] } })).toEqual(
      plus("sequence", []),
    );
  });

  it("is null for a family the contract does not know, and reads a key of any shape", () => {
    expect(mistakeClassesOf({ family: "draw", key: {} })).toBeNull();
    expect(mistakeClassesOf({ family: "enter", key: { near: ["x"] } })).toEqual(plus("enter", []));
    expect(mistakeClassesOf({ family: "enter" })).toEqual(plus("enter", []));
  });
});

describe("unknownBoosts", () => {
  const enter = { family: "enter", key: { accept: ["12"], near: { "21": "digit_reversal" } } };

  it("is null when every key is a class the question gives", () => {
    expect(
      unknownBoosts(enter, { off_by_small: { text: "x" }, digit_reversal: { text: "y" } }),
    ).toBeNull();
    expect(unknownBoosts(enter, undefined)).toBeNull();
  });

  it("names each unknown key and every class the question gives", () => {
    const message = unknownBoosts(enter, { off_by_one: { text: "x" } });
    expect(message).toContain("names off_by_one, which this enter question never gives");
    expect(message).toContain(plus("enter", ["digit_reversal"]).join(", "));
  });

  it("names none for explain, which has no judge", () => {
    expect(unknownBoosts({ family: "explain", key: {} }, { other_wrong: { text: "x" } })).toContain(
      "its classes are none",
    );
  });
});
