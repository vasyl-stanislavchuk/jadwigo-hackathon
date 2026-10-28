import type { Denom, PlaceData, PlaceKey } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { judgePlace, placeSolution } from "./judge.ts";

/**
 * money_pay (dl-w3.61.6): the judge per class and the solution. The money helpers' cases belong to
 * money.ts, the checks to validation, the view to the web app and money_count to Slots.
 */

const BANK: Denom[] = ["gr10", "gr20", "gr50", "zl1", "zl2", "zl5"];
const data: PlaceData = { surface: "coins", bank: BANK, amount_label: "3 zł 50 gr", slots: 6 };
const key: PlaceKey = { surface: "coins", amount_gr: 350 };

describe("money_pay judge", () => {
  const j = (items: Denom[], k: PlaceKey = key, d: PlaceData = data) => judgePlace(k, { items }, d);
  it("takes any set with the right total", () => {
    expect(j(["zl2", "zl1", "gr50"]).correct).toBe(true);
    expect(j(["gr50", "zl1", "zl1", "zl1"]).correct).toBe(true);
  });
  it("names each miss", () => {
    expect(j(["zl2", "zl1"]).mistake_class).toBe("one_coin_off");
    expect(j(["zl2", "zl1", "gr50", "gr10"]).mistake_class).toBe("one_coin_off");
    expect(j(["zl5"]).mistake_class).toBe("too_much");
    expect(j(["gr10"]).mistake_class).toBe("too_little");
    const four: PlaceKey = { surface: "coins", amount_gr: 400, fewest: true };
    expect(j(["gr2", "gr2"], four, { ...data, bank: ["gr2", "zl1", "zl2"] }).mistake_class).toBe(
      "zloty_grosze_mixed",
    );
    expect(j(["zl1", "zl1", "zl1", "zl1"], four).mistake_class).toBe("not_fewest");
    expect(j(["zl2", "zl2"], four).correct).toBe(true);
    expect(judgePlace(key, { items: [] }, data).correct).toBe(false);
    expect(judgePlace(key, { items: ["zl7"] }, data).mistake_class).toBe("other_wrong");
  });
  it("shows the fewest coins as the solution", () => {
    expect(placeSolution(key, data)).toEqual({ items: ["zl2", "zl1", "gr50"] });
  });
});

describe("an amount past any a child counts", () => {
  it("is other_wrong and never throws, nor does its solution", () => {
    const huge: PlaceKey = { surface: "coins", amount_gr: 5_000_000_000, fewest: true };
    expect(judgePlace(huge, { items: ["zl5"] }, data).mistake_class).toBe("other_wrong");
    expect(placeSolution(huge, data)).toBeNull();
  });
});
