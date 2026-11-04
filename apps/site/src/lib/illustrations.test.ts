// The card pictures by lesson id (dl-w0b4.137): each Polish-only grade-3 lesson has its own picture,
// a pl/en pair still shares one, and a lesson with none keeps the grey slot.
import type { FeaturedLesson } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { cardArt } from "./illustrations.ts";

const lesson = (lesson_id: string) => ({ lesson_id }) as FeaturedLesson;

describe("cardArt", () => {
  it("gives each grade-3 Polish lesson its own picture", () => {
    expect(cardArt(lesson("les_023x6dyc9dbb79g206p9pd6j7c"))?.alt).toBe("pl3_czytanie");
    expect(cardArt(lesson("les_7h3fzt6v0yb6sr0r6ks039kptj"))?.alt).toBe("pl3_gloski");
    expect(cardArt(lesson("les_35dzxscf7hbagsbt3kfdfmm40z"))?.alt).toBe("pl3_czesci_mowy");
    expect(cardArt(lesson("les_6hqetrmeg0bqktxa1vqh53c5d0"))?.alt).toBe("pl3_zdanie");
    expect(cardArt(lesson("les_4tgxbakxsha3rb1httn8rsm4p8"))?.alt).toBe("pl3_ortografia");
  });

  it("keeps a pl/en pair on one picture, and gives an unknown lesson none", () => {
    const pl = cardArt(lesson("les_40jwhmppkbb5vvag7rc27xrn1x"));
    expect(pl?.alt).toBe("cukier");
    expect(cardArt(lesson("les_0pdpkegvywbn1vvqzeyhcwvxsm"))).toEqual(pl);
    expect(cardArt(lesson("les_2gj7s52rxqa5a9nkemj9dxbmpz"))).toBeUndefined();
  });
});
