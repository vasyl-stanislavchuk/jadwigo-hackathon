import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { compareRoutes, contractRoutes, terraformRoutes } from "./check-infra-routes.ts";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const contracts = read("packages/contracts/src/routes.ts");
const terraform = read("infra/terraform/main.tf");

const planted = `  claim: {
    method: "POST",
    path: "/api/v1/attempts/{id}/claim",
    params: z.object({ id: AttemptId }),
  },
} as const satisfies Record<string, Route>;`;

describe("check-infra-routes", () => {
  it("passes on the repo as it is", () => {
    expect(contractRoutes(contracts)).toContain("GET /api/health");
    expect(compareRoutes(contracts, terraform)).toEqual({ problems: [], warnings: [] });
  });

  it("fails on a route added to ROUTES with no Terraform route", () => {
    const added = contracts.replace("} as const satisfies Record<string, Route>;", planted);
    expect(compareRoutes(added, terraform).problems).toEqual([
      '"POST /api/v1/attempts/{id}/claim" is in ROUTES but has no route in infra/terraform/main.tf',
    ]);
  });

  it("only warns on a Terraform route that ROUTES does not have", () => {
    const extra = terraform.replace(
      '"GET /api/health",',
      '"GET /api/health",\n    "GET /api/v1/gone",',
    );
    expect(compareRoutes(contracts, extra)).toEqual({
      problems: [],
      warnings: ['"GET /api/v1/gone" is routed in infra/terraform/main.tf but is not in ROUTES'],
    });
  });

  it("reads no route key out of a comment", () => {
    expect(terraformRoutes('# "GET /api/old" was here\nroutes = ["GET /api/health"]')).toEqual([
      "GET /api/health",
    ]);
  });
});
