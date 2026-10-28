import { AssignmentId } from "@jadwigo/contracts";
import { describe, expect, it } from "vitest";
import { claimOf, parentPath } from "./route.ts";

const ASSIGNMENT = AssignmentId.parse("asg_0ectzj2evqb95a3v1v6wewjzy3");

describe("parentPath", () => {
  it("names the assignment to keep and the language, never an attempt", () => {
    expect(parentPath()).toBe("/parent");
    expect(parentPath({ claim: ASSIGNMENT, lang: "pl" })).toBe(
      `/parent?claim=${ASSIGNMENT}&lang=pl`,
    );
  });
});

describe("claimOf", () => {
  it("reads ?claim, and is null for a missing or malformed one", () => {
    expect(claimOf(new URLSearchParams(`claim=${ASSIGNMENT}`))).toBe(ASSIGNMENT);
    expect(claimOf(new URLSearchParams())).toBeNull();
    expect(claimOf(new URLSearchParams("claim=att_nope"))).toBeNull();
  });
});
