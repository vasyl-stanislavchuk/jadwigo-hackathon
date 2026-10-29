import { describe, expect, it } from "vitest";
import { openApiDocument } from "./openapi.ts";
import { ROUTE_TAGS, ROUTES } from "./routes.ts";

/**
 * The OpenAPI document is a snapshot like schemas/: a change to a route or a wire shape fails here
 * until `openapi.json` is updated on purpose (vitest -u) and reviewed in the PR (dl-5ssh.90.5).
 */
const doc = openApiDocument(ROUTES) as {
  tags: { name: string }[];
  paths: Record<string, Record<string, Operation>>;
};
type Operation = {
  operationId: string;
  summary: string;
  tags: string[];
  security: Record<string, string[]>[];
  responses: Record<string, { $ref?: string }>;
};
const operations = Object.entries(doc.paths).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, op]) => ({ path, method, op })),
);
const ERROR = "#/components/responses/Error";

describe("openapi.json", () => {
  it("matches the snapshot", async () => {
    await expect(`${JSON.stringify(doc, null, 2)}\n`).toMatchFileSnapshot("../openapi.json");
  });

  it("has one operation per route, named by its key", () => {
    expect(operations.map(({ op }) => op.operationId).sort()).toEqual(Object.keys(ROUTES).sort());
  });

  it("puts every path under /api/", () => {
    for (const path of Object.keys(doc.paths)) expect(path).toMatch(/^\/api\//);
  });

  it("names security from the route's auth, and the bank's token on the bank route", () => {
    for (const { op } of operations) {
      const route = ROUTES[op.operationId as keyof typeof ROUTES];
      const schemes = op.security.flatMap(Object.keys);
      if (route.auth === "token") expect(schemes).toEqual(["bearerAuth"]);
      else if (route.tag === "bank") expect(schemes).toEqual(["bankToken"]);
      else expect(op.security).toEqual([]);
      expect("401" in op.responses).toBe(schemes.length > 0);
    }
  });

  it("keeps every bank route off the Supabase token, so bankToken is never the wrong scheme", () => {
    for (const route of Object.values(ROUTES))
      if (route.tag === "bank") expect(route.auth).toBe("none");
  });

  it("answers every error with the one Error response", () => {
    for (const { op } of operations) {
      const errors = Object.entries(op.responses).filter(([status]) => !/^2\d\d$/.test(status));
      expect(errors.map(([status]) => status)).toEqual(expect.arrayContaining(["4XX", "5XX"]));
      for (const [, response] of errors) expect(response).toEqual({ $ref: ERROR });
    }
  });

  it("gives every operation a summary and one tag from ROUTE_TAGS, in their order", () => {
    for (const { op } of operations) {
      expect(op.summary.trim()).not.toBe("");
      expect(op.tags).toHaveLength(1);
      expect(ROUTE_TAGS).toContain(op.tags[0]);
    }
    expect(doc.tags.map(({ name }) => name)).toEqual([...ROUTE_TAGS]);
  });

  it("names no servers: the docs app adds them", () => {
    expect(doc).not.toHaveProperty("servers");
  });
});
