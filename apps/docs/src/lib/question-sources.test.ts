import { QuestionSource } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { sourceRows } from "./question-sources.ts";

describe("sourceRows", () => {
  it("lists every QuestionSource once, in the contract's order", () => {
    expect(sourceRows().map((row) => row.source)).toEqual(QuestionSource.options);
  });

  it("names the credit and the bucket key of an Alfik task", () => {
    expect(sourceRows().find((row) => row.source === "alfik")).toMatchObject({
      credit: "z Alfika Matematycznego",
      key: "questions/alfik/<id>.json",
    });
  });

  it("throws on a source the contract does not name", () => {
    expect(() => sourceRows(["own"])).toThrow();
  });
});
