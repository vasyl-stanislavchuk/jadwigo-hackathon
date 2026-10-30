import { readFileSync } from "node:fs";
import { ROUTE_TAGS, ROUTES } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { apiBase } from "../index.ts";
import {
  OPERATION_ORDER,
  type OpenApiDocument,
  operationCount,
  REFERENCE_TAG_ORDER,
  servedDocument,
  TAG_TITLES,
} from "./openapi.ts";

const snapshot = JSON.parse(
  readFileSync(new URL("../../../../packages/contracts/openapi.json", import.meta.url), "utf8"),
) as OpenApiDocument;

describe("servedDocument", () => {
  const served = servedDocument(snapshot, apiBase);

  it("names the app's host as the one server", () => {
    expect(served.servers).toEqual([{ url: "https://app.jadwigo.pl" }]);
  });

  it("describes every tag, in the order the first call meets them", () => {
    expect(served.tags?.map((tag) => tag.name)).toEqual(
      REFERENCE_TAG_ORDER.map((tag) => TAG_TITLES[tag]),
    );
    expect([...REFERENCE_TAG_ORDER].sort()).toEqual([...ROUTE_TAGS].sort());
    for (const tag of served.tags ?? []) expect(tag.description).toMatch(/\.$/);
  });

  it("keeps every operation of the snapshot", () => {
    expect(operationCount(served)).toBe(Object.keys(ROUTES).length);
    expect(Object.keys(served.paths).sort()).toEqual(Object.keys(snapshot.paths).sort());
  });

  const operations = Object.values(served.paths).flatMap((item) =>
    Object.values(item).filter(
      (
        value,
      ): value is { operationId: string; summary: string; description: string; tags: string[] } =>
        typeof value === "object" && value !== null && "operationId" in value,
    ),
  );

  it("orders every route once, and lists them in that order", () => {
    expect([...OPERATION_ORDER].sort()).toEqual(Object.keys(ROUTES).sort());
    const listed = operations.map((operation) =>
      OPERATION_ORDER.indexOf(operation.operationId as never),
    );
    const firstOfEachPath = Object.values(served.paths).map((item) =>
      Math.min(
        ...Object.values(item)
          .filter((value) => typeof value === "object" && value !== null && "operationId" in value)
          .map((value) => OPERATION_ORDER.indexOf((value as { operationId: never }).operationId)),
      ),
    );
    expect(firstOfEachPath).toEqual([...firstOfEachPath].sort((a, b) => a - b));
    expect(listed).not.toContain(-1);
  });

  it("titles every operation briefly and keeps the route's sentence in its description", () => {
    for (const operation of operations) {
      const route = ROUTES[operation.operationId as keyof typeof ROUTES];
      expect(operation.summary).toMatch(/^[A-Z][^.]*[^.]$/);
      expect(operation.description.startsWith(route.summary)).toBe(true);
      expect(Object.values(TAG_TITLES)).toContain(operation.tags[0]);
    }
  });

  it("leaves the snapshot it was given as it was", () => {
    const before = structuredClone(snapshot);
    servedDocument(snapshot, apiBase);
    expect(snapshot).toEqual(before);
  });
});
