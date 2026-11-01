import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { checkCopy, type LocaleFiles, readLocales } from "./check-copy.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

const plural = (forms: string[]) => [
  {
    declarations: ["input n", "local steps = n: plural"],
    selectors: ["steps"],
    match: Object.fromEntries(forms.map((f) => [`steps=${f}`, `{n} ${f}`])),
  },
];
const fresh = (): LocaleFiles[] => [
  {
    code: "pl",
    status: "live",
    messages: { $schema: "x", check: "Sprawdź", count: plural(["one", "few", "many", "other"]) },
    review: { check: false, count: true },
    baseline: { check: "Sprawdź" },
  },
  {
    code: "en",
    status: "studio",
    messages: { $schema: "x", check: "Check", count: plural(["one", "other"]) },
    review: { check: false, count: false },
    baseline: {},
  },
];

describe("check-copy", () => {
  it("passes on the repo's messages as they are", () => {
    const locales = readLocales(ROOT);
    expect(locales.map((l) => `${l.code} ${l.status}`)).toEqual(["pl live", "en studio"]);
    expect(checkCopy(locales)).toEqual([]);
  });

  it("passes on a whole, reviewed or baselined set", () => {
    expect(checkCopy(fresh())).toEqual([]);
  });

  it("fails a planted missing few form", () => {
    const locales = fresh();
    const [pl] = locales;
    if (pl) pl.messages["count"] = plural(["one", "many", "other"]);
    expect(checkCopy(locales)).toEqual(["pl.count has no variant for steps=few"]);
  });

  it("fails a missing form beside a register, and names the register", () => {
    const locales = fresh();
    const [pl] = locales;
    if (pl)
      pl.messages["count"] = [
        {
          declarations: ["input category", "input n", "local steps = n: plural"],
          selectors: ["category", "steps"],
          match: {
            "category=adult, steps=*": "{n}",
            "category=*, steps=one": "{n} krok",
            "category=*, steps=few": "{n} kroki",
            "category=*, steps=other": "{n} kroku",
          },
        },
      ];
    expect(checkCopy(locales)).toEqual(["pl.count has no variant for steps=many (category=*)"]);
  });

  it("fails a planted missing key in a live language, not in the studio", () => {
    const locales = fresh();
    const [pl, en] = locales;
    if (en) en.messages["extra"] = "Extra";
    if (en) en.review["extra"] = false;
    expect(checkCopy(locales)).toEqual(["pl is live and misses extra"]);
    if (pl) pl.status = "studio";
    expect(checkCopy(locales)).toEqual([]);
  });

  it("fails a key with no review flag", () => {
    const locales = fresh();
    const [, en] = locales;
    if (en) delete en.review["check"];
    expect(checkCopy(locales)).toEqual(["en.check has no flag in messages/review.en.json"]);
  });

  it("fails a planted unreviewed line in a live language's prod build", () => {
    const locales = fresh();
    const [pl] = locales;
    if (pl) {
      pl.messages["start"] = "Zaczynamy!";
      pl.review["start"] = false;
    }
    expect(checkCopy(locales)).toEqual([
      "pl.start is unreviewed and a prod build would ship it: review it and set its flag in messages/review.pl.json",
    ]);
  });

  it("fails a baselined line whose text changed, and its stale baseline entry", () => {
    const locales = fresh();
    const [pl] = locales;
    if (pl) pl.messages["check"] = "Sprawdź teraz";
    expect(checkCopy(locales)).toEqual([
      "pl.check is unreviewed and a prod build would ship it: review it and set its flag in messages/review.pl.json",
      "pl.check is in messages/baseline.pl.json but is reviewed, changed or gone: drop it there",
    ]);
  });

  it("fails a baselined line that is reviewed now, until it leaves the baseline", () => {
    const locales = fresh();
    const [pl] = locales;
    if (pl) pl.review["check"] = true;
    expect(checkCopy(locales)).toEqual([
      "pl.check is in messages/baseline.pl.json but is reviewed, changed or gone: drop it there",
    ]);
    if (pl) pl.baseline = {};
    expect(checkCopy(locales)).toEqual([]);
  });

  it("gates each variant on its own flag", () => {
    const locales = fresh();
    const [pl] = locales;
    if (pl) pl.review["count"] = { "steps=one": true, "steps=few": true, "steps=many": true };
    expect(checkCopy(locales)).toEqual([
      "pl.count [steps=other] is unreviewed and a prod build would ship it: review it and set its flag in messages/review.pl.json",
    ]);
  });
});
