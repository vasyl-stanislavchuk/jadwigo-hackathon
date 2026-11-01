import { describe, expect, it } from "vitest";
import {
  baselineOf,
  type LocaleTables,
  type Messages,
  pluralForms,
  port,
  portLocale,
  type Review,
} from "./copy-to-messages.ts";

const PL: LocaleTables = {
  child: {
    check: { text: "Sprawdź", reviewed: false },
    dims: { text: "{rows} na {cols}", reviewed: false },
    start: { text: "Zaczynamy!", reviewed: false },
    praise: [
      { text: "Tak!", reviewed: false },
      { text: "Świetnie!", reviewed: false },
    ],
    groups_label: {
      text: "{a} {groups_noun} po {b}",
      reviewed: false,
      plural: {
        groups_noun: {
          count: "a",
          forms: { one: "grupa", few: "grupy", many: "grup", other: "grup" },
        },
      },
    },
  },
  categories: {
    adult: {
      start: { text: "Rozpocznij lekcję", reviewed: true },
      praise: [{ text: "Zgadza się.", reviewed: false }],
    },
  },
};
const SITE = {
  messages: { $schema: "x", site_404_title: "Nie ma takiej strony" } as Messages,
  review: { site_404_title: true } as Review,
};

describe("copy-to-messages", () => {
  it("knows CLDR's forms: pl has 4, en has 2", () => {
    expect(pluralForms("pl")).toEqual(["one", "few", "many", "other"]);
    expect(pluralForms("en")).toEqual(["one", "other"]);
  });

  it("keeps a plain line a string, and the site's keys as they are, first", () => {
    const { messages, review } = portLocale("pl", PL, SITE);
    expect(Object.keys(messages).slice(0, 3)).toEqual(["$schema", "site_404_title", "check"]);
    expect(messages["check"]).toBe("Sprawdź");
    expect(messages["dims"]).toBe("{rows} na {cols}");
    expect(review["site_404_title"]).toBe(true);
    expect(review["check"]).toBe(false);
  });

  it("makes the register a category variant and a list a line variant, flagged per variant", () => {
    const { messages, review } = portLocale("pl", PL, SITE);
    expect(messages["start"]).toEqual([
      {
        declarations: ["input category"],
        selectors: ["category"],
        match: { "category=*": "Zaczynamy!", "category=adult": "Rozpocznij lekcję" },
      },
    ]);
    expect(review["start"]).toEqual({ "category=*": false, "category=adult": true });
    expect(messages["praise"]).toEqual([
      {
        declarations: ["input category", "input line"],
        selectors: ["category", "line"],
        match: {
          "category=*, line=0": "Tak!",
          "category=*, line=1": "Świetnie!",
          "category=adult, line=0": "Zgadza się.",
        },
      },
    ]);
    expect(review["praise"]).toBe(false);
  });

  it("writes a counted noun as a plural selector with every CLDR form of the locale", () => {
    const { messages } = portLocale("pl", PL, SITE);
    expect(messages["groups_label"]).toEqual([
      {
        declarations: ["input a", "input b", "local groups_noun = a: plural"],
        selectors: ["groups_noun"],
        match: {
          "groups_noun=one": "{a} grupa po {b}",
          "groups_noun=few": "{a} grupy po {b}",
          "groups_noun=many": "{a} grup po {b}",
          "groups_noun=other": "{a} grup po {b}",
        },
      },
    ]);
  });

  it("fills a form the table left out with its other form", () => {
    const { messages } = portLocale(
      "pl",
      {
        child: {
          n: {
            text: "{n} {x}",
            reviewed: false,
            plural: { x: { count: "n", forms: { one: "krok", other: "kroku" } } },
          },
        },
        categories: {},
      },
      { messages: {}, review: {} },
    );
    expect(messages["n"]).toMatchObject([
      { match: { "x=one": "{n} krok", "x=few": "{n} kroku", "x=many": "{n} kroku" } },
    ]);
  });

  it("baselines the unreviewed lines of a live locale only", () => {
    const files = port({ pl: PL, en: PL }, { pl: SITE }, ["pl"]);
    expect(Object.keys(files)).toEqual([
      "packages/copy/messages/pl.json",
      "packages/copy/messages/review.pl.json",
      "packages/copy/messages/baseline.pl.json",
      "packages/copy/messages/en.json",
      "packages/copy/messages/review.en.json",
    ]);
    const baseline = files["packages/copy/messages/baseline.pl.json"] as Record<string, unknown>;
    expect(baseline["site_404_title"]).toBeUndefined();
    expect(baseline["check"]).toBe("Sprawdź");
    expect(baseline["start"]).toEqual({ "category=*": "Zaczynamy!" });
  });

  it("gives the same files when run on its own output", () => {
    const first = port({ pl: PL }, { pl: SITE }, ["pl"]);
    const again = port(
      { pl: PL },
      {
        pl: {
          messages: first["packages/copy/messages/pl.json"] as Messages,
          review: first["packages/copy/messages/review.pl.json"] as Review,
        },
      },
      ["pl"],
    );
    expect(JSON.stringify(again)).toBe(JSON.stringify(first));
  });

  it("refuses a category line with no child line, and a site key in a table", () => {
    const stray = { ...PL, categories: { adult: { nope: { text: "x", reviewed: false } } } };
    expect(() => portLocale("pl", stray, SITE)).toThrow("pl.adult.nope");
    const site = { child: { site_x: { text: "x", reviewed: false } }, categories: {} };
    expect(() => portLocale("pl", site, SITE)).toThrow("site_ keys are the site's");
  });

  it("baselines nothing once every line is reviewed", () => {
    expect(baselineOf({ $schema: "x", a: "A" }, { a: true })).toEqual({});
  });
});
