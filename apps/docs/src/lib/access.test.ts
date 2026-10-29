import { ROUTES } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { credentialOf, routesTaking } from "./access.ts";

describe("routesTaking", () => {
  it("puts every route under exactly one credential", () => {
    const total =
      routesTaking("open").length + routesTaking("supabase").length + routesTaking("bank").length;
    expect(total).toBe(Object.keys(ROUTES).length);
  });

  it("names the question search as the one bank route", () => {
    expect(routesTaking("bank").map((row) => row.path)).toEqual([ROUTES.questionSearches.path]);
  });

  it("asks a Supabase token of every token route", () => {
    expect(credentialOf(ROUTES.getMe)).toBe("supabase");
    expect(credentialOf(ROUTES.startAttempt)).toBe("open");
  });
});
