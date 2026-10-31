import { describe, expect, it } from "vitest";
import { chainRows, isLayout } from "./tableLayout.ts";

/** The 8·9 chain as the bank stores it (khan/x125d929cd0a3501f): its later steps in column 1. */
const chain = {
  header: ["", ""],
  rows: [
    ["$8\\cdot 9$", "$= (5\\cdot$ {g1} $) + (3 \\cdot 9)$"],
    ["$= 45 + 27$", ""],
    ["$=$ {g2}", ""],
  ],
};

describe("a table with no header is a layout (dl-w3.81)", () => {
  it("is a layout when every header cell is blank, and a data table otherwise", () => {
    expect(isLayout(chain)).toBe(true);
    expect(isLayout({ header: ["×", "3"], rows: [["7", "{g1}"]] })).toBe(false);
  });

  it("moves a chain's later steps under its first =", () => {
    expect(chainRows(chain)).toEqual([
      ["$8\\cdot 9$", "$= (5\\cdot$ {g1} $) + (3 \\cdot 9)$"],
      ["", "$= 45 + 27$"],
      ["", "$=$ {g2}"],
    ]);
  });

  it("keeps a chain already written under its first =", () => {
    const placed = {
      header: ["", ""],
      rows: [
        ["$8\\cdot 9$", "$= 72$"],
        ["", "$= {g1}$"],
      ],
    };
    expect(chainRows(placed)).toEqual(placed.rows);
  });

  it("keeps the rows as written when the table is not a chain", () => {
    // = in its own column (khan/x14bd9c7082b49de4).
    const ownColumn = {
      header: ["", ""],
      rows: [
        ["$7 \\times 28$", ""],
        ["$=$", "$140 + 56$"],
      ],
    };
    expect(chainRows(ownColumn)).toBe(ownColumn.rows);
    // One later row of another shape.
    const mixed = {
      header: ["", ""],
      rows: [
        ["$8\\cdot 9$", "$= 72$"],
        ["$= 70 + 2$", ""],
        ["Step 2", "{g1}"],
      ],
    };
    expect(chainRows(mixed)).toBe(mixed.rows);
    // Three columns, or a header that says something.
    const wide = {
      header: ["", "", ""],
      rows: [
        ["a", "= b", ""],
        ["= c", "", ""],
      ],
    };
    expect(chainRows(wide)).toBe(wide.rows);
    const headed = {
      header: ["x", "y"],
      rows: [
        ["a", "= b"],
        ["= c", ""],
      ],
    };
    expect(chainRows(headed)).toBe(headed.rows);
  });
});
