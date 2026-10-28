import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  compareRoutes,
  contractRoutes,
  terraformRoutes,
  terraformTokenRoutes,
} from "./check-infra-routes.ts";

const read = (path: string) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const contracts = read("packages/contracts/src/routes.ts");
const terraform = read("infra/terraform/main.tf");
const TF = "infra/terraform/main.tf";

const planted = `  claim: {
    method: "POST",
    path: "/api/v1/attempts/{id}/claim",
    params: z.object({ id: AttemptId }),
    auth: "token",
  },
} as const satisfies Record<string, Route>;`;

describe("check-infra-routes", () => {
  it("passes on the repo as it is, with the token routes guarded", () => {
    expect(contractRoutes(contracts)).toContainEqual({ key: "GET /api/health", auth: "none" });
    expect(contractRoutes(contracts)).toContainEqual({ key: "GET /api/v1/me", auth: "token" });
    expect(terraformTokenRoutes(terraform)).toContain("GET /api/v1/me");
    expect(compareRoutes(contracts, terraform)).toEqual([]);
  });

  it("fails on a route added to ROUTES with no Terraform route", () => {
    const added = contracts.replace("} as const satisfies Record<string, Route>;", planted);
    expect(compareRoutes(added, terraform)).toEqual([
      `"POST /api/v1/attempts/{id}/claim" is in ROUTES but has no route in ${TF}`,
    ]);
  });

  it("fails on a Terraform route that ROUTES does not have", () => {
    const extra = terraform.replace(
      '"GET /api/health",',
      '"GET /api/health",\n    "GET /api/v1/gone",',
    );
    expect(compareRoutes(contracts, extra)).toEqual([
      `"GET /api/v1/gone" is routed in ${TF} but is not in ROUTES`,
    ]);
  });

  it("fails on a token route routed without the authorizer", () => {
    const open = terraform
      .replace('    "GET /api/v1/me",\n', "")
      .replace('"GET /api/health",', '"GET /api/health",\n    "GET /api/v1/me",');
    expect(compareRoutes(contracts, open)).toEqual([
      `"GET /api/v1/me" has auth "token" in ROUTES but is not in token_routes in ${TF}`,
    ]);
  });

  it("fails on a login-free route behind the authorizer", () => {
    const shut = terraform
      .replace('    "GET /api/health",\n', "")
      .replace("token_routes = [", 'token_routes = [\n    "GET /api/health",');
    expect(compareRoutes(contracts, shut)).toEqual([
      `"GET /api/health" is in token_routes in ${TF} but has auth "none" in ROUTES`,
    ]);
  });

  it("reads no route key out of a comment", () => {
    expect(terraformRoutes('# "GET /api/old" was here\nroutes = ["GET /api/health"]')).toEqual([
      "GET /api/health",
    ]);
  });
});
