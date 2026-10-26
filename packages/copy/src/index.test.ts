import { describe, expect, it } from "vitest";
import { LOCALES, messageKeys, t } from "./index.ts";

describe("copy", () => {
  it("has the same keys in every locale", () => {
    for (const locale of LOCALES) expect(messageKeys(locale)).toEqual(messageKeys("pl"));
    expect(t("pl", "start")).toBe("Zaczynamy!");
  });
});
