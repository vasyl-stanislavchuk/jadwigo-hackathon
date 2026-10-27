import type { SequenceData, SequenceKey } from "@jadwigo/contracts";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { judgeSequence, sequenceSolution, slotIndex, tileMode } from "./sequence.ts";

/**
 * The Sequence judge in both shapes: cards, where every item is used once, and tiles
 * (dl-w3.51.9), where the places are judged by what their tiles say, so two `8` tiles are
 * interchangeable and a tile may stay in the bank. Ported from david-learns
 * `frontend/src/families/sequence/judge.test.ts`.
 */

const cards: SequenceData = {
  items: [
    { id: "a", text: "1" },
    { id: "b", text: "2" },
    { id: "c", text: "3" },
    { id: "d", text: "4" },
  ],
  first_label: "first",
  last_label: "last",
};
const cardKey: SequenceKey = { orders: [["a", "b", "c", "d"]] };

// 2 × 8 as repeated addition: two `8` tiles, one `+`, and a `×` nobody needs.
const tiles: SequenceData = {
  items: [],
  first_label: "first",
  last_label: "last",
  tiles: [
    { id: "t8", text: "$8$" },
    { id: "u8", text: "$8$" },
    { id: "tp", text: "$+$" },
    { id: "tx", text: "$\\times$" },
  ],
  slots: 3,
};
const tileKey: SequenceKey = { orders: [["t8", "tp", "t8"]] };

const verdict = (data: SequenceData, key: SequenceKey, value: unknown) => {
  const v = judgeSequence(data, key, value);
  return v.correct ? "correct" : v.mistake_class;
};

describe("cards", () => {
  it("is right in an accepted order and classes a miss", () => {
    expect(verdict(cards, cardKey, ["a", "b", "c", "d"])).toBe("correct");
    expect(verdict(cards, cardKey, ["d", "c", "b", "a"])).toBe("reversed");
    expect(verdict(cards, cardKey, ["a", "c", "b", "d"])).toBe("swapped_neighbours");
    expect(verdict(cards, cardKey, ["b", "c", "d", "a"])).toBe("one_misplaced");
    expect(verdict(cards, cardKey, ["b", "a", "d", "c"])).toBe("other_order");
    expect(verdict(cards, cardKey, ["a", "b", "c"])).toBe("other_wrong");
    expect(verdict(cards, cardKey, "abcd")).toBe("other_wrong");
  });

  it("the solution of any key is judged right", () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.string(), { minLength: 1, maxLength: 8 }), (ids) => {
        const data: SequenceData = {
          items: ids.map((id) => ({ id, text: id })),
          first_label: "first",
          last_label: "last",
        };
        const key: SequenceKey = { orders: [[...ids].reverse()] };
        expect(judgeSequence(data, key, sequenceSolution(key)).correct).toBe(true);
      }),
    );
  });
});

describe("tiles", () => {
  it("is right when the places say what an accepted order says, whichever tile says it", () => {
    expect(verdict(tiles, tileKey, ["t8", "tp", "t8"])).toBe("correct");
    expect(verdict(tiles, tileKey, ["u8", "tp", "t8"])).toBe("correct");
    expect(verdict(tiles, tileKey, ["u8", "tp", "u8"])).toBe("correct");
  });

  it("classes the right tiles out of order as a card order would", () => {
    expect(verdict(tiles, tileKey, ["tp", "t8", "t8"])).toBe("swapped_neighbours");
    expect(verdict(tiles, tileKey, ["t8", "t8", "tp"])).toBe("swapped_neighbours");
    expect(
      verdict({ ...tiles, slots: 5 }, { orders: [["t8", "tp", "t8", "tp", "t8"]] }, [
        "tp",
        "t8",
        "tp",
        "t8",
        "t8",
      ]),
    ).toBe("one_misplaced");
    expect(
      verdict({ ...tiles, slots: 5 }, { orders: [["t8", "tp", "t8", "tp", "t8"]] }, [
        "tp",
        "tp",
        "t8",
        "t8",
        "t8",
      ]),
    ).toBe("other_order");
  });

  it("names a tile that does not belong, else a tile left out", () => {
    expect(verdict(tiles, tileKey, ["t8", "tx", "t8"])).toBe("extra_tile");
    expect(verdict(tiles, tileKey, ["t8", "tp", "tp"])).toBe("missing_tile");
    expect(verdict(tiles, tileKey, ["tp", "tp", "tp"])).toBe("missing_tile");
  });

  it("refuses a value that is not a full row of the bank's tiles", () => {
    expect(verdict(tiles, tileKey, ["t8", "tp"])).toBe("other_wrong");
    expect(verdict(tiles, tileKey, ["t8", "tp", "zz"])).toBe("other_wrong");
    expect(verdict(tiles, tileKey, null)).toBe("other_wrong");
  });

  it("the solution is the first accepted order, by tile id", () => {
    expect(sequenceSolution(tileKey)).toEqual(["t8", "tp", "t8"]);
    expect(verdict(tiles, tileKey, sequenceSolution(tileKey))).toBe("correct");
  });
});

describe("the help release's helpers", () => {
  it("tells tiles from cards, and reads a place's id", () => {
    expect(tileMode(tiles)).toBe(true);
    expect(tileMode(cards)).toBe(false);
    expect(slotIndex("s1")).toBe(0);
    expect(slotIndex("s12")).toBe(11);
    expect(slotIndex("t8")).toBeNull();
  });
});
