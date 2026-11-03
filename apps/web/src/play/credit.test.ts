import type { PageCredit } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { creditShown } from "./credit.ts";

/** A made-up Khan Academy item written in English. */
const KHAN: PageCredit = {
  source: "khan",
  ref: "xmadeup0001",
  licence: "cc-by-nc-sa-4.0",
  original_lang: "en",
  adapted: false,
};

describe("creditShown", () => {
  it("shows a Khan item translated into Polish with Khan's notice and the Polish deed", () => {
    expect(creditShown(KHAN, "pl")).toEqual({
      source: "Khan Academy",
      licence: "CC BY-NC-SA 4.0",
      deedUrl: "https://creativecommons.org/licenses/by-nc-sa/4.0/deed.pl",
      line: "translated",
      notice: "Wszystkie materiały Khan Academy są dostępne za darmo na www.khanacademy.org",
      noticeLink: "www.khanacademy.org",
      home: "https://www.khanacademy.org",
      notAffiliated: true,
    });
  });

  it("picks the licence line from the language and the lesson's changes", () => {
    expect(creditShown(KHAN, "en")?.line).toBe("shared");
    expect(creditShown({ ...KHAN, adapted: true }, "en")?.line).toBe("adapted");
    expect(creditShown({ ...KHAN, adapted: true }, "pl")?.line).toBe("both");
  });

  it("shows nothing for our own questions, or a source or licence it does not know", () => {
    expect(creditShown(null, "pl")).toBeNull();
    expect(creditShown({ ...KHAN, source: "elsewhere" }, "pl")).toBeNull();
    expect(creditShown({ ...KHAN, licence: "cc-by-nd-4.0" }, "pl")).toBeNull();
  });

  it("shows nothing for a source or licence named like an Object.prototype key, and never throws", () => {
    for (const key of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      expect(creditShown({ ...KHAN, source: key }, "pl")).toBeNull();
      expect(creditShown({ ...KHAN, licence: key }, "pl")).toBeNull();
    }
  });
});
