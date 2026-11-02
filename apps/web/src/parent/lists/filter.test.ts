import { LearnerId } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { folded, shows } from "./filter.ts";

const OLA = LearnerId.parse("lrn_2h4m8gyw0fb1cvz2nkqw0px8fq");
const TYMEK = LearnerId.parse("lrn_7qre3atahx8cpak6xbjtz73var");

const ola = { learner: OLA, words: ["Odejmowanie przez 10", "Ola"] };
const nobody = { learner: null, words: ["Żółw liczy kroki"] };

describe("the tables' filter", () => {
  it("shows every row under Wszystkie", () => {
    expect(shows(ola, "all", "")).toBe(true);
    expect(shows(nobody, "all", "")).toBe(true);
  });

  it("shows only that child's rows under a child", () => {
    expect(shows(ola, OLA, "")).toBe(true);
    expect(shows(ola, TYMEK, "")).toBe(false);
    expect(shows(nobody, OLA, "")).toBe(false);
  });

  it("shows only the rows with no child under Bez dziecka", () => {
    expect(shows(nobody, "none", "")).toBe(true);
    expect(shows(ola, "none", "")).toBe(false);
  });
});

describe("the tables' search", () => {
  it("finds a word in any of the row's words, without case or accents", () => {
    expect(shows(ola, "all", "odejm")).toBe(true);
    expect(shows(ola, "all", "OLA")).toBe(true);
    expect(shows(nobody, "all", "zolw")).toBe(true);
    expect(shows(nobody, "all", "  kroki ")).toBe(true);
    expect(shows(ola, "all", "mnożenie")).toBe(false);
  });

  it("narrows within the filter's pick", () => {
    expect(shows(nobody, OLA, "zolw")).toBe(false);
  });

  it("folds Polish letters to plain ones", () => {
    expect(folded("Łódź ŻÓŁW")).toBe("lodz zolw");
  });
});
