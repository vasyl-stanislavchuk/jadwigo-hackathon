import { describe, expect, it } from "vitest";
import { isLocalDatabase } from "./e3-load.ts";

describe("E3's local-database guard", () => {
  it("takes a local jadwigo database and refuses everything else", () => {
    expect(isLocalDatabase("postgresql://localhost:5433/jadwigo")).toBe(true);
    expect(isLocalDatabase("postgresql://127.0.0.1:5433/jadwigo_test")).toBe(true);
    expect(isLocalDatabase("postgresql://db.example.com:5432/jadwigo")).toBe(false);
    expect(isLocalDatabase("postgresql://localhost:5433/other")).toBe(false);
    expect(isLocalDatabase("postgresql://localhost:5433/jadwigo?sslmode=require")).toBe(false);
    expect(isLocalDatabase(undefined)).toBe(false);
  });
});
