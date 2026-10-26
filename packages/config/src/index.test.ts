import { describe, expect, it } from "vitest";
import { ENVIRONMENTS, hosts } from "./index.ts";

describe("hosts", () => {
  it("names a site and an app host for every environment", () => {
    for (const env of ENVIRONMENTS) expect(hosts[env].app.endsWith(hosts[env].site)).toBe(true);
  });
});
