import { describe, expect, it } from "vitest";
import { featuredAssignment } from "./featured.ts";
import { playPath, playRoute } from "./route.ts";

describe("playRoute", () => {
  it("reads the assignment from /play/<id>", () => {
    const id = featuredAssignment();
    expect(playRoute(playPath(id))).toEqual({ assignmentId: id });
    expect(playRoute(`${playPath(id)}/`)).toEqual({ assignmentId: id });
  });

  it("names no lesson for a malformed id, and is null off the player's paths", () => {
    expect(playRoute("/play/not-an-id")).toEqual({ assignmentId: null });
    expect(playRoute("/")).toBeNull();
    expect(playRoute("/playground")).toBeNull();
  });
});

describe("featuredAssignment", () => {
  // The id packages/lesson-import's featuredAssignmentId("equal-groups") gives, and the seed
  // prints ("featured asg_0ectzj2evqb95a3v1v6wewjzy3"). It is written out because that function
  // needs node:crypto.
  it("is equal-groups' featured assignment", () => {
    expect(featuredAssignment()).toBe("asg_0ectzj2evqb95a3v1v6wewjzy3");
  });
});
