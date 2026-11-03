// The list's URL codec (dl-uukj.47.67 S15): filters, sort and page round-trip, unknown values drop.
import { describe, expect, it } from "vitest";
import {
  type ListQuery,
  type ListQuerySchema,
  readListQuery,
  writeListQuery,
} from "./list-query.ts";

const schema: ListQuerySchema = {
  filters: { dziecko: ["marta", "ola", "kuba"], status: ["szkic", "zrobiona"] },
  sorts: ["lekcja", "ostatnio"],
  defaultSort: { id: "ostatnio", desc: true },
};

describe("the list query", () => {
  it("round-trips filters, sort and page", () => {
    const query: ListQuery = {
      filters: { dziecko: ["marta", "ola"], status: ["zrobiona"] },
      sort: { id: "lekcja", desc: false },
      page: 3,
    };
    const params = writeListQuery(query, schema);
    expect(params.toString()).toBe("dziecko=marta%2Cola&status=zrobiona&sort=lekcja&strona=3");
    expect(readListQuery(params.toString(), schema)).toEqual(query);
  });

  it("keeps a bare URL bare: the default sort and page 1 are left out", () => {
    const fresh = readListQuery("", schema);
    expect(fresh).toEqual({ filters: {}, sort: { id: "ostatnio", desc: true }, page: 1 });
    expect(writeListQuery(fresh, schema).toString()).toBe("");
  });

  it("writes a sort turned off as an empty param, and reads it back as off", () => {
    const off: ListQuery = { filters: {}, sort: null, page: 1 };
    const params = writeListQuery(off, schema);
    expect(params.toString()).toBe("sort=");
    expect(readListQuery(params, schema).sort).toBeNull();
  });

  it("drops values, sorts and pages it doesn't know", () => {
    expect(
      readListQuery("dziecko=marta,zenek,marta&status=&sort=-wynik&strona=-2&inne=1", schema),
    ).toEqual({ filters: { dziecko: ["marta"] }, sort: { id: "ostatnio", desc: true }, page: 1 });
    expect(readListQuery("strona=1.5", schema).page).toBe(1);
  });

  it("keeps the page's other params", () => {
    const params = writeListQuery(
      { filters: {}, sort: { id: "ostatnio", desc: false }, page: 1 },
      schema,
      "lekcja=abc&strona=4",
    );
    expect(params.toString()).toBe("lekcja=abc&sort=ostatnio");
  });
});
