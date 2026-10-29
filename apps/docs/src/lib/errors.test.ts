import { ERROR_STATUS } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { errorRows } from "./errors.ts";

describe("errorRows", () => {
  it("lists every error type once, under its own status", () => {
    const rows = errorRows();
    const listed = rows.flatMap((row) => row.types.map((type) => [type, row.status]));
    expect(Object.fromEntries(listed)).toEqual(ERROR_STATUS);
    expect(listed).toHaveLength(Object.keys(ERROR_STATUS).length);
  });

  it("orders the statuses lowest first", () => {
    const statuses = errorRows().map((row) => row.status);
    expect(statuses).toEqual([...statuses].sort((a, b) => a - b));
  });

  it("refuses a status with no meaning, so a new one fails the build", () => {
    expect(() => errorRows({ ...ERROR_STATUS, BadRequest: 418 })).toThrow(/418/);
  });
});
