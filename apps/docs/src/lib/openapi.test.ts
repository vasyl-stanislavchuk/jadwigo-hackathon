import { readFileSync } from "node:fs";
import { ROUTE_TAGS, ROUTES } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { apiBase } from "../index.ts";
import { type OpenApiDocument, operationCount, servedDocument } from "./openapi.ts";

const snapshot = JSON.parse(
  readFileSync(new URL("../../../../packages/contracts/openapi.json", import.meta.url), "utf8"),
) as OpenApiDocument;

describe("servedDocument", () => {
  const served = servedDocument(snapshot, apiBase);

  it("names the app's host as the one server", () => {
    expect(served.servers).toEqual([{ url: "https://app.jadwigo.pl" }]);
  });

  it("describes every tag, in ROUTE_TAGS order", () => {
    expect(served.tags?.map((tag) => tag.name)).toEqual([...ROUTE_TAGS]);
    for (const tag of served.tags ?? []) expect(tag.description).toMatch(/\.$/);
  });

  it("keeps every operation of the snapshot", () => {
    expect(operationCount(served)).toBe(Object.keys(ROUTES).length);
    expect(served.paths).toBe(snapshot.paths);
  });
});
