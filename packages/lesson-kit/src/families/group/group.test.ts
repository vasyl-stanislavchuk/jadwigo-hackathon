/**
 * Group's checks beyond the shared ones (validate.ts): two columns need pairs, a right column that
 * starts in the key's order is a warning, and a picture card needs its words.
 */

import { describe, expect, it } from "vitest";
import { Family, QuestionType } from "../names.ts";
import type { FamilySpec } from "../types.ts";
import { validate } from "../validate.ts";

const match: FamilySpec = {
  id: "s1",
  say: "Match each fact to its answer.",
  question_type: QuestionType.Match,
  family: Family.Group,
  data: {
    groups: [
      { id: "a32", label: "32", capacity: 1 },
      { id: "a42", label: "42", capacity: 1 },
    ],
    items: [
      { id: "f1", label: "6 × 7" },
      { id: "f2", label: "8 × 4" },
    ],
    each_item: "one",
  },
  key: { items: { f1: ["a42"], f2: ["a32"] } },
};
const rules = (spec: FamilySpec) => validate(spec).map((p) => `${p.level}:${p.rule}`);

describe("Group: two columns", () => {
  it("accepts pairs listed out of the key’s order", () => {
    expect(rules(match)).toEqual([]);
  });

  it("warns when the right column starts in the key’s order", () => {
    const solved = {
      ...match,
      data: { ...match.data, groups: [...match.data.groups].reverse() },
    } as FamilySpec;
    expect(rules(solved)).toEqual(["warning:starts_solved"]);
  });

  it("refuses columns that are not pairs: a group with no capacity, more groups than items, several groups per item", () => {
    const open = {
      ...match,
      data: { ...match.data, groups: match.data.groups.map((g) => ({ id: g.id, label: g.label })) },
    } as FamilySpec;
    expect(rules(open)).toContain("error:not_pairs");
    const extra = {
      ...match,
      data: {
        ...match.data,
        groups: [...match.data.groups, { id: "a27", label: "27", capacity: 1 }],
      },
    } as FamilySpec;
    expect(rules(extra)).toContain("error:not_pairs");
    const many = { ...match, data: { ...match.data, each_item: "many" } } as FamilySpec;
    expect(rules(many)).toContain("error:not_pairs");
    // The same step in zones is a plain match with open groups.
    expect(rules({ ...open, data: { ...open.data, layout: "zones" } } as FamilySpec)).toEqual([]);
  });

  it("a picture card may have no words of its own, but its picture must", () => {
    const picture = {
      src: "/media/khan/abc.svg",
      alt: "two rows of three dots",
      width: 100,
      height: 60,
    };
    const withPicture = {
      ...match,
      data: { ...match.data, items: [{ id: "f1", label: "", picture }, match.data.items[1]] },
    } as FamilySpec;
    expect(rules(withPicture)).toEqual([]);
    const mute = {
      ...match,
      data: {
        ...match.data,
        items: [{ id: "f1", label: "", picture: { ...picture, alt: " " } }, match.data.items[1]],
      },
    } as FamilySpec;
    expect(rules(mute)).toEqual(["error:missing_alt"]);
  });
});
